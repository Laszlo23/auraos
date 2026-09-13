/** buy.stripe.com Payment Links — shareable checkout that still hits our webhook. */

const BUY_HOST = "buy.stripe.com";

export function isStripePaymentLinkUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === BUY_HOST && url.pathname.length > 1;
  } catch {
    return false;
  }
}

export function stripePaymentLinkFromEnv(envKey: string): string | undefined {
  const raw = process.env[envKey]?.trim();
  if (!raw) return undefined;
  if (isStripePaymentLinkUrl(raw)) return raw;
  return undefined;
}

/** Attach the logged-in buyer so checkout.session.completed can fulfill. */
export function withStripePaymentLinkContext(
  linkUrl: string,
  opts: { clientReferenceId?: string; email?: string },
): string {
  const url = new URL(linkUrl);
  if (opts.clientReferenceId) {
    url.searchParams.set("client_reference_id", opts.clientReferenceId);
  }
  const email = opts.email?.trim();
  if (email && !email.toLowerCase().endsWith("@siwe.aibusiness.fun")) {
    url.searchParams.set("prefilled_email", email);
  }
  return url.toString();
}
