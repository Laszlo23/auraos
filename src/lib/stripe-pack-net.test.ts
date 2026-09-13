import { describe, expect, it } from "vitest";

import { stripeFundsAvailableFromBalance, stripePackNetFromCheckout } from "@/lib/stripe-pack-net";

describe("Stripe pack net", () => {
  it("uses the balance_transaction fee when expanded", () => {
    const net = stripePackNetFromCheckout(
      {
        amount_total: 11100,
        payment_status: "paid",
        payment_intent: {
          id: "pi_1",
          latest_charge: {
            paid: true,
            captured: true,
            refunded: false,
            balance_transaction: {
              fee: 352,
              net: 10748,
              status: "pending",
              available_on: 1_800_000_000,
            },
          },
        },
      },
      1_700_000_000,
    );
    expect(net.feeCents).toBe(352);
    expect(net.netCents).toBe(10748);
    expect(net.feeEstimated).toBe(false);
    expect(net.fundsAvailable).toBe(false);
    expect(net.paymentIntent).toBe("pi_1");
  });

  it("marks funds available only after Stripe available_on", () => {
    expect(
      stripeFundsAvailableFromBalance({ status: "pending", available_on: 100 }, 99),
    ).toBe(false);
    expect(stripeFundsAvailableFromBalance({ status: "available" }, 1)).toBe(true);
    expect(stripeFundsAvailableFromBalance({ available_on: 50 }, 50)).toBe(true);
  });

  it("estimates the card fee when Stripe has not expanded the BT yet", () => {
    const net = stripePackNetFromCheckout({ amount_total: 2900, payment_status: "paid" });
    expect(net.feeEstimated).toBe(true);
    expect(net.feeCents).toBeGreaterThan(0);
    expect(net.netCents).toBe(2900 - net.feeCents);
    expect(net.fundsAvailable).toBe(false);
  });
});
