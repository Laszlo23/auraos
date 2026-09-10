import { describe, expect, it } from "vitest";

import { DONATE_AMOUNTS_USD, isDonateOrderId, parseDonateAmountUsd } from "./nowpayments-donate";

describe("nowpayments-donate", () => {
  it("accepts preset USD amounts only", () => {
    for (const n of DONATE_AMOUNTS_USD) {
      expect(parseDonateAmountUsd(n)).toBe(n);
      expect(parseDonateAmountUsd(String(n))).toBe(n);
    }
    expect(parseDonateAmountUsd(7)).toBeNull();
    expect(parseDonateAmountUsd(3999.5)).toBeNull();
    expect(parseDonateAmountUsd(undefined)).toBeNull();
  });

  it("detects donate order ids", () => {
    expect(isDonateOrderId("donate_abc")).toBe(true);
    expect(isDonateOrderId("local_abc")).toBe(false);
    expect(isDonateOrderId("")).toBe(false);
    expect(isDonateOrderId(null)).toBe(false);
  });
});
