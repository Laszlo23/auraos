import { describe, expect, it } from "vitest";

import { formatMemoryContext, mergeAgentMemory } from "@/lib/agent-memory";

describe("agent memory", () => {
  it("appends lessons and caps length", () => {
    const merged = mergeAgentMemory("old lesson", "new lesson", 80);
    expect(merged.startsWith("[")).toBe(true);
    expect(merged).toContain("new lesson");
    expect(merged.length).toBeLessThanOrEqual(80);
  });

  it("formats prompt context", () => {
    const text = formatMemoryContext({
      memory: "Margin floor 62%",
      knowledge: [{ title: "Offer", summary: "Tea subscription" }],
      recentResults: [{ title: "Draft post", result: "Done" }],
    });
    expect(text).toContain("Agent memory");
    expect(text).toContain("Company knowledge");
    expect(text).toContain("Recent completed work");
  });
});
