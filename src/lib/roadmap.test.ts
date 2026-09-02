import { describe, expect, it } from "vitest";

import { FIRST_THOUSAND, ROADMAP_STOPS } from "@/lib/roadmap";

describe("public roadmap", () => {
  it("caps founding extras at 1,000 and never adds a second Hood", () => {
    expect(FIRST_THOUSAND.lead).toMatch(/One thousand seats/i);
    expect(ROADMAP_STOPS.some((s) => s.id === "hood-circle")).toBe(true);
    expect(ROADMAP_STOPS.find((s) => s.id === "thousand-network")?.body).toMatch(
      /do not mint a second/i,
    );
  });

  it("frames hold-to-earn as usage, not a promised APY", () => {
    expect(FIRST_THOUSAND.holdLead).toMatch(/Not a fixed APY/i);
    expect(FIRST_THOUSAND.disclaimer).toMatch(/not a return promise/i);
    expect(FIRST_THOUSAND.perks[0]?.id).toBe("hold-to-earn");
  });

  it("covers the whole stack before scale", () => {
    const ids = ROADMAP_STOPS.map((s) => s.id);
    expect(ids).toEqual([
      "os-live",
      "vienna-street",
      "aura-quest",
      "aura-scouts",
      "aura-squads",
      "hood-circle",
      "fair-launch",
      "robinhood-chain",
      "ninety-days",
      "hundred-companies",
      "thousand-network",
      "autonomous",
    ]);
  });

  it("marks Aura Scouts live with invite attribution", () => {
    expect(ROADMAP_STOPS.find((s) => s.id === "aura-scouts")?.status).toBe("live");
    expect(ROADMAP_STOPS.find((s) => s.id === "aura-scouts")?.body).toMatch(/lokal\?ref/i);
  });
});
