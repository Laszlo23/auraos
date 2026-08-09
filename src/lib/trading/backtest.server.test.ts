import { describe, expect, it } from "vitest";

import {
  buildBacktestRiskCard,
  runBacktest,
  runWalkForward,
  validateStrategySpec,
} from "@/lib/trading/backtest.server";
import type { Candle } from "@/lib/trading/market-data.server";

function synthCandles(n: number): Candle[] {
  const out: Candle[] = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    p = p * (1 + (i % 7 === 0 ? 0.02 : -0.005));
    out.push({ t: i * 3600_000, o: p, h: p * 1.01, l: p * 0.99, c: p, v: 1000 });
  }
  return out;
}

describe("backtest", () => {
  it("validates and runs ma_cross without inventing empty results", () => {
    const spec = validateStrategySpec({
      timeframe: "1h",
      symbols: ["WETH/USDC"],
      entry: { type: "ma_cross", params: { fast: 5, slow: 15 } },
      exit: { stop_pct: 2, take_profit_pct: 4, trailing_pct: 1.2 },
      sizing: { risk_pct_equity: 0.5, max_notional_usdc: 100 },
    });
    const result = runBacktest(synthCandles(80), spec, "test");
    expect(result.equity.length).toBe(80);
    expect(result.trade_count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.trades)).toBe(true);
    expect(Number.isFinite(result.max_drawdown_pct)).toBe(true);
    expect(result.honesty_note.length).toBeGreaterThan(10);
    expect(result.fee_bps).toBe(10);
  });

  it("builds a plain-English risk card from sizing", () => {
    const spec = validateStrategySpec({
      timeframe: "1h",
      symbols: ["WETH/USDC"],
      entry: { type: "ma_cross", params: { fast: 5, slow: 15 } },
      exit: { stop_pct: 2, take_profit_pct: 4 },
      sizing: { risk_pct_equity: 0.5, max_notional_usdc: 100 },
    });
    const result = runBacktest(synthCandles(80), spec, "test");
    const risk = buildBacktestRiskCard(spec, result);
    expect(risk.approx_loss_per_idea_usdc).toBeGreaterThan(0);
    expect(risk.approx_loss_per_idea_usdc).toBeLessThanOrEqual(result.starting_equity);
    expect(risk.max_notional_usdc_live).toBe(100);
    expect(risk.stop_pct).toBe(2);
  });

  it("walk-forward splits in/out of sample", () => {
    const spec = validateStrategySpec({
      timeframe: "1h",
      symbols: ["WETH/USDC"],
      entry: { type: "ma_cross", params: { fast: 5, slow: 15 } },
      exit: { stop_pct: 2, take_profit_pct: 4 },
      sizing: { risk_pct_equity: 0.5, max_notional_usdc: 100 },
    });
    const wf = runWalkForward(synthCandles(120), spec, "test");
    expect(wf.train_bars + wf.test_bars).toBe(120);
    expect(wf.in_sample.equity.length).toBe(wf.train_bars);
    expect(wf.out_of_sample.equity.length).toBe(wf.test_bars);
  });
});
