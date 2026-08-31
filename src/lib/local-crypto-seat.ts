import { createHmac, timingSafeEqual } from "node:crypto";

import {
  CRYPTO_SEAT_ASSETS,
  LOCAL_SEAT_BOOST_GRANT,
  LOCAL_SEAT_EUR,
  type CryptoSeatAsset,
  isCryptoSeatAsset,
} from "@/lib/boost-packs";
import { SITE_URL } from "@/lib/site";

const NOW_API = "https://api.nowpayments.io/v1";

/** NOWPayments pay_currency codes for Local Seat crypto. */
export const NOW_PAY_CURRENCY: Record<CryptoSeatAsset, string> = {
  usdc: "usdc",
  eth: "eth",
  btc: "btc",
  sol: "sol",
};

export function cryptoSeatAssets(): readonly CryptoSeatAsset[] {
  return CRYPTO_SEAT_ASSETS;
}

export function nowPaymentsConfigured(): boolean {
  return Boolean(process.env["NOWPAYMENTS_API_KEY"]?.trim());
}

function nowApiKey(): string {
  const key = process.env["NOWPAYMENTS_API_KEY"]?.trim();
  if (!key) throw new Error("NOWPAYMENTS_API_KEY missing");
  return key;
}

/** Official NOWPayments notification servers — allow these through the firewall / Caddy. */
export const NOWPAYMENTS_IPN_IPS = [
  "51.89.194.21",
  "51.75.77.69",
  "138.201.172.58",
  "65.21.158.36",
] as const;

function ipnSecret(): string {
  return (
    process.env["NOWPAYMENTS_IPN_SECRET"]?.trim() ||
    process.env["NOWPAYMENTS_SECRET_KEY"]?.trim() ||
    ""
  );
}

export type NowIpnPayload = {
  payment_status?: string;
  order_id?: string;
  payment_id?: string | number;
  price_amount?: number | string;
  price_currency?: string;
  pay_amount?: number | string;
  actually_paid?: number | string;
  pay_currency?: string;
  outcome_amount?: number | string;
  outcome_currency?: string;
};

export type NowInvoice = {
  id: string | number;
  invoice_url?: string;
  pay_address?: string;
  pay_amount?: number | string;
  pay_currency?: string;
  order_id?: string;
  payment_status?: string;
};

export async function createNowPaymentsInvoice(input: {
  checkoutId: string;
  companyId: string;
  asset: CryptoSeatAsset;
  amountEur?: number;
}): Promise<NowInvoice> {
  const amount = input.amountEur ?? LOCAL_SEAT_EUR;
  const body = {
    price_amount: amount,
    price_currency: "eur",
    pay_currency: NOW_PAY_CURRENCY[input.asset],
    order_id: input.checkoutId,
    order_description: `Aura Local Seat · ${input.companyId.slice(0, 8)} · ${input.asset.toUpperCase()}`,
    ipn_callback_url: `${SITE_URL}/api/billing/crypto-ipn`,
    success_url: `${SITE_URL}/boost?checkout=success&crypto=1`,
    cancel_url: `${SITE_URL}/boost?checkout=cancel&crypto=1`,
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

/** Verify NOWPayments IPN signature (HMAC-SHA512 of sorted JSON). */
export function verifyNowPaymentsIpn(rawBody: string, signatureHeader: string | null): boolean {
  const secret = ipnSecret();
  if (!secret || !signatureHeader) return false;
  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    const sorted = sortObject(parsed);
    const payload = JSON.stringify(sorted);
    const hmac = createHmac("sha512", secret).update(payload).digest("hex");
    const a = Buffer.from(hmac, "utf8");
    const b = Buffer.from(signatureHeader.trim(), "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const val = obj[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        acc[key] = sortObject(val as Record<string, unknown>);
      } else {
        acc[key] = val;
      }
      return acc;
    }, {});
}

/**
 * Fixed-price Local Seat: deliver only on `finished`.
 * Do not grant on confirming / confirmed / sending / partially_paid.
 */
export function isPaidNowStatus(status: string | undefined): boolean {
  return (status || "").toLowerCase() === "finished";
}

function asPositiveNumber(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * NOWPayments go-live requirement: inspect outcome_amount + outcome_currency
 * before granting a fixed-price product.
 */
export function nowIpnCoversAmount(
  payload: NowIpnPayload,
  expected: number,
  currency: "eur" | "usd",
): boolean {
  const outcomeAmount = asPositiveNumber(payload.outcome_amount);
  const outcomeCurrency = String(payload.outcome_currency || "")
    .trim()
    .toLowerCase();
  if (outcomeAmount == null || !outcomeCurrency) return false;

  const priceCurrency = String(payload.price_currency || "")
    .trim()
    .toLowerCase();
  const priceAmount = asPositiveNumber(payload.price_amount);
  if (priceCurrency === currency) {
    if (priceAmount == null || Math.abs(priceAmount - expected) > 1) return false;
    if (outcomeCurrency === currency && outcomeAmount + 1e-9 < expected * 0.95) return false;
  } else if (priceCurrency && priceCurrency !== currency) {
    return false;
  }

  const actuallyPaid = asPositiveNumber(payload.actually_paid);
  const payAmount = asPositiveNumber(payload.pay_amount);
  if (actuallyPaid != null && payAmount != null && actuallyPaid + 1e-12 < payAmount * 0.95) {
    return false;
  }

  return true;
}

/** Local Seat is a €99 fixed-price product. */
export function nowIpnCoversSeat(
  payload: NowIpnPayload,
  expectedEur: number = LOCAL_SEAT_EUR,
): boolean {
  return nowIpnCoversAmount(payload, expectedEur, "eur");
}

export async function fulfillLocalSeatCrypto(input: {
  companyId: string;
  checkoutId: string;
  asset: string;
  providerPaymentId?: string | null;
  outcomeAmount?: string | null;
  outcomeCurrency?: string | null;
}): Promise<{ ok: boolean; already?: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: checkout } = await supabaseAdmin
    .from("local_crypto_checkouts")
    .select("id, status, company_id")
    .eq("id", input.checkoutId)
    .maybeSingle();
  if (!checkout || checkout.company_id !== input.companyId) {
    throw new Error("checkout_not_found");
  }
  if (checkout.status === "paid") return { ok: true, already: true };

  const { error: seatErr } = await supabaseAdmin.rpc("mark_local_seat_paid_stripe", {
    _company_id: input.companyId,
    _boost_grant: LOCAL_SEAT_BOOST_GRANT,
  });
  if (seatErr) throw new Error(seatErr.message);

  await supabaseAdmin
    .from("local_crypto_checkouts")
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

  await supabaseAdmin.from("activity_events").insert({
    company_id: input.companyId,
    kind: "product",
    message: `Local Seat freigeschaltet · Crypto ${String(input.asset).toUpperCase()}`,
    value: LOCAL_SEAT_EUR,
  });

  return { ok: true };
}

export function parseCryptoAsset(raw: unknown): CryptoSeatAsset | null {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  return isCryptoSeatAsset(v) ? v : null;
}
