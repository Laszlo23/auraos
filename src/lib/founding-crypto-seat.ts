import type { CryptoSeatAsset } from "@/lib/boost-packs";
import { FOUNDING_SEAT_CENTS, FOUNDING_SEAT_USD } from "@/lib/founding-price";
import {
  NOW_PAY_CURRENCY,
  nowIpnCoversAmount,
  nowPaymentsConfigured,
  parseCryptoAsset,
  type NowInvoice,
  type NowIpnPayload,
} from "@/lib/local-crypto-seat";
import { SITE_URL } from "@/lib/site";

const NOW_API = "https://api.nowpayments.io/v1";

export function nowIpnCoversFoundingSeat(payload: NowIpnPayload): boolean {
  return nowIpnCoversAmount(payload, FOUNDING_SEAT_USD, "usd");
}

function nowApiKey(): string {
  const key = process.env["NOWPAYMENTS_API_KEY"]?.trim();
  if (!key) throw new Error("NOWPAYMENTS_API_KEY missing");
  return key;
}

export async function createFoundingSeatNowInvoice(input: {
  checkoutId: string;
  userId: string;
  asset: CryptoSeatAsset;
}): Promise<NowInvoice> {
  const body = {
    price_amount: FOUNDING_SEAT_USD,
    price_currency: "usd",
    pay_currency: NOW_PAY_CURRENCY[input.asset],
    order_id: input.checkoutId,
    order_description: `Aura Founding Seat · ${input.userId.slice(0, 8)} · ${input.asset.toUpperCase()}`,
    ipn_callback_url: `${SITE_URL}/api/billing/crypto-ipn`,
    success_url: `${SITE_URL}/auth?seat=success`,
    cancel_url: `${SITE_URL}/access?seat=cancel`,
    is_fixed_rate: false,
  };

  const res = await fetch(`${NOW_API}/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": nowApiKey(),
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as NowInvoice & { message?: string };
  if (!res.ok) {
    throw new Error(json.message || `NOWPayments invoice failed (${res.status})`);
  }
  if (!json.id) throw new Error("NOWPayments invoice missing id");
  return json;
}

export async function fulfillFoundingSeatCrypto(input: {
  checkoutId: string;
  userId: string;
  asset: string;
  providerPaymentId?: string | null;
  outcomeAmount?: string | null;
  outcomeCurrency?: string | null;
}): Promise<{ ok: boolean; already?: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as {
    from: (t: string) => any;
    rpc: (fn: string, args: object) => any;
  };

  const { data: checkout } = await db
    .from("founding_crypto_checkouts")
    .select("id, status, user_id, invite_code")
    .eq("id", input.checkoutId)
    .maybeSingle();
  if (!checkout || checkout.user_id !== input.userId) {
    throw new Error("checkout_not_found");
  }
  if (checkout.status === "paid") return { ok: true, already: true };

  const { data: grant, error: grantErr } = await db.rpc("grant_founding_seat", {
    _user_id: input.userId,
    _stripe_session_id: `now_${input.checkoutId}`,
    _invite_code: checkout.invite_code ?? null,
    _amount_cents: FOUNDING_SEAT_CENTS,
    _payment_intent: input.providerPaymentId ?? null,
  });
  if (grantErr) throw new Error(grantErr.message);
  if (grant && typeof grant === "object" && "ok" in grant && grant.ok === false) {
    throw new Error("grant_founding_seat_failed");
  }

  await db
    .from("founding_crypto_checkouts")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider_payment_id: input.providerPaymentId ?? null,
      updated_at: new Date().toISOString(),
      metadata: {
        asset: input.asset,
        fulfilled: true,
        outcome_amount: input.outcomeAmount ?? null,
        outcome_currency: input.outcomeCurrency ?? null,
      },
    })
    .eq("id", input.checkoutId);

  return { ok: true };
}

export { nowPaymentsConfigured, parseCryptoAsset };
