import { describe, expect, it } from "vitest";

import { T0_ANNOUNCE_POST_X, caLiveAnnouncePostX } from "@/lib/aura-t0-clock";
import {
  ALL_CHANNELS_FIRE_BODY,
  CA_LIVE_ANNOUNCE_CAMPAIGN,
  DRIP_HORIZON_MS,
  DRIP_MAX_SLOTS,
  LINKEDIN_MAX_SLOTS,
  T0_ANNOUNCE_CAMPAIGN,
  buildCaLiveAnnounceSlots,
  buildFarcasterDripSchedule,
  buildLaunchDripSchedule,
  buildLinkedInDripSchedule,
  buildMissedDripSlots,
  buildT0AnnounceSlots,
  linkedInCampaignLaunchPost,
  buildOsMessageSlots,
  OS_MESSAGE_CAMPAIGN,
  OS_MESSAGE_IDS,
  OS_MESSAGE_STAGGER_MS,
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

  it("builds a LinkedIn drip: one morning post / day, distinct keys", () => {
    const from = Date.parse("2026-09-10T10:00:00+02:00");
    const x = buildLaunchDripSchedule(from);
    const li = buildLinkedInDripSchedule(from);
    const keys = li.map((s) => s.campaignKey);
    expect(li.length).toBeGreaterThanOrEqual(13);
    expect(li.length).toBeLessThanOrEqual(LINKEDIN_MAX_SLOTS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(li.every((s) => s.campaignKey.startsWith("li-drip-"))).toBe(true);
    expect(keys.some((k) => x.some((s) => s.campaignKey === k))).toBe(false);
    expect(li[0]?.campaignKey).toContain("2026-09-11");
    expect(li.every((s) => s.body.length <= 3000)).toBe(true);
    expect(linkedInCampaignLaunchPost().length).toBeGreaterThan(80);
    expect(ALL_CHANNELS_FIRE_BODY.length).toBeLessThanOrEqual(280);
  });

  it("queues a due-now T-0 announce with no CA and distinct keys", () => {
    const slots = buildT0AnnounceSlots(Date.parse("2026-09-11T10:31:00+02:00"));
    const keys = slots.map((s) => s.campaignKey);
    expect(keys).toEqual([
      `${T0_ANNOUNCE_CAMPAIGN}#x`,
      `${T0_ANNOUNCE_CAMPAIGN}#farcaster`,
      `${T0_ANNOUNCE_CAMPAIGN}#linkedin`,
    ]);
    expect(slots[0]?.body).toBe(T0_ANNOUNCE_POST_X);
    expect(slots.every((s) => !/0x[a-fA-F0-9]{40}/.test(s.body))).toBe(true);
    expect(slots[0]!.body.length).toBeLessThanOrEqual(280);
    expect(slots[1]!.body.length).toBeLessThanOrEqual(320);
  });

  it("builds an OS message blast: 14 slots, staggered, length-safe", () => {
    const now = Date.parse("2026-09-11T20:00:00+02:00");
    const slots = buildOsMessageSlots(now);
    const keys = slots.map((s) => s.campaignKey);
    expect(slots).toHaveLength(OS_MESSAGE_IDS.length * 2);
    expect(new Set(keys).size).toBe(keys.length);
    expect(slots.every((s) => s.campaignKey.startsWith(OS_MESSAGE_CAMPAIGN))).toBe(true);
    expect(slots.filter((s) => s.provider === "x")).toHaveLength(OS_MESSAGE_IDS.length);
    expect(slots.filter((s) => s.provider === "farcaster")).toHaveLength(OS_MESSAGE_IDS.length);
    expect(slots.filter((s) => s.provider === "x").every((s) => s.body.length <= 280)).toBe(true);
    expect(
      slots.filter((s) => s.provider === "farcaster").every((s) => s.body.length <= 320),
    ).toBe(true);
    expect(Date.parse(slots[0]!.scheduledAt)).toBe(now);
    expect(Date.parse(slots[2]!.scheduledAt) - now).toBe(OS_MESSAGE_STAGGER_MS);
    expect(OS_MESSAGE_IDS.every((id) => keys.some((k) => k.includes(`#${id}#`)))).toBe(true);
  });

  it("queues a due-now CA-live pin with the official CA", () => {
    const ca = "0xdb1e6d4fab43c8cb5871d32d41df00ea34350723";
    const body = caLiveAnnouncePostX(ca);
    expect(body).toContain(ca);
    expect(body.length).toBeLessThanOrEqual(280);
    expect(body).toMatch(/AURA is LIVE/i);
    expect(CA_LIVE_ANNOUNCE_CAMPAIGN).toBe("ca-live-2026-09-13");
    void buildCaLiveAnnounceSlots;
  });
});
