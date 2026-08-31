import { describe, expect, it } from "vitest";

import {
  HOOD_MINT_OPENS_AT,
  formatHoodMintOpens,
  hoodMintIsOpen,
  hoodMintOpensAt,
  hoodMintRemaining,
} from "./hood-mint";

describe("hood mint clock", () => {
  it("is closed before the published open time", () => {
    const before = hoodMintOpensAt().getTime() - 90_000;
    expect(hoodMintIsOpen(before)).toBe(false);
    const left = hoodMintRemaining(before);
    expect(left.open).toBe(false);
    expect(left.minutes).toBe(1);
    expect(left.seconds).toBe(30);
  });

  it("is open at and after the published open time", () => {
    const at = hoodMintOpensAt().getTime();
    expect(hoodMintIsOpen(at)).toBe(true);
    expect(hoodMintRemaining(at).open).toBe(true);
    expect(hoodMintRemaining(at + 1).days).toBe(0);
  });

  it("splits a multi-day window", () => {
    const left = hoodMintRemaining(hoodMintOpensAt().getTime() - 2 * 86_400_000 - 3_600_000);
    expect(left.days).toBe(2);
    expect(left.hours).toBe(1);
  });

  it("prints a dated UTC label", () => {
    expect(HOOD_MINT_OPENS_AT).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(formatHoodMintOpens("en")).toMatch(/2026/);
    expect(formatHoodMintOpens("de")).toMatch(/2026/);
  });
});
