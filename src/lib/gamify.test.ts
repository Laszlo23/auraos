import { describe, expect, it } from "vitest";

import { GROWTH_STARTER_QUESTS } from "@/lib/gamify";

describe("GROWTH_STARTER_QUESTS", () => {
  it("defines exactly three starter tasks", () => {
    expect(GROWTH_STARTER_QUESTS).toHaveLength(3);
  });

  it("uses unique growth-prefixed quest keys", () => {
    const keys = GROWTH_STARTER_QUESTS.map((q) => q.key);
    expect(new Set(keys).size).toBe(3);
    for (const key of keys) {
      expect(key.startsWith("growth:")).toBe(true);
    }
  });

  it("awards positive XP on each step", () => {
    const total = GROWTH_STARTER_QUESTS.reduce((sum, q) => sum + q.xp, 0);
    expect(total).toBe(500);
    for (const q of GROWTH_STARTER_QUESTS) {
      expect(q.xp).toBeGreaterThan(0);
      expect(q.label.trim().length).toBeGreaterThan(0);
      expect(q.hint.trim().length).toBeGreaterThan(0);
    }
  });
});
