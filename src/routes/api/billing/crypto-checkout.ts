import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { LOCAL_SEAT_EUR } from "@/lib/boost-packs";
import {
  createNowPaymentsInvoice,
  nowPaymentsConfigured,
  parseCryptoAsset,
} from "@/lib/local-crypto-seat";

function accessTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

export const Route = createFileRoute("/api/billing/crypto-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!nowPaymentsConfigured()) {
          return Response.json(
            {
              error:
                "Crypto-Checkout noch nicht konfiguriert (NOWPAYMENTS_API_KEY). Bar oder Karte nutzen.",
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

        const body = (await request.json().catch(() => ({}))) as {
          company_id?: string;
          asset?: string;
        };
        const asset = parseCryptoAsset(body.asset);
        if (!asset) {
          return Response.json({ error: "asset must be usdc | eth | btc | sol" }, { status: 400 });
        }
        const companyId = String(body.company_id || "").trim();
        if (!companyId) {
          return Response.json({ error: "company_id required" }, { status: 400 });
        }

        const admin = createClient<Database>(supabaseUrl, service, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: company } = await admin
          .from("companies")
          .select("id, owner_id, local_seat_paid_at, name")
          .eq("id", companyId)
          .maybeSingle();
        if (!company || company.owner_id !== user.id) {
          return Response.json({ error: "Company not found" }, { status: 404 });
        }
        if (company.local_seat_paid_at) {
          return Response.json({ error: "Seat already unlocked", already: true }, { status: 409 });
        }

        const { data: checkout, error: insErr } = await admin
          .from("local_crypto_checkouts")
          .insert({
            company_id: companyId,
            created_by: user.id,
            asset,
            amount_eur: LOCAL_SEAT_EUR,
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
          const invoice = await createNowPaymentsInvoice({
            checkoutId: checkout.id,
            companyId,
            asset,
            amountEur: LOCAL_SEAT_EUR,
          });

          await admin
            .from("local_crypto_checkouts")
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
            amount_eur: LOCAL_SEAT_EUR,
          });
        } catch (e) {
          await admin
            .from("local_crypto_checkouts")
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
