import { randomUUID } from "node:crypto";

import { nowPaymentsConfigured } from "@/lib/local-crypto-seat";
import { SITE_URL } from "@/lib/site";

const NOW_API = "https://api.nowpayments.io/v1";

/** Suggested donation amounts (USD). Users pick on /donate; invoice is created server-side. */
export const DONATE_AMOUNTS_USD = [5, 10, 25, 50, 100, 250] as const;
export type DonateAmountUsd = (typeof DONATE_AMOUNTS_USD)[number];

export const DONATE_ORDER_PREFIX = "donate_";

export function isDonateOrderId(orderId: string | undefined | null): boolean {
  return Boolean(orderId && String(orderId).startsWith(DONATE_ORDER_PREFIX));
}

export function parseDonateAmountUsd(raw: unknown): DonateAmountUsd | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return (DONATE_AMOUNTS_USD as readonly number[]).includes(n) ? (n as DonateAmountUsd) : null;
}

function nowApiKey(): string {
  const key = process.env["NOWPAYMENTS_API_KEY"]?.trim();
  if (!key) throw new Error("NOWPAYMENTS_API_KEY missing");
  return key;
}

export type DonateInvoice = {
  id: string | number;
  invoice_url?: string;
  order_id?: string;
};

/**
 * Create a NOWPayments hosted invoice for an open donation.
 * Uses /v1/invoice (not /v1/payment) so we get invoice_url for redirect —
 * same pattern as Local Seat / Founding Seat crypto checkout.
 * pay_currency omitted → payer picks asset on NOW’s hosted page.
 */
export async function createDonationInvoice(input: {
  amountUsd: DonateAmountUsd;
}): Promise<DonateInvoice> {
  const orderId = `${DONATE_ORDER_PREFIX}${randomUUID()}`;
  const body = {
    price_amount: input.amountUsd,
    price_currency: "usd",
    order_id: orderId,
    order_description: `Aura OS donation · $${input.amountUsd}`,
    ipn_callback_url: `${SITE_URL}/api/billing/crypto-ipn`,
    success_url: `${SITE_URL}/donate?status=success`,
    cancel_url: `${SITE_URL}/donate?status=cancel`,
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
  const json = (await res.json().catch(() => ({}))) as DonateInvoice & { message?: string };
  if (!res.ok) {
    throw new Error(json.message || `NOWPayments donation invoice failed (${res.status})`);
  }
  if (!json.id) throw new Error("NOWPayments donation invoice missing id");
  return { ...json, order_id: orderId };
}

export { nowPaymentsConfigured };
