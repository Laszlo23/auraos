import { describe, expect, it } from "vitest";

import { filterOsMapPillars, OS_MAP_PILLARS } from "@/lib/os-function-map";

describe("os-function-map", () => {
  it("keeps only visible paths and drops empty pillars", () => {
    const visible = new Set(["/channels", "/akquise", "/wallet", "/ceo"]);
    const pillars = filterOsMapPillars(visible);
    const ids = pillars.map((p) => p.id);
    expect(ids).toContain("marketing");
    expect(ids).toContain("leads");
    expect(ids).toContain("liquidity");
    expect(ids).toContain("run");
    expect(ids).not.toContain("trading");
    expect(ids).not.toContain("creation");
    expect(pillars.find((p) => p.id === "marketing")?.paths).toEqual(["/channels"]);
    expect(pillars.find((p) => p.id === "leads")?.paths).toEqual(["/akquise"]);
  });

  it("returns all pillars when every mapped path is visible", () => {
    const all = new Set(OS_MAP_PILLARS.flatMap((p) => p.paths));
    const pillars = filterOsMapPillars(all);
    expect(pillars).toHaveLength(OS_MAP_PILLARS.length);
  });

  it("returns empty when nothing is visible", () => {
    expect(filterOsMapPillars([])).toEqual([]);
  });
});
