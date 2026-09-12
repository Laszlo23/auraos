import { describe, expect, it } from "vitest";

import { FEATURES_PATH, FEATURE_PAY } from "@/lib/aura-features";
import { AURA_SQUARE } from "@/lib/aura-square";

describe("Aura OS features SSOT", () => {
  it("keeps Square honest and cheaper than Hood numerology", () => {
    expect(FEATURES_PATH).toBe("/features");
    const square = FEATURE_PAY.find((row) => row.id === "square");
    expect(square?.body.en).toMatch(/not live/i);
    expect(square?.body.en).toMatch(/\$11 USDC/);
    expect(square?.body.en).toMatch(/not \$111/);
    expect(AURA_SQUARE.mintUsd).toBe(11);
  });
});
