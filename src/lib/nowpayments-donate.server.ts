import { randomUUID } from "node:crypto";

import { nowPaymentsConfigured } from "@/lib/local-crypto-seat";
import {
  DONATE_ORDER_PREFIX,
  type DonateAmountUsd,
} from "@/lib/nowpayments-donate";
import { SITE_URL } from "@/lib/site";

const NOW_API = "https://api.nowpayments.io/v1";

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
