import { describe, expect, it } from "vitest";

import { AURA_ALLOCATION_TOTAL, AURA_MAX_SUPPLY } from "@/lib/aura-token";
import {
  isPrivateSaleSender,
  pAuraToLaunchAura,
  PRIVATE_SALE_CAP_WHOLE,
  PRIVATE_SALE_LAUNCH_AURA,
  usdcToPAura,
} from "@/lib/private-sale";

describe("private sale math", () => {
  it("keeps allocations exact", () => {
    expect(AURA_ALLOCATION_TOTAL).toBe(AURA_MAX_SUPPLY);
  });

  it("prices 50 USDC at the $1M FDV formula", () => {
    expect(usdcToPAura(50)).toBeCloseTo((50 * AURA_MAX_SUPPLY) / 1_000_000, 8);
  });

  it("adds 11% at launch", () => {
    expect(pAuraToLaunchAura(100)).toBeCloseTo(111, 8);
    expect(pAuraToLaunchAura(PRIVATE_SALE_CAP_WHOLE)).toBe(PRIVATE_SALE_LAUNCH_AURA);
  });

  it("allows only Laszlo to send cash credits", () => {
    expect(isPrivateSaleSender("Laszlo")).toBe(true);
    expect(isPrivateSaleSender(" laszlo ")).toBe(true);
    expect(isPrivateSaleSender("Ada")).toBe(false);
  });
});
