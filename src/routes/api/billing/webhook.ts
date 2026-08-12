import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

import { funnelPlanById, isFunnelPlanId } from "@/lib/funnel-plans";
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
          console.error(
            "[billing/webhook] STRIPE_WEBHOOK_SECRET is not set — refusing unsigned events",
          );
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
          account?: string;
          data?: {
            object?: {
              id?: string;
              customer?: string | null;
              customer_email?: string | null;
              subscription?: string | null;
              metadata?: {
                company_id?: string;
                plan?: string;
                kind?: string;
                site_id?: string;
                customer_email?: string;
                product_id?: string;
                user_id?: string;
                invite_code?: string;
                boost_grant?: string;
                kickoff?: string;
                stripe_account?: string;
              };
              client_reference_id?: string | null;
              payment_intent?: string | null;
              amount_total?: number | null;
              object?: string;
              configuration?: {
                merchant?: {
                  capabilities?: {
                    card_payments?: { status?: string };
                    stripe_balance?: { payouts?: { status?: string } };
                  };
                };
              };
              requirements?: {
                summary?: { minimum_deadline?: { status?: string } };
                entries?: { await_reason?: string; description?: string }[];
              };
            };
          };
        };
        try {
          event = JSON.parse(rawBody) as typeof event;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // Connect Accounts v2 (and classic account.updated) — refresh readiness flags.
        if (
          event.type === "account.updated" ||
          event.type === "v2.core.account.updated" ||
          event.type?.startsWith("v2.core.account")
        ) {
          const accountId = event.data?.object?.id || event.account;
          if (accountId) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { mapAccountToFlags, retrieveConnectAccount } =
              await import("@/lib/stripe-connect.server");
            try {
              const live = await retrieveConnectAccount(accountId);
              const flags = mapAccountToFlags(live);
              await supabaseAdmin
                .from("company_stripe_accounts")
                .update({
                  charges_ready: flags.chargesReady,
                  payouts_ready: flags.payoutsReady,
                  details_submitted: flags.detailsSubmitted,
                  requirements_due: flags.requirementsDue,
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_account_id", accountId);
            } catch (err) {
              console.error(
                "[billing/webhook] connect account refresh",
                err instanceof Error ? err.message : err,
              );
            }
          }
          return Response.json({ received: true });
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data?.object;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          if (session?.metadata?.kind === "site_product") {
            const siteId = session.metadata.site_id || session.client_reference_id;
            const email = (session.metadata.customer_email || session.customer_email || "")
              .trim()
              .toLowerCase();
            if (!siteId || !email) {
              return Response.json({ error: "Missing site_id or email" }, { status: 400 });
            }
            await supabaseAdmin.from("site_subscribers").upsert(
              {
                site_id: siteId,
                email,
                status: "active",
                stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
                stripe_subscription_id:
                  typeof session.subscription === "string" ? session.subscription : null,
              },
              { onConflict: "site_id,email" },
            );
            return Response.json({ received: true });
          }

          if (session?.metadata?.kind === "founding_seat") {
            const userId = session.metadata.user_id || session.client_reference_id;
            if (!userId || !session.id) {
              return Response.json({ error: "Missing user_id or session id" }, { status: 400 });
            }
            const inviteCode = session.metadata.invite_code?.trim() || undefined;
            const { error: grantError } = await supabaseAdmin.rpc("grant_founding_seat", {
              _user_id: userId,
              _stripe_session_id: session.id,
              ...(inviteCode ? { _invite_code: inviteCode } : {}),
              _amount_cents: session.amount_total ?? 9900,
              ...(typeof session.payment_intent === "string"
                ? { _payment_intent: session.payment_intent }
                : {}),
            });
            if (grantError) {
              console.error("[billing/webhook] grant_founding_seat", grantError.message);
              return Response.json({ error: grantError.message }, { status: 500 });
            }
            return Response.json({ received: true });
          }

          if (session?.metadata?.kind === "genesis_nft") {
            const userId = session.metadata.user_id || session.client_reference_id;
            if (!userId || !session.id) {
              return Response.json({ error: "Missing user_id or session id" }, { status: 400 });
            }
            const { markGenesisPaidFromStripe } = await import("@/lib/genesis.functions");
            await markGenesisPaidFromStripe({
              userId,
              sessionId: session.id,
              ...(session.amount_total != null ? { amountCents: session.amount_total } : {}),
            });
            return Response.json({ received: true });
          }

          if (session?.metadata?.kind === "local_seat") {
            const companyId = session.metadata.company_id || session.client_reference_id;
            if (!companyId) {
              return Response.json({ error: "Missing company_id" }, { status: 400 });
            }
            const { LOCAL_SEAT_BOOST_GRANT } = await import("@/lib/boost-packs");
            const grant = LOCAL_SEAT_BOOST_GRANT;
            const { error } = await supabaseAdmin.rpc("mark_local_seat_paid_stripe", {
              _company_id: companyId,
              _boost_grant: grant,
            });
            if (error) {
              console.error("[billing/webhook] mark_local_seat_paid_stripe", error.message);
              return Response.json({ error: error.message }, { status: 500 });
            }
            return Response.json({ received: true });
          }

          if (session?.metadata?.kind === "aura_reputation") {
            const companyId = session.metadata.company_id || session.client_reference_id;
            if (!companyId || !session.id) {
              return Response.json({ error: "Missing company_id or session id" }, { status: 400 });
            }
            const { AURA_REPUTATION_BOOST_GRANT, AURA_REPUTATION_PLAN_ID } =
              await import("@/lib/boost-packs");
            const { cycleWindow } = await import("@/lib/subscription");
            const grant = AURA_REPUTATION_BOOST_GRANT;
            const { error: seatErr } = await supabaseAdmin.rpc("mark_local_seat_paid_stripe", {
              _company_id: companyId,
              _boost_grant: grant,
            });
            if (seatErr) {
              console.error("[billing/webhook] aura_reputation seat", seatErr.message);
              return Response.json({ error: seatErr.message }, { status: 500 });
            }

            const { data: existing } = await supabaseAdmin
              .from("subscriptions")
              .select("id")
              .eq("company_id", companyId)
              .maybeSingle();
            const patch = {
              plan: AURA_REPUTATION_PLAN_ID,
              status: "active",
              tokens_per_cycle: grant,
              tokens_remaining: grant,
              payment_mode: "stripe",
              stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
              stripe_subscription_id:
                typeof session.subscription === "string" ? session.subscription : null,
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
            return Response.json({ received: true });
          }

          if (session?.metadata?.kind === "boost_pack") {
            const companyId = session.metadata.company_id || session.client_reference_id;
            const planId = session.metadata.plan || "";
            if (!companyId || !session.id) {
              return Response.json({ error: "Missing company_id or session id" }, { status: 400 });
            }
            const { boostPackById, isBoostPackId } = await import("@/lib/boost-packs");
            const { applyBoostPackKickoff } = await import("@/lib/local-seat.functions");
            const pack = isBoostPackId(planId) ? boostPackById(planId) : undefined;
            // Trust catalog amount over client-supplied Stripe metadata.
            const grant = pack?.boostGrant || Number(session.metadata.boost_grant) || 0;
            const reason = `Boost-Paket · ${pack?.name ?? planId} · ${session.id}`;
            const { data: priorGrant } = await supabaseAdmin
              .from("token_ledger")
              .select("id")
              .eq("company_id", companyId)
              .eq("reason", reason)
              .maybeSingle();
            if (priorGrant?.id) {
              return Response.json({ received: true, duplicate: true });
            }
            if (grant > 0) {
              const { error } = await supabaseAdmin.rpc("grant_local_boost", {
                _company_id: companyId,
                _amount: grant,
                _reason: reason,
              });
              if (error) {
                console.error("[billing/webhook] grant_local_boost", error.message);
                return Response.json({ error: error.message }, { status: 500 });
              }
            }
            if (pack && isBoostPackId(pack.id)) {
              const { data: company } = await supabaseAdmin
                .from("companies")
                .select("name")
                .eq("id", companyId)
                .maybeSingle();
              await applyBoostPackKickoff(
                supabaseAdmin as never,
                companyId,
                pack.id,
                (company?.name as string) || "Betrieb",
              );
            }
            return Response.json({ received: true });
          }

          const companyId = session?.metadata?.company_id || session?.client_reference_id;
          const planId = session?.metadata?.plan || "company";
          if (!companyId) {
            return Response.json({ error: "Missing company_id" }, { status: 400 });
          }

          const funnelPlan = isFunnelPlanId(planId) ? funnelPlanById(planId) : undefined;
          const auraPlan = funnelPlan ? null : planById(planId === "scale" ? "enterprise" : planId);
          const tokens = funnelPlan?.tokenGrant ?? auraPlan?.tokens ?? 0;
          const planLabel = funnelPlan?.name ?? auraPlan?.name ?? planId;
          const storedPlan = funnelPlan?.id ?? auraPlan?.id ?? planId;

          const sessionId = session?.id;
          if (!sessionId) {
            return Response.json({ error: "Missing session id" }, { status: 400 });
          }
          const grantReason = `Stripe checkout · ${planLabel} · ${sessionId}`;
          const { data: priorGrant } = await supabaseAdmin
            .from("token_ledger")
            .select("id")
            .eq("company_id", companyId)
            .eq("reason", grantReason)
            .maybeSingle();
          if (priorGrant?.id) {
            return Response.json({ received: true, duplicate: true });
          }

          const { data: existing } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("company_id", companyId)
            .maybeSingle();

          const patch = {
            plan: storedPlan,
            status: "active",
            tokens_per_cycle: tokens,
            tokens_remaining: tokens,
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
            amount: tokens,
            reason: grantReason,
          });
        }

        return Response.json({ received: true });
      },
    },
  },
});
