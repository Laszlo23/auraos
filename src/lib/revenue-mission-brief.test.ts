import { describe, expect, it } from "vitest";

import {
  assessFeasibility,
  parseMissionBrief,
  parseTargetAmount,
  parseBudgetAmount,
  parseTimelineDays,
} from "@/lib/revenue-mission-brief";

describe("revenue mission brief parsing", () => {
  it("reads target, deposit, and week from a trading goal", () => {
    const goal =
      "make 1000€ with trading and i will deposit 10€ and it should make it in the next week";
    expect(parseTargetAmount(goal)).toBe(1000);
    expect(parseBudgetAmount(goal)).toBe(10);
    expect(parseTimelineDays(goal)).toBe(7);
    const brief = parseMissionBrief(goal);
    expect(brief.channelHint).toBe("trading");
    expect(brief.risk).toBe("high");
    expect(assessFeasibility(brief).feasibility).toBe("unlikely");
  });
});
