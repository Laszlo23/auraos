import { describe, expect, it } from "vitest";

import {
  T0_ANNOUNCE_POST,
  T0_ANNOUNCE_POST_FC,
  T0_ANNOUNCE_POST_X,
  TOKEN_LAUNCH_ANNOUNCE_BY_ISO,
  TOKEN_LAUNCH_AT_ISO,
  TOKEN_LAUNCH_DISPLAY,
  TOKEN_LAUNCH_DISPLAY_DE,
  TOKEN_LAUNCH_NOTICE_HOURS,
  padLaunchUnit,
  tokenLaunchAnnounceByMs,
  tokenLaunchAtMs,
  tokenLaunchIsLive,
  tokenLaunchRemain,
} from "@/lib/aura-t0-clock";

describe("AURA T-0 clock", () => {
  it("is Sunday 13 Sep 2026, 11:11 Europe/Vienna (09:11 UTC)", () => {
    expect(TOKEN_LAUNCH_AT_ISO).toBe("2026-09-13T11:11:00+02:00");
    expect(tokenLaunchAtMs()).toBe(Date.parse("2026-09-13T09:11:00.000Z"));
    expect(TOKEN_LAUNCH_DISPLAY).toMatch(/Sunday 13 Sep 2026/);
    expect(TOKEN_LAUNCH_DISPLAY).toMatch(/11:11/);
    expect(TOKEN_LAUNCH_DISPLAY_DE).toMatch(/13\. Sep 2026/);
  });

  it("keeps a strict 48h announce gate (Friday 11:11 CEST)", () => {
    expect(TOKEN_LAUNCH_NOTICE_HOURS).toBe(48);
    expect(TOKEN_LAUNCH_ANNOUNCE_BY_ISO).toBe("2026-09-11T11:11:00+02:00");
    expect(tokenLaunchAtMs() - tokenLaunchAnnounceByMs()).toBe(48 * 60 * 60 * 1000);
  });

  it("counts down then flips live — never invents a CA", () => {
    const before = tokenLaunchRemain(tokenLaunchAtMs() - 1000);
    expect(before.live).toBe(false);
    expect(before.totalMs).toBe(1000);
    expect(before.seconds).toBe(1);

    const twoDays = tokenLaunchRemain(tokenLaunchAtMs() - 2 * 86_400_000 - 3_600_000);
    expect(twoDays.days).toBe(2);
    expect(twoDays.hours).toBe(1);

    const live = tokenLaunchRemain(tokenLaunchAtMs());
    expect(live.live).toBe(true);
    expect(live.totalMs).toBe(0);
    expect(tokenLaunchIsLive(tokenLaunchAtMs())).toBe(true);
    expect(tokenLaunchIsLive(tokenLaunchAtMs() - 1)).toBe(false);
    expect(padLaunchUnit(5)).toBe("05");
  });

  it("ships 48h copy with no contract address", () => {
    for (const body of [T0_ANNOUNCE_POST, T0_ANNOUNCE_POST_X, T0_ANNOUNCE_POST_FC]) {
      expect(body).toMatch(/11:11/);
      expect(body).toMatch(/AURA/);
      expect(body).toMatch(/never by DM/i);
      expect(body).not.toMatch(/0x[a-fA-F0-9]{40}/);
    }
    expect(T0_ANNOUNCE_POST_X.length).toBeLessThanOrEqual(280);
    expect(T0_ANNOUNCE_POST_FC.length).toBeLessThanOrEqual(320);
  });
});
