import { describe, expect, it } from "vitest";

import { paymentRequirements, getEndpoint } from "@/lib/x402-gateway";
import { planById, PLANS, TOKEN_SYMBOL } from "@/lib/plans";
import { splitRevenue } from "@/lib/x402-catalog";
import { cycleWindow, daysLeft } from "@/lib/subscription";

describe("plans", () => {
  it("resolves known plans and falls back safely", () => {
    expect(planById("company").tokens).toBeGreaterThan(0);
    expect(planById("nope").id).toBe(PLANS[0]!.id);
    expect(TOKEN_SYMBOL).toBe("AURA");
  });
});

describe("subscription helpers", () => {
  it("builds a 30-day cycle window", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const w = cycleWindow(from);
    expect(w.cycle_start).toBe(from.toISOString());
    expect(new Date(w.cycle_end).getTime() - from.getTime()).toBe(30 * 86_400_000);
  });

  it("computes days left", () => {
    const end = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(daysLeft(end)).toBeGreaterThanOrEqual(2);
    expect(daysLeft(null)).toBe(0);
  });
});

describe("x402 catalog gateway", () => {
  it("finds catalog endpoints and builds payment requirements", () => {
    const ep = getEndpoint("quant-signal");
    expect(ep).toBeTruthy();
    const req = paymentRequirements(ep!, "https://aibusiness.fun/api/public/x402/quant-signal");
    expect(req.scheme).toBe("exact");
    expect(Number(req.maxAmountRequired)).toBeGreaterThan(0);
    expect(req.payTo).toMatch(/^0x/);
  });

  it("splits revenue across platform owner treasury", () => {
    const split = splitRevenue(1);
    expect(split.platform_fee + split.owner_share + split.treasury_share).toBeCloseTo(1, 5);
  });
});
