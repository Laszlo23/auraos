/** Shared Stripe Checkout Session creator — Managed Payments + basil API. */

/** Required for Managed Payments (see Stripe docs). */
export const STRIPE_API_VERSION = "2025-03-31.basil";

export function stripeManagedPaymentsEnabled(): boolean {
  // Default on — set STRIPE_MANAGED_PAYMENTS=0 to fall back to classic Checkout.
  return process.env["STRIPE_MANAGED_PAYMENTS"] !== "0";
}

export type StripeCheckoutSession = {
  id: string;
  url: string;
  amount_total?: number | null;
  currency?: string | null;
  mode?: string | null;
};

/**
 * Create a Checkout Session with Managed Payments when enabled.
 * Do not pass `payment_method_types` — Managed Payments forbids it (dynamic PMs).
 * For Connect direct charges, pass `stripeAccount` and Managed Payments is skipped
 * (connected account is merchant of record).
 */
export async function createStripeCheckoutSession(
  secret: string,
  params: URLSearchParams,
  opts?: { stripeAccount?: string },
): Promise<StripeCheckoutSession> {
  const body = new URLSearchParams(params);

  // Strip classic PM locks — incompatible with Managed Payments / dynamic methods.
  for (const key of [...body.keys()]) {
    if (key === "payment_method_types" || key.startsWith("payment_method_types[")) {
      body.delete(key);
    }
  }

  const connected = Boolean(opts?.stripeAccount);
  if (!connected && stripeManagedPaymentsEnabled()) {
    body.set("managed_payments[enabled]", "true");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Stripe-Version": STRIPE_API_VERSION,
  };
  if (opts?.stripeAccount) headers["Stripe-Account"] = opts.stripeAccount;

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers,
    body,
  });

  const json = (await res.json()) as StripeCheckoutSession & {
    error?: { message?: string; code?: string; param?: string };
  };

  if (!res.ok || !json.url || !json.id) {
    const detail = [json.error?.message, json.error?.param ? `(${json.error.param})` : null]
      .filter(Boolean)
      .join(" ");
    throw new Error(detail || `Could not create checkout session (HTTP ${res.status})`);
  }

  return {
    id: json.id,
    url: json.url,
    amount_total: json.amount_total ?? null,
    currency: json.currency ?? null,
    mode: json.mode ?? null,
  };
}
