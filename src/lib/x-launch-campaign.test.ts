import { describe, expect, it } from "vitest";

import {
  DRIP_HORIZON_MS,
  DRIP_MAX_SLOTS,
  buildFarcasterDripSchedule,
  buildLaunchDripSchedule,
  buildMissedDripSlots,
} from "@/lib/x-launch-campaign";

describe("buildLaunchDripSchedule", () => {
  it("fills the two-week horizon instead of stopping after a one-week burst", () => {
    const from = Date.parse("2026-08-28T10:00:00+02:00");
    const slots = buildLaunchDripSchedule(from);
    const keys = slots.map((s) => s.campaignKey);
    const last = Date.parse(slots.at(-1)!.scheduledAt);

    expect(slots.length).toBeGreaterThan(24);
    expect(slots.length).toBeLessThanOrEqual(DRIP_MAX_SLOTS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(last - from).toBeGreaterThan(10 * 24 * 60 * 60 * 1000);
    expect(last - from).toBeLessThanOrEqual(DRIP_HORIZON_MS + 36e5);
  });

  it("skips CEST hours already past today", () => {
    const from = Date.parse("2026-08-28T15:00:00+02:00");
    const slots = buildLaunchDripSchedule(from);
    expect(slots[0]?.campaignKey).toContain("2026-08-28T18");
    expect(slots.some((s) => s.campaignKey.includes("2026-08-28T09"))).toBe(false);
    expect(slots.some((s) => s.campaignKey.includes("2026-08-28T13"))).toBe(false);
  });

  it("builds missed drip slots inside a lookback window", () => {
    const from = Date.parse("2026-08-26T00:00:00+02:00");
    const to = Date.parse("2026-08-29T00:00:00+02:00");
    const missed = buildMissedDripSlots(from, to);
    expect(missed).toHaveLength(9);
    expect(missed[0]?.campaignKey).toContain("2026-08-26T09");
    expect(missed.at(-1)?.campaignKey).toContain("2026-08-28T18");
  });

  it("builds a Farcaster sister drip with distinct campaign keys", () => {
    const from = Date.parse("2026-08-28T10:00:00+02:00");
    const x = buildLaunchDripSchedule(from);
    const fc = buildFarcasterDripSchedule(from);
    expect(fc.length).toBe(x.length);
    expect(fc.every((s) => s.campaignKey.startsWith("fc-drip-"))).toBe(true);
    expect(fc[0]!.body.length).toBeLessThanOrEqual(320);
  });
});
