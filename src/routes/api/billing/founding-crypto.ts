import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { FOUNDING_SEAT_USD } from "@/lib/founding-price";
import {
  createFoundingSeatNowInvoice,
  nowPaymentsConfigured,
  parseCryptoAsset,
} from "@/lib/founding-crypto-seat";
import { clientIpFromRequest, rateLimitConsume } from "@/lib/rate-limit.server";

function accessTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

export const Route = createFileRoute("/api/billing/founding-crypto")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!nowPaymentsConfigured()) {
          return Response.json(
            {
              error:
                "Crypto checkout is not configured yet (NOWPAYMENTS_API_KEY). Use card, or try again later.",
            },
            { status: 503 },
          );
        }

        const token = accessTokenFromRequest(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
        const anon =
          process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        const service = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!supabaseUrl || !anon || !service) {
          return Response.json({ error: "Supabase is not configured" }, { status: 500 });
        }

        const userClient = createClient<Database>(supabaseUrl, anon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const {
          data: { user },
          error: userErr,
        } = await userClient.auth.getUser();
        if (userErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const limited = rateLimitConsume(
          `founding-crypto:${user.id}:${clientIpFromRequest(request)}`,
          {
            limit: 5,
            windowMs: 10 * 60_000,
          },
        );
        if (!limited.ok) {
          return Response.json(
            { error: "Too many checkout attempts. Try again shortly." },
            { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          invite?: string;
          asset?: string;
        };
        const asset = parseCryptoAsset(body.asset);
        if (!asset) {
          return Response.json({ error: "asset must be usdc | eth | btc | sol" }, { status: 400 });
        }

        const admin = createClient<Database>(supabaseUrl, service, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const db = admin as unknown as {
          from: (t: string) => any;
          rpc: (fn: string, args?: object) => any;
        };

        const { data: existingSeat } = await userClient
          .from("founding_seats")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (existingSeat) {
          return Response.json({ error: "You already hold a founding seat" }, { status: 400 });
        }

        const { data: remaining, error: remErr } = await userClient.rpc("founding_seats_remaining");
        if (remErr) {
          return Response.json({ error: remErr.message }, { status: 500 });
        }
        if ((remaining as number) <= 0) {
          return Response.json({ error: "Founding seats are sold out" }, { status: 409 });
        }

        let inviteMeta: string | null = null;
        const invite = (body.invite ?? "").trim().toUpperCase() || null;
        if (invite) {
          const { data: ok } = await userClient.rpc("check_invite_code", { _code: invite });
          if (ok) inviteMeta = invite;
        }

        const { data: checkout, error: insErr } = await db
          .from("founding_crypto_checkouts")
          .insert({
            user_id: user.id,
            invite_code: inviteMeta,
            asset,
            amount_usd: FOUNDING_SEAT_USD,
            status: "pending",
            provider: "nowpayments",
          })
          .select("id")
          .single();
        if (insErr || !checkout?.id) {
          return Response.json(
            { error: insErr?.message || "Could not create checkout" },
            { status: 500 },
          );
        }

        try {
          const invoice = await createFoundingSeatNowInvoice({
            checkoutId: checkout.id,
            userId: user.id,
            asset,
          });

          await db
            .from("founding_crypto_checkouts")
            .update({
              provider_invoice_id: String(invoice.id),
              invoice_url: invoice.invoice_url ?? null,
              pay_address: invoice.pay_address ?? null,
              pay_amount: invoice.pay_amount != null ? String(invoice.pay_amount) : null,
              pay_currency: invoice.pay_currency ?? null,
              status: "confirming",
              updated_at: new Date().toISOString(),
            })
            .eq("id", checkout.id);

          const url = invoice.invoice_url;
          if (!url) {
            return Response.json({ error: "Invoice URL missing" }, { status: 502 });
          }
          return Response.json({
            url,
            checkout_id: checkout.id,
            asset,
            amount_usd: FOUNDING_SEAT_USD,
          });
        } catch (e) {
          await db
            .from("founding_crypto_checkouts")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", checkout.id);
          return Response.json(
            { error: e instanceof Error ? e.message : "Crypto checkout failed" },
            { status: 502 },
          );
        }
      },
    },
  },
});
