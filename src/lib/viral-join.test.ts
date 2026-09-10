import { describe, expect, it } from "vitest";

import { progressWeekKey, scoutInviteKit, viralJoinHref } from "@/lib/viral-join";

describe("viral-join", () => {
  it("builds attributed auth href with campaign tags", () => {
    const href = viralJoinHref({
      path: "/auth",
      campaign: "watch",
      content: "tickpix-pit",
      mode: "signup",
    });
    expect(href.startsWith("/auth?")).toBe(true);
    expect(href).toContain("utm_source=share");
    expect(href).toContain("utm_medium=watch");
    expect(href).toContain("utm_campaign=viral_join");
    expect(href).toContain("utm_content=tickpix-pit");
    expect(href).toContain("mode=signup");
  });

  it("builds scout kit with lokal ref", () => {
    const kit = scoutInviteKit("https://aibusiness.fun/lokal?ref=ABC123");
    expect(kit).toMatch(/Scout link/);
    expect(kit).toContain("https://aibusiness.fun/lokal?ref=ABC123");
  });

  it("progressWeekKey is stable within the same UTC week", () => {
    const a = progressWeekKey("growth:scout-share");
    const b = progressWeekKey("growth:scout-share");
    expect(a).toBe(b);
    expect(a).toMatch(/^growth:scout-share:\d{4}-W\d{2}$/);
  });
});
