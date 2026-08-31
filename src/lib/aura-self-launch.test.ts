import { describe, expect, it } from "vitest";

import {
  AURA_REDEEM_RESERVE_WHOLE,
  AURA_SELF_LAUNCH,
  assertAuraSelfLaunchMath,
  pAuraToAuraAmount,
} from "@/lib/aura-self-launch";
import { AURA_LOCKS, AURA_BUY_PLAN } from "@/lib/aura-token";

describe("aura self-launch", () => {
  it("keeps allocation and redeem math consistent", () => {
    expect(() => assertAuraSelfLaunchMath()).not.toThrow();
    expect(AURA_REDEEM_RESERVE_WHOLE).toBe(256_666_632);
    expect(pAuraToAuraAmount(100n * 10n ** 18n)).toBe(111n * 10n ** 18n);
  });

  it("documents Uni v2 + LP sink, not a Clanker TGE", () => {
    expect(AURA_SELF_LAUNCH.venue).toMatch(/Uniswap v2/i);
    expect(AURA_SELF_LAUNCH.lpLock).toMatch(/AuraLpSink/i);
    expect(AURA_SELF_LAUNCH.fairLaunch).toMatch(/Uniswap v2/i);
    const liq = AURA_LOCKS.find((l) => l.id === "liquidity");
    expect(liq?.lock).toMatch(/Uniswap v2/i);
    expect(liq?.lock).not.toMatch(/Clanker \/ Uniswap v4/i);
    expect(AURA_BUY_PLAN.steps[1]?.d).toMatch(/Uniswap v2/i);
    expect(AURA_BUY_PLAN.steps[1]?.d).not.toMatch(/Clanker deploys/i);
  });
});
