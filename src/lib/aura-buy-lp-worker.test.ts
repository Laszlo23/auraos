import { describe, expect, it } from "vitest";

import {
  auraBuyFloatCoversEnabled,
  auraBuyHoldUntilStripeAvailable,
  auraBuyUsdcRail,
} from "@/lib/aura-buy-lp-worker.server";
import { readAuraV4FulfillConfig } from "@/lib/aura-v4-fulfill.server";

describe("AURA buy LP worker rails", () => {
  it("defaults to the Phase A float rail", () => {
    expect(auraBuyUsdcRail()).toBe("float");
    expect(auraBuyFloatCoversEnabled()).toBe(true);
    expect(auraBuyHoldUntilStripeAvailable()).toBe(false);
  });

  it("stays dark until the official CA, pool id, and hook are published", () => {
    expect(readAuraV4FulfillConfig()).toBeNull();
  });
});
