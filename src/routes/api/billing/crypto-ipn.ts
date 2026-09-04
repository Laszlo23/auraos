import { createFileRoute } from "@tanstack/react-router";

import { fulfillFoundingSeatCrypto, nowIpnCoversFoundingSeat } from "@/lib/founding-crypto-seat";
import {
  fulfillLocalSeatCrypto,
  isPaidNowStatus,
  nowIpnCoversSeat,
  verifyNowPaymentsIpn,
  type NowIpnPayload,
} from "@/lib/local-crypto-seat";
import { isDonateOrderId } from "@/lib/nowpayments-donate";

/**
 * NOWPayments IPN callback for Local Seat, Founding Seat, and open donations.
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

        let payload: NowIpnPayload;
        try {
          payload = JSON.parse(raw) as NowIpnPayload;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        if (!isPaidNowStatus(payload.payment_status)) {
          return Response.json({ received: true, status: payload.payment_status ?? "unknown" });
        }

        const checkoutId = String(payload.order_id || "").trim();
        if (!checkoutId) {
          return Response.json({ error: "Missing order_id" }, { status: 400 });
        }

        /** Open donations — acknowledge finished IPN; no product fulfillment. */
        if (isDonateOrderId(checkoutId)) {
          console.info("[crypto-ipn] donation finished", {
            order_id: checkoutId,
            payment_id: payload.payment_id,
            outcome_amount: payload.outcome_amount,
            outcome_currency: payload.outcome_currency,
          });
          return Response.json({ received: true, paid: true, kind: "donation" });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as { from: (t: string) => any };

        const { data: founding } = await db
          .from("founding_crypto_checkouts")
          .select("id, user_id, asset, status")
          .eq("id", checkoutId)
          .maybeSingle();

        if (founding) {
          if (!nowIpnCoversFoundingSeat(payload)) {
            return Response.json(
              { error: "outcome_amount / outcome_currency did not cover the founding seat" },
              { status: 400 },
            );
          }
          try {
            await fulfillFoundingSeatCrypto({
              checkoutId: founding.id as string,
              userId: founding.user_id as string,
              asset: (founding.asset as string) || String(payload.pay_currency || "crypto"),
              providerPaymentId: payload.payment_id != null ? String(payload.payment_id) : null,
              outcomeAmount: payload.outcome_amount != null ? String(payload.outcome_amount) : null,
              outcomeCurrency:
                payload.outcome_currency != null ? String(payload.outcome_currency) : null,
            });
            return Response.json({ received: true, paid: true, kind: "founding" });
          } catch (e) {
            console.error("[crypto-ipn] founding", e instanceof Error ? e.message : e);
            return Response.json(
              { error: e instanceof Error ? e.message : "fulfill_failed" },
              { status: 500 },
            );
          }
        }

        if (!nowIpnCoversSeat(payload)) {
          return Response.json(
            { error: "outcome_amount / outcome_currency did not cover the seat" },
            { status: 400 },
          );
        }

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
            outcomeAmount: payload.outcome_amount != null ? String(payload.outcome_amount) : null,
            outcomeCurrency:
              payload.outcome_currency != null ? String(payload.outcome_currency) : null,
          });
          return Response.json({ received: true, paid: true, kind: "local" });
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
