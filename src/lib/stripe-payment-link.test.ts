import { describe, expect, it } from "vitest";

import {
  isStripePaymentLinkUrl,
  stripePaymentLinkFromEnv,
  withStripePaymentLinkContext,
} from "@/lib/stripe-payment-link";

describe("Stripe Payment Links", () => {
  it("accepts only live buy.stripe.com https URLs", () => {
    expect(isStripePaymentLinkUrl("https://buy.stripe.com/test_abc")).toBe(true);
    expect(isStripePaymentLinkUrl("https://checkout.stripe.com/c/pay/cs_live_x")).toBe(false);
    expect(isStripePaymentLinkUrl("plink_123")).toBe(false);
  });

  it("stamps client_reference_id and skips SIWE placeholder email", () => {
    const url = withStripePaymentLinkContext("https://buy.stripe.com/test_abc", {
      clientReferenceId: "user-1",
      email: "you@siwe.aibusiness.fun",
    });
    expect(url).toContain("client_reference_id=user-1");
    expect(url).not.toContain("prefilled_email");
  });

  it("reads only real Payment Link URLs from env", () => {
    process.env["STRIPE_PAYMENT_LINK_AURA_BUY_29"] = "https://buy.stripe.com/test_pack29";
    expect(stripePaymentLinkFromEnv("STRIPE_PAYMENT_LINK_AURA_BUY_29")).toBe(
      "https://buy.stripe.com/test_pack29",
    );
    process.env["STRIPE_PAYMENT_LINK_AURA_BUY_29"] = "price_123";
    expect(stripePaymentLinkFromEnv("STRIPE_PAYMENT_LINK_AURA_BUY_29")).toBeUndefined();
    delete process.env["STRIPE_PAYMENT_LINK_AURA_BUY_29"];
  });
});
