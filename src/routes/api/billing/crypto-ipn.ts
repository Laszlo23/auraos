import { createFileRoute } from "@tanstack/react-router";

import {
  fulfillLocalSeatCrypto,
  isPaidNowStatus,
  verifyNowPaymentsIpn,
} from "@/lib/local-crypto-seat";

/**
 * NOWPayments IPN callback for Local Seat crypto (USDC / ETH / BTC / SOL).
 * Config: NOWPAYMENTS_API_KEY + NOWPAYMENTS_IPN_SECRET
 */
export const Route = createFileRoute("/api/billing/crypto-ipn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const sig =
          request.headers.get("x-nowpayments-sig") ?? request.headers.get("X-NOWPayments-Sig");

        if (!verifyNowPaymentsIpn(raw, sig)) {
          return Response.json({ error: "Invalid signature" }, { status: 401 });
        }

        let payload: {
          payment_status?: string;
          order_id?: string;
          payment_id?: string | number;
          pay_currency?: string;
        };
        try {
          payload = JSON.parse(raw) as typeof payload;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        if (!isPaidNowStatus(payload.payment_status)) {
          return Response.json({ received: true, status: payload.payment_status });
        }

        const checkoutId = String(payload.order_id || "").trim();
        if (!checkoutId) {
          return Response.json({ error: "Missing order_id" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: checkout } = await supabaseAdmin
          .from("local_crypto_checkouts")
          .select("id, company_id, asset, status")
          .eq("id", checkoutId)
          .maybeSingle();

        if (!checkout) {
          return Response.json({ error: "checkout_not_found" }, { status: 404 });
        }

        try {
          await fulfillLocalSeatCrypto({
            companyId: checkout.company_id as string,
            checkoutId: checkout.id as string,
            asset: (checkout.asset as string) || String(payload.pay_currency || "crypto"),
            providerPaymentId: payload.payment_id != null ? String(payload.payment_id) : null,
          });
          return Response.json({ received: true, paid: true });
        } catch (e) {
          console.error("[crypto-ipn]", e instanceof Error ? e.message : e);
          return Response.json(
            { error: e instanceof Error ? e.message : "fulfill_failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
