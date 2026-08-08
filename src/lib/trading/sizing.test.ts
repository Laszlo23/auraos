import { describe, expect, it } from "vitest";

import { scoreDeskWeek } from "@/lib/trading/arena.server";
import { sizeTradeNotional, unrealizedPnl } from "@/lib/trading/sizing";
import { buildHolderPerks } from "@/lib/trading/holder-perks";

describe("trading sizing & arena", () => {
  it("enforces risk % and daily remaining", () => {
    const n = sizeTradeNotional({
      requested: 200,
      specMaxNotional: 100,
      maxNotionalDay: 250,
      spentToday: 200,
      maxRiskPct: 0.5,
      equityUsdc: 250,
    });
    expect(n).toBeLessThanOrEqual(50);
    expect(n).toBeGreaterThanOrEqual(5);
  });

  it("computes unrealized pnl", () => {
    expect(unrealizedPnl(100, 110, 50)).toBeCloseTo(5, 4);
  });

  it("scores weeks with drawdown penalty", () => {
    const high = scoreDeskWeek({ realizedPnl: 100, maxDrawdownPct: 0, tradeCount: 3 });
    const low = scoreDeskWeek({ realizedPnl: 100, maxDrawdownPct: 50, tradeCount: 3 });
    expect(high).toBeGreaterThan(low);
  });

  it("maps AURA tiers", () => {
    expect(buildHolderPerks({ auraBalance: 0 }).tier).toBe("none");
    expect(buildHolderPerks({ auraBalance: 50 }).tier).toBe("spark");
    expect(buildHolderPerks({ auraBalance: 1500 }).notionalBoostPct).toBe(15);
    expect(buildHolderPerks({ auraBalance: 4000 }).strategySlotBonus).toBe(1);
    expect(buildHolderPerks({ auraBalance: 100, hasGenesisNft: true }).tier).toBe("genesis");
  });
});
