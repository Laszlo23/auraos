import { describe, expect, it } from "vitest";

import {
  HOOD_EARLY_SUPPORTER_CAP,
  hoodEarlySlotsLeft,
  hoodEarlyWaveOpen,
  hoodWalletMintAllowed,
  normalizeHoodEarlyPass,
} from "@/lib/hood-early";

describe("hood early supporter", () => {
  it("caps the early wave at 333", () => {
    expect(HOOD_EARLY_SUPPORTER_CAP).toBe(333);
    expect(hoodEarlySlotsLeft(0)).toBe(333);
    expect(hoodEarlySlotsLeft(100)).toBe(233);
    expect(hoodEarlySlotsLeft(333)).toBe(0);
    expect(hoodEarlySlotsLeft(500)).toBe(0);
  });

  it("closes early wave when public mint opens or cap fills", () => {
    expect(hoodEarlyWaveOpen(10, false)).toBe(true);
    expect(hoodEarlyWaveOpen(333, false)).toBe(false);
    expect(hoodEarlyWaveOpen(10, true)).toBe(false);
  });

  it("allows wallet mint for public or unlocked early under cap", () => {
    expect(hoodWalletMintAllowed({ publicOpen: true, earlyUnlocked: false, totalMinted: 0 })).toBe(
      true,
    );
    expect(hoodWalletMintAllowed({ publicOpen: false, earlyUnlocked: true, totalMinted: 10 })).toBe(
      true,
    );
    expect(
      hoodWalletMintAllowed({ publicOpen: false, earlyUnlocked: true, totalMinted: 333 }),
    ).toBe(false);
    expect(
      hoodWalletMintAllowed({ publicOpen: false, earlyUnlocked: false, totalMinted: 10 }),
    ).toBe(false);
  });

  it("normalizes passwords the same way every time", () => {
    expect(normalizeHoodEarlyPass("  Aura Early  ")).toBe("aura early");
    expect(normalizeHoodEarlyPass("AURA\nEARLY")).toBe("aura early");
  });
});
