import { describe, expect, it } from "vitest";

import {
  AURA_ALLOCATION_TOTAL,
  AURA_ALLOCATIONS,
  AURA_LAUNCH_OPS,
  AURA_LAUNCH_TREASURY,
  AURA_LOCKS,
  AURA_MAX_SUPPLY,
  AURA_PROJECT_SALE_LOCK,
  AURA_TOKEN_CA,
  allocationById,
  auraCaLive,
  auraCaPublishAllowed,
  auraLaunchTreasuryAddress,
  publishedAuraTokenAddress,
  readConfiguredBaseAddress,
} from "@/lib/aura-token";
import { tokenLaunchAtMs } from "@/lib/aura-t0-clock";

describe("AURA tokenomics", () => {
  it("sums to the fixed supply and keeps CA unpublished", () => {
    expect(AURA_ALLOCATION_TOTAL).toBe(AURA_MAX_SUPPLY);
    expect(AURA_ALLOCATIONS.reduce((s, a) => s + a.pct, 0)).toBe(100);
    expect(AURA_TOKEN_CA).toBeNull();
  });

  it("locks team, project sale, launch LP, and Hood gifts", () => {
    expect(allocationById("team").amount).toBe(93_333_333);
    expect(AURA_PROJECT_SALE_LOCK.buyAfterHours).toBe(48);
    expect(AURA_PROJECT_SALE_LOCK.lockDaysAfterT0).toBe(90);
    expect(AURA_LOCKS.map((row) => row.id)).toEqual([
      "team",
      "project_sale",
      "liquidity",
      "hood_gifts",
    ]);
    expect(AURA_LAUNCH_OPS.deployer).toMatch(/new empty wallet/i);
    expect(AURA_LAUNCH_OPS.treasury).toMatch(/official AURA treasury/i);
  });

  it("publishes the official launch treasury and never uses the old pAURA sink", () => {
    expect(readConfiguredBaseAddress("", "not-an-address")).toBeNull();
    expect(readConfiguredBaseAddress(` ${AURA_LAUNCH_TREASURY} `)).toBe(AURA_LAUNCH_TREASURY);
    expect(AURA_LAUNCH_TREASURY).toBe("0x7894a4f43cec1E97CBAa9Cd6676Ac07ABF34dD49");
    expect(AURA_LAUNCH_TREASURY.toLowerCase()).not.toBe(
      "0x502ce9fb1814cb03843967ec5e0d8f6aa3a3c2e1",
    );

    const keys = ["AURA_LAUNCH_TREASURY", "VITE_AURA_LAUNCH_TREASURY"] as const;
    const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    try {
      delete process.env["AURA_LAUNCH_TREASURY"];
      delete process.env["VITE_AURA_LAUNCH_TREASURY"];
      expect(auraLaunchTreasuryAddress()).toBe(AURA_LAUNCH_TREASURY);

      process.env["AURA_LAUNCH_TREASURY"] = "0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1";
      expect(auraLaunchTreasuryAddress()).toBe(AURA_LAUNCH_TREASURY);
    } finally {
      for (const key of keys) {
        if (prev[key] === undefined) delete process.env[key];
        else process.env[key] = prev[key];
      }
    }
  });

  it("does not publish an env CA before T-0 without explicit flags", () => {
    const keys = [
      "AURA_TOKEN_CA",
      "VITE_AURA_TOKEN_CA",
      "AURA_CA_PUBLISH",
      "VITE_AURA_CA_PUBLISH",
      "AURA_ALLOW_PRE_T0_CA",
      "VITE_AURA_ALLOW_PRE_T0_CA",
    ] as const;
    const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    const predicted = "0x1111111111111111111111111111111111111111";
    try {
      process.env["AURA_TOKEN_CA"] = predicted;
      delete process.env["VITE_AURA_TOKEN_CA"];
      delete process.env["AURA_CA_PUBLISH"];
      delete process.env["VITE_AURA_CA_PUBLISH"];
      delete process.env["AURA_ALLOW_PRE_T0_CA"];
      delete process.env["VITE_AURA_ALLOW_PRE_T0_CA"];
      expect(auraCaPublishAllowed(tokenLaunchAtMs() - 1)).toBe(false);
      expect(publishedAuraTokenAddress(tokenLaunchAtMs() - 1)).toBeNull();
      expect(auraCaLive(tokenLaunchAtMs() - 1)).toBe(false);

      process.env["AURA_CA_PUBLISH"] = "1";
      expect(auraCaPublishAllowed(tokenLaunchAtMs() - 1)).toBe(false);
      expect(publishedAuraTokenAddress(tokenLaunchAtMs() - 1)).toBeNull();

      process.env["AURA_ALLOW_PRE_T0_CA"] = "1";
      expect(auraCaPublishAllowed(tokenLaunchAtMs() - 1)).toBe(true);
      expect(publishedAuraTokenAddress(tokenLaunchAtMs() - 1)).toBe(predicted);

      delete process.env["AURA_ALLOW_PRE_T0_CA"];
      expect(auraCaPublishAllowed(tokenLaunchAtMs())).toBe(true);
      expect(publishedAuraTokenAddress(tokenLaunchAtMs())).toBe(predicted);
    } finally {
      for (const key of keys) {
        if (prev[key] === undefined) delete process.env[key];
        else process.env[key] = prev[key];
      }
    }
  });
});
