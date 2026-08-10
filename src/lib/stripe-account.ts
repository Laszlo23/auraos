/** Live Stripe account readiness for Checkout. */

import { stripeManagedPaymentsEnabled } from "@/lib/stripe-checkout";

type StripeAccount = {
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  capabilities?: Record<string, string>;
};

let cached: { at: number; ok: boolean; message?: string } | null = null;
const TTL_MS = 60_000;

/**
 * Classic card charges need `charges_enabled`.
 * Managed Payments (Stripe as merchant of record) does not — skip that gate when enabled.
 */
export async function assertStripeChargesEnabled(secret: string): Promise<void> {
  if (stripeManagedPaymentsEnabled()) return;

  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    if (!cached.ok) throw new Error(cached.message || "Stripe charges are not enabled yet.");
    return;
  }

  const res = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const account = (await res.json()) as StripeAccount & { error?: { message?: string } };
  if (!res.ok) {
    const message = account.error?.message || "Could not verify Stripe account status.";
    cached = { at: now, ok: false, message };
    throw new Error(message);
  }

  const card = account.capabilities?.["card_payments"];
  if (account.charges_enabled && card !== "pending" && card !== "inactive") {
    cached = { at: now, ok: true };
    return;
  }

  const message =
    "Stripe live charges are not enabled yet (card_payments pending). Finish activation in the Stripe Dashboard, or enable Managed Payments. Cash seat codes on /boost still work.";
  cached = { at: now, ok: false, message };
  throw new Error(message);
}
