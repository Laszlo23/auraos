import { describe, expect, it } from "vitest";

import { HOOD } from "@/lib/hood";
import {
  AURA_SQUARE,
  AURA_SQUARE_COPY,
  auraSquareAddress,
  squareTokenMetadata,
} from "@/lib/aura-square";

describe("Aura Square", () => {
  it("is a binder, not a second Hood", () => {
    expect(AURA_SQUARE.maxSupply).toBe(1111);
    expect(AURA_SQUARE.maxSupply).not.toBe(HOOD.maxSupply);
    expect(AURA_SQUARE.mintUsd).not.toBe(HOOD.mintUsd);
    expect(AURA_SQUARE.path).toBe("/square");
    expect(auraSquareAddress()).toBeNull();
    expect(AURA_SQUARE_COPY.lead).toMatch(/Not founding seats/i);
    expect(AURA_SQUARE_COPY.lead).toMatch(/Not on the pAURA/i);
    expect(squareTokenMetadata(1).attributes.some((a) => String(a.value).includes("Hood"))).toBe(
      true,
    );
    expect(AURA_SQUARE_COPY.stripeHonest).toMatch(/ops wallet/i);
  });
});
