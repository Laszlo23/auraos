import { describe, expect, it } from "vitest";

import { renderHoodPassportSvg } from "@/lib/hood-art";
import { HOOD_CHARACTERS, hoodTraitAttributes, resolveHoodTraits } from "@/lib/hood-traits";

describe("hood traits", () => {
  it("resolves valid layers for the first and last token", () => {
    for (const id of [1, 1000] as const) {
      const traits = resolveHoodTraits(id);
      expect(traits.tokenId).toBe(id);
      expect(traits.background.label).toBeTruthy();
      expect(traits.character.art).toMatch(/^\/hood\/.+\.jpg$/);
      expect(traits.noggles.fill).toMatch(/^#/);
      expect(traits.seal.label).toBeTruthy();
      expect(traits.mood.label).toBeTruthy();
      expect(traits.frame.label).toBeTruthy();
      expect(["Common", "Uncommon", "Rare", "Legendary"]).toContain(traits.rarity);
      expect(hoodTraitAttributes(traits)).toHaveLength(7);
    }
  });

  it("is deterministic for the same token id", () => {
    expect(resolveHoodTraits(42)).toEqual(resolveHoodTraits(42));
  });

  it("spreads characters across a sample of ids", () => {
    const names = new Set(
      Array.from({ length: 200 }, (_, i) => resolveHoodTraits(i + 1).character.id),
    );
    expect(names.size).toBeGreaterThan(8);
    expect(HOOD_CHARACTERS.length).toBeGreaterThanOrEqual(15);
  });

  it("renders a self-contained SVG passport", () => {
    const svg = renderHoodPassportSvg(1);
    expect(svg).toContain("<svg");
    expect(svg).toContain("#1");
    // Portrait may be embedded as a data URI — never remote http(s).
    expect(svg).not.toMatch(/href="https?:/);
  });

  it("varies noggles and mood across nearby tokens", () => {
    const a = resolveHoodTraits(7);
    const b = resolveHoodTraits(8);
    const c = resolveHoodTraits(9);
    const noggles = new Set([a.noggles.id, b.noggles.id, c.noggles.id]);
    const moods = new Set([a.mood.id, b.mood.id, c.mood.id]);
    expect(noggles.size + moods.size).toBeGreaterThan(2);
  });
});
