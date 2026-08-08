import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

import { planById } from "@/lib/plans";
import { cycleWindow } from "@/lib/subscription";

function verifyStripeSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k, rest.join("=")];
    }),
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(parts.t));
  if (!Number.isFinite(age) || age > 60 * 5) return false;

  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(parts.v1, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!webhookSecret) {
          console.error("[billing/webhook] STRIPE_WEBHOOK_SECRET is not set — refusing unsigned events");
          return Response.json({ error: "Webhook not configured" }, { status: 503 });
        }
        const ok = verifyStripeSignature(
          rawBody,
          request.headers.get("stripe-signature"),
          webhookSecret,
        );
        if (!ok) {
          return Response.json({ error: "Invalid signature" }, { status: 400 });
        }

        let event: {
          type?: string;
          data?: {
            object?: {
              id?: string;
              customer?: string | null;
              subscription?: string | null;
              metadata?: { company_id?: string; plan?: string };
              client_reference_id?: string | null;
            };
          };
        };
        try {
          event = JSON.parse(rawBody) as typeof event;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data?.object;
          const companyId = session?.metadata?.company_id || session?.client_reference_id;
          const planId = session?.metadata?.plan || "company";
          if (!companyId) {
            return Response.json({ error: "Missing company_id" }, { status: 400 });
          }

          const plan = planById(planId === "scale" ? "enterprise" : planId);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: existing } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("company_id", companyId)
            .maybeSingle();

          const patch = {
            plan: plan.id,
            status: "active",
            tokens_per_cycle: plan.tokens,
            tokens_remaining: plan.tokens,
            payment_mode: "stripe",
            stripe_customer_id: typeof session?.customer === "string" ? session.customer : null,
            stripe_subscription_id:
              typeof session?.subscription === "string" ? session.subscription : null,
            ...cycleWindow(),
          };

          if (existing) {
            await supabaseAdmin.from("subscriptions").update(patch).eq("id", existing.id);
          } else {
            await supabaseAdmin.from("subscriptions").insert({
              company_id: companyId,
              ...patch,
            });
          }

          await supabaseAdmin.from("token_ledger").insert({
            company_id: companyId,
            kind: "grant",
            amount: plan.tokens,
            reason: `Stripe checkout · ${plan.name}`,
          });
        }

        return Response.json({ received: true });
      },
    },
  },
});
