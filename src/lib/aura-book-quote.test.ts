import { describe, expect, it } from "vitest";

import { AURA_LP_NEAR_AURA, AURA_LP_START_PRICE_USD } from "@/lib/aura-curve";
import { estimateAuraBookBuy } from "@/lib/aura-book-quote";

describe("FlatStart book quote", () => {
  it("gives millions of AURA for the first $6k without doubling the price", () => {
    const six = estimateAuraBookBuy(6000);
    expect(six.auraOut).toBeGreaterThan(1_000_000);
    expect(six.auraOut).toBeLessThan(AURA_LP_NEAR_AURA);
    expect(six.startPriceUsd).toBe(AURA_LP_START_PRICE_USD);
    expect(six.endPriceUsd / six.startPriceUsd).toBeLessThan(2);
    expect(six.priceMovePct).toBeLessThan(100);
    expect(six.note).toMatch(/Estimate/i);
  });

  it("keeps $1k smaller than $6k and both cheaper than pairing the full LP line", () => {
    const one = estimateAuraBookBuy(1000);
    const six = estimateAuraBookBuy(6000);
    expect(one.auraOut).toBeGreaterThan(800_000);
    expect(six.auraOut).toBeGreaterThan(one.auraOut * 4);
    expect(six.auraOut / six.usdcIn).toBeGreaterThan(500);
    expect(one.priceMovePct).toBeLessThan(six.priceMovePct);
  });
});
