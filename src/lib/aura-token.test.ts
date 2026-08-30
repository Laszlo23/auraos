import { describe, expect, it } from "vitest";

import {
  AURA_ALLOCATION_TOTAL,
  AURA_ALLOCATIONS,
  AURA_LAUNCH_OPS,
  AURA_LOCKS,
  AURA_MAX_SUPPLY,
  AURA_PROJECT_SALE_LOCK,
  AURA_TOKEN_CA,
  allocationById,
  auraLaunchTreasuryAddress,
  readConfiguredBaseAddress,
} from "@/lib/aura-token";

describe("AURA tokenomics", () => {
  it("sums to the fixed supply and keeps CA unpublished", () => {
    expect(AURA_ALLOCATION_TOTAL).toBe(AURA_MAX_SUPPLY);
    expect(AURA_ALLOCATIONS.reduce((s, a) => s + a.pct, 0)).toBe(100);
    expect(AURA_TOKEN_CA).toBeNull();
  });

  it("locks team, project sale, and launch LP", () => {
    expect(allocationById("team").amount).toBe(93_333_333);
    expect(AURA_PROJECT_SALE_LOCK.buyAfterHours).toBe(48);
    expect(AURA_PROJECT_SALE_LOCK.lockDaysAfterT0).toBe(90);
    expect(AURA_LOCKS.map((row) => row.id)).toEqual(["team", "project_sale", "liquidity"]);
    expect(AURA_LAUNCH_OPS.deployer).toMatch(/new empty wallet/i);
    expect(AURA_LAUNCH_OPS.treasury).toMatch(/new wallet/i);
  });

  it("reads a launch treasury only when a real Base address is set", () => {
    expect(readConfiguredBaseAddress("", "not-an-address")).toBeNull();
    expect(readConfiguredBaseAddress(" 0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1 ")).toBe(
      "0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1",
    );
    expect(auraLaunchTreasuryAddress()).toBeNull();
  });
});
