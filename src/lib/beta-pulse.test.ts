import { describe, expect, it } from "vitest";

import { questActionHref } from "@/lib/progress/quest-href";
import { BETA_12K_PROPHECIES, prophecyProgressPct, BETA_TARGET_USD } from "@/lib/beta-pulse";

describe("questActionHref", () => {
  it("sends growth weeklies to community", () => {
    expect(questActionHref("growth:social-post")).toBe("/community");
    expect(questActionHref("growth:space-showup")).toBe("/community");
    expect(questActionHref("growth:scout-share")).toBe("/community");
  });

  it("keeps nachbar portals on heute", () => {
    expect(questActionHref("portal:checkin")).toBe("/nachbar/heute");
  });

  it("sends first-win desk work to the command center", () => {
    expect(questActionHref("company:first-win")).toBe("/console");
    expect(questActionHref("desk:approve")).toBe("/console");
  });
});

describe("beta prophecy", () => {
  it("targets 12k on base tier day90", () => {
    expect(BETA_12K_PROPHECIES.find((t) => t.id === "base")?.day90Usd).toBe(BETA_TARGET_USD);
    expect(prophecyProgressPct(6_000)).toBe(50);
  });
});
