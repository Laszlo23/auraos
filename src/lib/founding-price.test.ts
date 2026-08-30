import { describe, expect, it } from "vitest";

import {
  FOUNDING_SEAT_CENTS,
  FOUNDING_SEAT_USD,
  PRICE_OPS_BPS,
  PRICE_OPS_CENTS,
  PRICE_REMAINDER_BPS,
  PRICE_REMAINDER_CENTS,
} from "@/lib/founding-price";
import { HOOD } from "@/lib/hood";

describe("founding $299 split", () => {
  it("keeps seat and mint at $299", () => {
    expect(FOUNDING_SEAT_USD).toBe(299);
    expect(FOUNDING_SEAT_CENTS).toBe(29_900);
    expect(HOOD.mintUsd).toBe(299);
  });

  it("splits each $299 30% ops / 70% remainder without rounding leak", () => {
    expect(PRICE_OPS_BPS).toBe(3_000);
    expect(PRICE_REMAINDER_BPS).toBe(7_000);
    expect(PRICE_OPS_CENTS).toBe(8_970);
    expect(PRICE_REMAINDER_CENTS).toBe(20_930);
    expect(PRICE_OPS_CENTS + PRICE_REMAINDER_CENTS).toBe(FOUNDING_SEAT_CENTS);
  });

  it("publishes the Hood mint as a 70/30 split, not 100% LP", () => {
    expect(HOOD.proceeds).toBe("split");
    expect(HOOD.opsBps).toBe(3_000);
    expect(HOOD.lpBps).toBe(7_000);
  });
});
