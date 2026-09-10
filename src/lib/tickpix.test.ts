import { describe, expect, it } from "vitest";

import { TICKPIX, tickpixRaidOpen, tickpixWindowCopy } from "@/lib/tickpix";
import { liveSharePost } from "@/lib/share-posts";
import { buildLaunchDripSchedule } from "@/lib/x-launch-campaign";

describe("tickpix raid window", () => {
  it("is open before the cutoff and closed at/after it", () => {
    expect(tickpixRaidOpen(Date.parse("2026-09-12T18:59:59.000Z"))).toBe(true);
    expect(tickpixRaidOpen(Date.parse(TICKPIX.raidEndsAt))).toBe(false);
    expect(tickpixRaidOpen(Date.parse("2026-09-12T19:00:01.000Z"))).toBe(false);
  });

  it("uses raid copy before cutoff and public mint copy after", () => {
    const open = tickpixWindowCopy(Date.parse("2026-09-10T12:00:00.000Z"));
    const closed = tickpixWindowCopy(Date.parse("2026-09-13T00:00:00.000Z"));
    expect(open.banner.toLowerCase()).toContain("free raid");
    expect(closed.banner.toLowerCase()).toContain("public mint");
    expect(closed.metaDescription.toLowerCase()).not.toContain("extended");
  });

  it("swaps share-kit Tickpix captions after the raid", () => {
    const raidPost = {
      id: "tickpix-pit",
      title: "TICKPIX — take a seat",
      vibe: "x",
      file: "1fromweek",
      aspect: "vertical" as const,
      duration: "15s",
      bestFor: ["X"],
      hook: "TICKPIX CCFF00 free raid extended to 12 Sep 19:00 UTC — verify the CA, never trust a DM.",
      captions: ["raid"],
    };
    expect(liveSharePost(raidPost, Date.parse("2026-09-10T12:00:00.000Z")).hook).toContain(
      "free raid",
    );
    expect(liveSharePost(raidPost, Date.parse("2026-09-13T00:00:00.000Z")).hook).toContain(
      "public mint",
    );
  });

  it("schedules post-raid Tickpix drip without EXTENDED copy", () => {
    const slots = buildLaunchDripSchedule(Date.parse("2026-09-13T10:00:00.000Z"));
    const tickpix = slots.filter((s) => s.sharePostId === "tickpix-pit");
    expect(tickpix.length).toBeGreaterThan(0);
    expect(tickpix.every((s) => !s.body.includes("EXTENDED"))).toBe(true);
    expect(tickpix.every((s) => !s.body.includes("Free seats (max 3)"))).toBe(true);
    expect(tickpix.some((s) => /raid closed|public mint/i.test(s.body))).toBe(true);
  });
});
