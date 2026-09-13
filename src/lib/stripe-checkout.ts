/** Shared Stripe Checkout Session creator — Managed Payments + basil API. */

/** Required for Managed Payments (see Stripe docs). */
export const STRIPE_API_VERSION = "2025-03-31.basil";

/** SaaS / electronically supplied services — required when Managed Payments is on. */
export const STRIPE_DEFAULT_TAX_CODE =
  process.env["STRIPE_PRODUCT_TAX_CODE"]?.trim() || "txcd_10103000";

export function stripeManagedPaymentsEnabled(): boolean {
  // Default on — set STRIPE_MANAGED_PAYMENTS=0 to fall back to classic Checkout.
  return process.env["STRIPE_MANAGED_PAYMENTS"] !== "0";
}

function ensurePriceDataTaxCode(body: URLSearchParams) {
  const hasPriceData = [...body.keys()].some((key) => key.startsWith("line_items[0][price_data]"));
  if (!hasPriceData) return;
  if (body.get("line_items[0][price_data][product_data][tax_code]")) return;
  body.set("line_items[0][price_data][product_data][tax_code]", STRIPE_DEFAULT_TAX_CODE);
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
  ensurePriceDataTaxCode(body);
  if (!connected && stripeManagedPaymentsEnabled()) {
    body.set("managed_payments[enabled]", "true");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Stripe-Version": STRIPE_API_VERSION,
  };
  if (opts?.stripeAccount) headers["Stripe-Account"] = opts.stripeAccount;

  const post = (payload: URLSearchParams) =>
    fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers,
      body: payload,
    });

  let res = await post(body);
  let json = (await res.json()) as StripeCheckoutSession & {
    error?: { message?: string; code?: string; param?: string };
  };

  const taxBlocked =
    !res.ok && /tax.?code|managed.?payments/i.test(json.error?.message ?? "");
  if (taxBlocked && body.get("managed_payments[enabled]") === "true") {
    const classic = new URLSearchParams(body);
    classic.delete("managed_payments[enabled]");
    res = await post(classic);
    json = (await res.json()) as typeof json;
  }

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

/** Refund a PaymentIntent (e.g. founding seat sold out after checkout). */
export async function refundStripePaymentIntent(
  secret: string,
  paymentIntentId: string,
  opts?: { reason?: "duplicate" | "fraudulent" | "requested_by_customer" },
): Promise<{ id: string }> {
  const body = new URLSearchParams();
  body.set("payment_intent", paymentIntentId);
  if (opts?.reason) body.set("reason", opts.reason);

  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body,
  });

  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || `Could not refund payment (HTTP ${res.status})`);
  }
  return { id: json.id };
}
