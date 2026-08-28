import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  isPaidNowStatus,
  nowIpnCoversSeat,
  verifyNowPaymentsIpn,
} from "./local-crypto-seat";

function sign(body: string, secret: string): string {
  const parsed = JSON.parse(body) as Record<string, unknown>;
  const sorted = Object.keys(parsed)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const val = parsed[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        acc[key] = Object.keys(val as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((inner, k) => {
            inner[k] = (val as Record<string, unknown>)[k];
            return inner;
          }, {});
      } else {
        acc[key] = val;
      }
      return acc;
    }, {});
  return createHmac("sha512", secret).update(JSON.stringify(sorted)).digest("hex");
}

describe("NOWPayments IPN", () => {
  afterEach(() => {
    delete process.env["NOWPAYMENTS_IPN_SECRET"];
    delete process.env["NOWPAYMENTS_SECRET_KEY"];
  });

  it("accepts only finished as paid", () => {
    expect(isPaidNowStatus("finished")).toBe(true);
    expect(isPaidNowStatus("FINISHED")).toBe(true);
    expect(isPaidNowStatus("confirmed")).toBe(false);
    expect(isPaidNowStatus("sending")).toBe(false);
    expect(isPaidNowStatus("partially_paid")).toBe(false);
    expect(isPaidNowStatus("waiting")).toBe(false);
  });

  it("requires outcome_amount and outcome_currency", () => {
    expect(
      nowIpnCoversSeat({
        payment_status: "finished",
        price_amount: 99,
        price_currency: "eur",
      }),
    ).toBe(false);
    expect(
      nowIpnCoversSeat({
        payment_status: "finished",
        price_amount: 99,
        price_currency: "eur",
        outcome_amount: 0,
        outcome_currency: "usdttrc20",
      }),
    ).toBe(false);
  });

  it("covers a €99 seat when outcome is present", () => {
    expect(
      nowIpnCoversSeat({
        payment_status: "finished",
        price_amount: 99,
        price_currency: "eur",
        pay_amount: 114.5,
        actually_paid: 114.5,
        outcome_amount: 98.2,
        outcome_currency: "usdttrc20",
      }),
    ).toBe(true);
  });

  it("rejects a billed price that is not the Local Seat", () => {
    expect(
      nowIpnCoversSeat({
        payment_status: "finished",
        price_amount: 9,
        price_currency: "eur",
        outcome_amount: 9,
        outcome_currency: "eur",
      }),
    ).toBe(false);
  });

  it("rejects underpaid actually_paid vs pay_amount", () => {
    expect(
      nowIpnCoversSeat({
        payment_status: "finished",
        price_amount: 99,
        price_currency: "eur",
        pay_amount: 100,
        actually_paid: 40,
        outcome_amount: 40,
        outcome_currency: "usdc",
      }),
    ).toBe(false);
  });

  it("verifies HMAC-SHA512 of sorted JSON", () => {
    process.env["NOWPAYMENTS_IPN_SECRET"] = "test-ipn-secret";
    const raw = JSON.stringify({
      payment_status: "finished",
      outcome_amount: 99,
      outcome_currency: "eur",
      z: 1,
      a: 2,
    });
    const sig = sign(raw, "test-ipn-secret");
    expect(verifyNowPaymentsIpn(raw, sig)).toBe(true);
    expect(verifyNowPaymentsIpn(raw, "deadbeef")).toBe(false);
    expect(verifyNowPaymentsIpn(raw, null)).toBe(false);
  });
});
