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
      expect(hoodTraitAttributes(traits)).toHaveLength(4);
    }
  });

  it("is deterministic for the same token id", () => {
    expect(resolveHoodTraits(42)).toEqual(resolveHoodTraits(42));
  });

  it("spreads characters across a sample of ids", () => {
    const names = new Set(
      Array.from({ length: 100 }, (_, i) => resolveHoodTraits(i + 1).character.id),
    );
    expect(names.size).toBeGreaterThan(1);
    expect(HOOD_CHARACTERS.length).toBe(15);
  });

  it("renders a self-contained SVG passport", () => {
    const svg = renderHoodPassportSvg(1);
    expect(svg).toContain("<svg");
    expect(svg).toContain("#1");
    expect(svg).not.toContain("href=");
    expect(svg).not.toContain('transform="translate(400 360)"');
  });
});
