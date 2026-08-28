import { describe, expect, it } from "vitest";

import { glueckAufNote, isLokalClaimPath } from "@/lib/auth-next";

describe("isLokalClaimPath", () => {
  it("allows live claim tokens and rejects junk", () => {
    expect(isLokalClaimPath("/lokal/claim/61a18UZRyl7O7Zj0tAj9B0pk")).toBe(true);
    expect(isLokalClaimPath("/lokal/claim/short")).toBe(false);
    expect(isLokalClaimPath("/lokal/claim/../../etc")).toBe(false);
    expect(isLokalClaimPath("/nachbar/heute")).toBe(false);
  });
});

describe("glueckAufNote", () => {
  it("points at the Aura card, not Google", () => {
    const note = glueckAufNote({
      name: "Zeitwende Antiquitäten Döbling",
      slug: "zeitwende-antiquitaeten",
      district: "19. Bezirk / Döbling",
    });
    expect(note).toContain("Glück auf, Nachbar");
    expect(note).toContain("/b/zeitwende-antiquitaeten");
    expect(note.toLowerCase()).not.toContain("google");
    expect(note.length).toBeLessThanOrEqual(400);
  });
});
