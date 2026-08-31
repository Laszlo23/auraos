import { describe, expect, it } from "vitest";

import { nowIpnCoversAmount } from "./local-crypto-seat";
import { nowIpnCoversFoundingSeat } from "./founding-crypto-seat";

describe("founding crypto IPN", () => {
  it("accepts a finished $299 USD invoice", () => {
    expect(
      nowIpnCoversFoundingSeat({
        payment_status: "finished",
        price_amount: 299,
        price_currency: "usd",
        pay_amount: 300,
        actually_paid: 300,
        outcome_amount: 299,
        outcome_currency: "usd",
      }),
    ).toBe(true);
  });

  it("rejects underpay and EUR local-seat amounts", () => {
    expect(
      nowIpnCoversAmount(
        {
          payment_status: "finished",
          price_amount: 99,
          price_currency: "eur",
          outcome_amount: 99,
          outcome_currency: "eur",
        },
        299,
        "usd",
      ),
    ).toBe(false);
    expect(
      nowIpnCoversFoundingSeat({
        payment_status: "finished",
        price_amount: 299,
        price_currency: "usd",
        pay_amount: 300,
        actually_paid: 40,
        outcome_amount: 40,
        outcome_currency: "usd",
      }),
    ).toBe(false);
  });
});
