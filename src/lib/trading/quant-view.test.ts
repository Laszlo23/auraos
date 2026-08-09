import { describe, expect, it } from "vitest";

import { deriveQuantView } from "@/lib/trading/quant-view";

describe("deriveQuantView", () => {
  it("recommends wait when armed without position and bullish tape", () => {
    const view = deriveQuantView({
      change24hPct: 2.1,
      high24h: 1960,
      low24h: 1920,
      price: 1950,
      volumeQuote: 500_000_000,
      armed: true,
      paper: true,
      hasOpenPosition: false,
      openPnl: 0,
      exposurePct: 0,
      maxRiskPct: 5,
      hasApprovedStrategy: true,
      backtest: { total_return_pct: 8, max_drawdown_pct: 4, trade_count: 20 },
      pendingSignals: 0,
    });
    expect(view.stance).toBe("BULLISH");
    expect(view.recommendation).toBe("WAIT_FOR_ENTRY");
    expect(view.confidence).toBeGreaterThan(50);
  });

  it("never invents whale data — recommendation stays strategy-bound without position", () => {
    const view = deriveQuantView({
      change24hPct: -0.2,
      high24h: 100,
      low24h: 99,
      price: 99.5,
      volumeQuote: 1,
      armed: false,
      paper: true,
      hasOpenPosition: false,
      openPnl: 0,
      exposurePct: 0,
      maxRiskPct: 5,
      hasApprovedStrategy: false,
      backtest: null,
      pendingSignals: 0,
    });
    expect(view.recommendation).toBe("REVIEW_STRATEGY");
  });
});
