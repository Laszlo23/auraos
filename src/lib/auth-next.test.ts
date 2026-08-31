import { describe, expect, it } from "vitest";

import { glueckAufNote, isLokalClaimPath, looksLikeInviteCode } from "@/lib/auth-next";

describe("isLokalClaimPath", () => {
  it("allows live claim tokens and rejects junk", () => {
    expect(isLokalClaimPath("/lokal/claim/61a18UZRyl7O7Zj0tAj9B0pk")).toBe(true);
    expect(isLokalClaimPath("/lokal/claim/short")).toBe(false);
    expect(isLokalClaimPath("/lokal/claim/../../etc")).toBe(false);
    expect(isLokalClaimPath("/nachbar/heute")).toBe(false);
  });
});

describe("looksLikeInviteCode", () => {
  it("accepts short founder codes and rejects PKCE-length strings", () => {
    expect(looksLikeInviteCode("INVAB12")).toBe(true);
    expect(looksLikeInviteCode("LOOK")).toBe(true);
    expect(looksLikeInviteCode("wave_1")).toBe(true);
    expect(looksLikeInviteCode("ab")).toBe(false);
    expect(looksLikeInviteCode("a".repeat(40))).toBe(false);
    expect(looksLikeInviteCode("pkce.token.with.dots")).toBe(false);
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
