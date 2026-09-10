import { describe, expect, it } from "vitest";

import { loc, TREASURY_REFERENCE_BASKET } from "@/lib/robinhood-momentum";

describe("robinhood-momentum", () => {
  it("localizes copy", () => {
    expect(loc("en", { en: "Robinhood", de: "Robinhood DE" })).toBe("Robinhood");
    expect(loc("de", { en: "Robinhood", de: "Robinhood DE" })).toBe("Robinhood DE");
  });

  it("anchors reference basket on TSLA", () => {
    const tsla = TREASURY_REFERENCE_BASKET.find((row) => row.id === "tsla");
    expect(tsla?.symbol).toBe("TSLA");
    expect(tsla?.weightPct).toBe(70);
    expect(TREASURY_REFERENCE_BASKET.reduce((a, r) => a + r.weightPct, 0)).toBe(100);
  });
});
