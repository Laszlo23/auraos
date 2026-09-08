import { describe, expect, it } from "vitest";

import { scoreDeskWeek } from "@/lib/trading/arena.server";
import { sizeTradeNotional, unrealizedPnl } from "@/lib/trading/sizing";
import { buildHolderPerks } from "@/lib/trading/holder-perks";
import {
  clampFounderRiskPct,
  hardSpotNotionalCapUsdc,
  SPOT_RISK_FOUNDER_MAX_PCT,
  SPOT_RISK_HARD_CAP_PCT,
} from "@/lib/trading/risk-policy";

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
    // 0.5% of 250 = 1.25, hard 2% = 5 — floor may apply up to min(5, hard)
    expect(n).toBeLessThanOrEqual(50);
    expect(n).toBeLessThanOrEqual(hardSpotNotionalCapUsdc(250));
  });

  it("hard-caps per-idea USDC at 2% of equity even if founder sets 3%", () => {
    const equity = 10_000;
    const n = sizeTradeNotional({
      requested: 5_000,
      specMaxNotional: 5_000,
      maxNotionalDay: 50_000,
      spentToday: 0,
      maxRiskPct: 3,
      equityUsdc: equity,
      notionalBoostPct: 25,
    });
    expect(n).toBe(hardSpotNotionalCapUsdc(equity));
    expect(n).toBe(200); // 2% of 10k
    expect(SPOT_RISK_HARD_CAP_PCT).toBe(2);
  });

  it("never exceeds hard cap when founder tries 5% (legacy)", () => {
    const equity = 1_000;
    const n = sizeTradeNotional({
      requested: 500,
      specMaxNotional: 500,
      maxNotionalDay: 5_000,
      spentToday: 0,
      maxRiskPct: 5,
      equityUsdc: equity,
    });
    expect(n).toBeLessThanOrEqual(hardSpotNotionalCapUsdc(equity));
    expect(n).toBe(20);
  });

  it("clamps founder risk into 0.1–3% band", () => {
    expect(clampFounderRiskPct(5)).toBe(SPOT_RISK_FOUNDER_MAX_PCT);
    expect(clampFounderRiskPct(0)).toBe(0.1);
    expect(clampFounderRiskPct(1.5)).toBe(1.5);
  });

  it("computes unrealized pnl", () => {
    expect(unrealizedPnl(100, 110, 50)).toBeCloseTo(5, 4);
  });

  it("scores weeks with drawdown penalty", () => {
    const high = scoreDeskWeek({ realizedPnl: 100, maxDrawdownPct: 0, tradeCount: 3 });
    const low = scoreDeskWeek({ realizedPnl: 100, maxDrawdownPct: 50, tradeCount: 3 });
    expect(high).toBeGreaterThan(low);
  });

  it("applies Hood season score multiplier", () => {
    const plain = scoreDeskWeek({ realizedPnl: 100, maxDrawdownPct: 0, tradeCount: 4 });
    const hood = scoreDeskWeek({
      realizedPnl: 100,
      maxDrawdownPct: 0,
      tradeCount: 4,
      hoodMultiplier: 1.1,
    });
    expect(hood).toBeCloseTo(plain * 1.1, 4);
  });

  it("maps AURA tiers", () => {
    expect(buildHolderPerks({ auraBalance: 0 }).tier).toBe("none");
    expect(buildHolderPerks({ auraBalance: 50 }).tier).toBe("spark");
    expect(buildHolderPerks({ auraBalance: 1500 }).notionalBoostPct).toBe(15);
    expect(buildHolderPerks({ auraBalance: 4000 }).strategySlotBonus).toBe(1);
    expect(buildHolderPerks({ auraBalance: 100, hasGenesisNft: true }).tier).toBe("genesis");
  });

  it("gives Genesis extras without 3,000 AURA", () => {
    const perks = buildHolderPerks({ auraBalance: 50, hasGenesisNft: true });
    expect(perks.notionalBoostPct).toBe(35);
    expect(perks.strategySlotBonus).toBe(2);
    expect(perks.questXpBoostPct).toBe(35);
    expect(perks.x402RebateBps).toBe(2500);
    expect(perks.seasonScoreMultiplier).toBe(1.1);
    expect(perks.perks.find((p) => p.id === "season")?.active).toBe(true);
    expect(perks.perks.find((p) => p.id === "x402")?.active).toBe(true);
    expect(perks.perks.find((p) => p.id === "arena")).toBeUndefined();
    expect(perks.perks.find((p) => p.id === "hold-to-earn")?.active).toBe(false);
    expect(perks.nftRoadmap.some((n) => /hold-to-earn/i.test(n.title))).toBe(true);
  });

  it("Tickpix is soft flair only", () => {
    const perks = buildHolderPerks({ auraBalance: 50, hasTickpixNft: true, tickpixBalance: 2 });
    expect(perks.hasTickpixNft).toBe(true);
    expect(perks.tickpixBalance).toBe(2);
    expect(perks.questXpBoostPct).toBe(15); // spark 10 + tickpix 5
    expect(perks.strategySlotBonus).toBe(0);
    expect(perks.x402RebateBps).toBe(0);
    expect(perks.seasonScoreMultiplier).toBe(1);
    expect(perks.perks.find((p) => p.id === "tickpix-pit")?.active).toBe(true);
  });
});
