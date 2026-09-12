import { describe, expect, it } from "vitest";

import {
  HOOD_ESCROW_ABI,
  HOOD_GIFT_AURA,
  HOOD_GIFT_DUST_AURA,
  HOOD_GIFT_LOCK_DAYS,
  HOOD_GIFT_TOTAL_AURA,
  HOOD_LP_USDC_UNITS,
  HOOD_MAX_SUPPLY,
  HOOD_OPS_USDC_UNITS,
  HOOD_PASSPORT_ABI,
  HOOD_PRICE_USDC_UNITS,
  LAUNCH_MARKET_TIMELOCK_HOURS,
  LAUNCH_OPS_DEFAULT,
  LAUNCH_PROOF,
  assertLaunchMath,
  launchEscrowAddress,
  launchGiftLockAddress,
} from "@/lib/aura-launch";
import { allocationById, AURA_LAUNCH_TREASURY } from "@/lib/aura-token";

describe("Aura launch desk", () => {
  it("keeps Hood math identical to the Solidity constants", () => {
    expect(HOOD_MAX_SUPPLY).toBe(1000);
    expect(HOOD_GIFT_AURA).toBe(7_777);
    expect(HOOD_GIFT_TOTAL_AURA).toBe(7_777_000);
    expect(HOOD_GIFT_TOTAL_AURA + HOOD_GIFT_DUST_AURA).toBe(allocationById("public").amount);
    expect(HOOD_PRICE_USDC_UNITS).toBe(299_000_000n);
    expect(HOOD_LP_USDC_UNITS).toBe(209_300_000n);
    expect(HOOD_OPS_USDC_UNITS).toBe(89_700_000n);
    expect(HOOD_LP_USDC_UNITS + HOOD_OPS_USDC_UNITS).toBe(HOOD_PRICE_USDC_UNITS);
    expect(HOOD_GIFT_LOCK_DAYS).toBe(0);
    expect(LAUNCH_MARKET_TIMELOCK_HOURS).toBe(72);
    expect(LAUNCH_OPS_DEFAULT).toBe(AURA_LAUNCH_TREASURY);
    expect(() => assertLaunchMath()).not.toThrow();
  });

  it("exposes hood mint ABIs and reads configured CAs when present", () => {
    expect(HOOD_ESCROW_ABI.some((x) => "name" in x && x.name === "mintPaid")).toBe(true);
    expect(HOOD_PASSPORT_ABI.some((x) => "name" in x && x.name === "totalMinted")).toBe(true);
    expect(LAUNCH_PROOF.bullets.map((b) => b.id)).toEqual([
      "escrow",
      "ops",
      "gift",
      "lock",
      "timelock",
      "supply",
    ]);
    // Local .env may publish the live Base desk — never invent a fake one in code.
    const escrow = launchEscrowAddress();
    const gifts = launchGiftLockAddress();
    if (escrow) expect(escrow).toMatch(/^0x[a-fA-F0-9]{40}$/);
    if (gifts) expect(gifts).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
