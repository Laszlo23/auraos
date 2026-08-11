import type { Candle, Timeframe } from "@/lib/trading/market-data.server";

export type StrategySpec = {
  timeframe: Timeframe;
  symbols: string[];
  entry: {
    type: "ma_cross" | "breakout" | "smart_money_follow";
    params?: Record<string, number>;
  };
  exit: {
    stop_pct: number;
    take_profit_pct: number;
    trailing_pct?: number;
    /** Soft time stop for live desk (hours). */
    max_hold_hours?: number;
  };
  sizing: {
    risk_pct_equity: number;
    max_notional_usdc: number;
  };
};

export type BacktestTrade = {
  side: "long";
  entry: number;
  exit: number;
  pnl_pct: number;
  pnl_usdc: number;
  opened_at: number;
  closed_at: number;
  exit_reason: "stop" | "take" | "trail" | "time" | "eod";
};

export type BacktestResult = {
  equity: number[];
  trades: BacktestTrade[];
  win_rate: number;
  max_drawdown_pct: number;
  total_return_pct: number;
  trade_count: number;
  profit_factor: number;
  avg_win_pct: number;
  avg_loss_pct: number;
  expectancy_pct: number;
  starting_equity: number;
  ending_equity: number;
  fee_bps: number;
  source: string;
  timeframe: Timeframe;
  symbol: string;
  honesty_note: string;
};

export type WalkForwardResult = {
  in_sample: BacktestResult;
  out_of_sample: BacktestResult;
  split_index: number;
  train_bars: number;
  test_bars: number;
};

export type BacktestOptions = {
  startingEquity?: number;
  /** Round-trip fee in basis points (applied on exit). Default 10. */
  feeBps?: number;
};

function sma(values: number[], period: number, i: number): number | null {
  if (i + 1 < period) return null;
  let sum = 0;
  for (let j = i - period + 1; j <= i; j++) sum += values[j]!;
  return sum / period;
}

function highest(values: number[], period: number, i: number): number | null {
  if (i + 1 < period) return null;
  let h = -Infinity;
  for (let j = i - period + 1; j <= i; j++) h = Math.max(h, values[j]!);
  return h;
}

function summarize(
  trades: BacktestTrade[],
  curve: number[],
  startEquity: number,
  feeBps: number,
  source: string,
  timeframe: Timeframe,
  symbol: string,
): BacktestResult {
  const wins = trades.filter((t) => t.pnl_pct > 0);
  const losses = trades.filter((t) => t.pnl_pct <= 0);
  let maxDd = 0;
  let runPeak = curve[0] ?? startEquity;
  for (const e of curve) {
    runPeak = Math.max(runPeak, e);
    maxDd = Math.max(maxDd, ((runPeak - e) / runPeak) * 100);
  }
  const start = curve[0] ?? startEquity;
  const end = curve.at(-1) ?? start;
  const grossWin = wins.reduce((s, t) => s + Math.max(0, t.pnl_usdc), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + Math.min(0, t.pnl_usdc), 0));
  const avgWin =
    wins.length > 0 ? wins.reduce((s, t) => s + t.pnl_pct, 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0 ? losses.reduce((s, t) => s + t.pnl_pct, 0) / losses.length : 0;
  const winRate = trades.length ? wins.length / trades.length : 0;
  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;

  return {
    equity: curve,
    trades,
    win_rate: trades.length ? Math.round(winRate * 100) : 0,
    max_drawdown_pct: Number(maxDd.toFixed(2)),
    total_return_pct: Number((((end - start) / start) * 100).toFixed(2)),
    trade_count: trades.length,
    profit_factor: grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : grossWin > 0 ? 99 : 0,
    avg_win_pct: Number(avgWin.toFixed(3)),
    avg_loss_pct: Number(avgLoss.toFixed(3)),
    expectancy_pct: Number(expectancy.toFixed(3)),
    starting_equity: startEquity,
    ending_equity: Number(end.toFixed(2)),
    fee_bps: feeBps,
    source,
    timeframe,
    symbol,
    honesty_note:
      "CEX ETHUSDT candles are a proxy for Base WETH/USDC. Backtest ≠ live fills or slippage.",
  };
}

/**
 * Walk candles with a simple long-only strategy (spot DEX book).
 * Supports stop / take / trailing. Shorts are flat (no borrow on Base spot v1).
 */
export function runBacktest(
  candles: Candle[],
  spec: StrategySpec,
  source: string,
  options: BacktestOptions = {},
): BacktestResult {
  const symbol = spec.symbols[0] ?? "WETH/USDC";
  const closes = candles.map((c) => c.c);
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const fast = Number(spec.entry.params?.["fast"] ?? 12);
  const slow = Number(spec.entry.params?.["slow"] ?? 26);
  const lookback = Number(spec.entry.params?.["lookback"] ?? 20);
  const stop = Math.max(0.1, Number(spec.exit.stop_pct) || 2) / 100;
  const take = Math.max(0.1, Number(spec.exit.take_profit_pct) || 4) / 100;
  const trail =
    spec.exit.trailing_pct != null && Number(spec.exit.trailing_pct) > 0
      ? Math.max(0.1, Number(spec.exit.trailing_pct)) / 100
      : null;
  const maxHoldMs =
    spec.exit.max_hold_hours != null && Number(spec.exit.max_hold_hours) > 0
      ? Number(spec.exit.max_hold_hours) * 3600_000
      : null;
  const feeBps = Math.max(0, options.feeBps ?? 10);
  const feeRate = feeBps / 10_000;

  let equity = Math.max(100, options.startingEquity ?? 10_000);
  const startEquity = equity;
  const curve: number[] = [];
  const trades: BacktestTrade[] = [];
  let position: {
    entry: number;
    opened_at: number;
    peak: number;
    size: number;
  } | null = null;

  for (let i = 0; i < candles.length; i++) {
    const price = closes[i]!;
    const candle = candles[i]!;
    const barLow = lows[i]!;
    const barHigh = highs[i]!;

    let entrySignal = false;
    if (spec.entry.type === "ma_cross") {
      const f = sma(closes, fast, i);
      const s = sma(closes, slow, i);
      const pf = sma(closes, fast, i - 1);
      const ps = sma(closes, slow, i - 1);
      if (f != null && s != null && pf != null && ps != null) {
        entrySignal = pf <= ps && f > s;
      }
    } else if (spec.entry.type === "breakout") {
      const priorHigh = highest(highs, lookback, i - 1);
      entrySignal = priorHigh != null && price > priorHigh;
    } else {
      const prev = closes[i - 1];
      entrySignal = prev != null && price > prev * 1.015;
    }

    if (!position && entrySignal) {
      const size = Math.min(
        equity * (Math.max(0.1, spec.sizing.risk_pct_equity) / 100) / stop,
        spec.sizing.max_notional_usdc,
        equity * 0.95,
      );
      if (size >= 5) {
        position = {
          entry: price,
          opened_at: candle.t,
          peak: price,
          size,
        };
      }
    } else if (position) {
      position.peak = Math.max(position.peak, barHigh);
      const retFromEntry = (price - position.entry) / position.entry;
      const stopHit = barLow <= position.entry * (1 - stop);
      const takeHit = barHigh >= position.entry * (1 + take);
      const trailHit =
        trail != null && barLow <= position.peak * (1 - trail);
      const timeHit =
        maxHoldMs != null && candle.t - position.opened_at >= maxHoldMs;
      const lastBar = i === candles.length - 1;

      let exitReason: BacktestTrade["exit_reason"] | null = null;
      let exitPrice = price;
      if (stopHit) {
        exitReason = "stop";
        exitPrice = position.entry * (1 - stop);
      } else if (trailHit && trail != null) {
        exitReason = "trail";
        exitPrice = position.peak * (1 - trail);
      } else if (takeHit) {
        exitReason = "take";
        exitPrice = position.entry * (1 + take);
      } else if (timeHit) {
        exitReason = "time";
        exitPrice = price;
      } else if (lastBar) {
        exitReason = "eod";
        exitPrice = price;
      }

      if (exitReason) {
        const ret = (exitPrice - position.entry) / position.entry;
        const gross = position.size * ret;
        const fees = position.size * feeRate;
        const pnlUsdc = gross - fees;
        equity += pnlUsdc;
        trades.push({
          side: "long",
          entry: position.entry,
          exit: exitPrice,
          pnl_pct: Number((ret * 100).toFixed(3)),
          pnl_usdc: Number(pnlUsdc.toFixed(4)),
          opened_at: position.opened_at,
          closed_at: candle.t,
          exit_reason: exitReason,
        });
        position = null;
      }
    }

    curve.push(Number(equity.toFixed(2)));
  }

  return summarize(
    trades,
    curve,
    startEquity,
    feeBps,
    source,
    spec.timeframe,
    symbol,
  );
}

/** Train on first share of bars, test on the rest — honest OOS check. */
export function runWalkForward(
  candles: Candle[],
  spec: StrategySpec,
  source: string,
  options: BacktestOptions & { trainRatio?: number } = {},
): WalkForwardResult {
  const ratio = Math.min(0.85, Math.max(0.5, options.trainRatio ?? 0.7));
  const split = Math.max(40, Math.floor(candles.length * ratio));
  if (candles.length - split < 20) {
    throw new Error("Not enough candles for walk-forward (need ~60+ bars).");
  }
  const train = candles.slice(0, split);
  const test = candles.slice(split);
  return {
    in_sample: runBacktest(train, spec, `${source} · in-sample`, options),
    out_of_sample: runBacktest(test, spec, `${source} · out-of-sample`, options),
    split_index: split,
    train_bars: train.length,
    test_bars: test.length,
  };
}

export function validateStrategySpec(raw: unknown): StrategySpec {
  const o = (raw ?? {}) as Record<string, unknown>;
  const entry = (o["entry"] ?? {}) as Record<string, unknown>;
  const exit = (o["exit"] ?? {}) as Record<string, unknown>;
  const sizing = (o["sizing"] ?? {}) as Record<string, unknown>;
  const type = String(entry["type"] ?? "ma_cross");
  if (!["ma_cross", "breakout", "smart_money_follow"].includes(type)) {
    throw new Error("Invalid entry type");
  }
  const timeframe = String(o["timeframe"] ?? "1h") as Timeframe;
  if (!["5m", "15m", "1h", "4h", "1d"].includes(timeframe)) throw new Error("Invalid timeframe");
  const symbols = Array.isArray(o["symbols"])
    ? (o["symbols"] as unknown[]).map(String)
    : ["WETH/USDC"];
  return {
    timeframe,
    symbols: symbols.length ? symbols : ["WETH/USDC"],
    entry: {
      type: type as StrategySpec["entry"]["type"],
      params: (entry["params"] as Record<string, number> | undefined) ?? {},
    },
    exit: {
      stop_pct: Number(exit["stop_pct"] ?? 2),
      take_profit_pct: Number(exit["take_profit_pct"] ?? 4),
      ...(exit["trailing_pct"] != null ? { trailing_pct: Number(exit["trailing_pct"]) } : {}),
      ...(exit["max_hold_hours"] != null
        ? { max_hold_hours: Number(exit["max_hold_hours"]) }
        : { max_hold_hours: 72 }),
    },
    sizing: {
      risk_pct_equity: Number(sizing["risk_pct_equity"] ?? 0.5),
      max_notional_usdc: Number(sizing["max_notional_usdc"] ?? 100),
    },
  };
}

/** Plain-English capital risk card derived from strategy sizing + backtest numbers. */
export type BacktestRiskCard = {
  risk_pct_equity: number;
  max_notional_usdc: number;
  stop_pct: number;
  take_profit_pct: number;
  starting_equity: number;
  /** Approx USDC lost if one idea hits the stop (sizing target). */
  approx_loss_per_idea_usdc: number;
  /** Max USDC notional the desk will put in one swap. */
  max_notional_usdc_live: number;
  /** Simulated peak-to-trough loss on starting equity. */
  worst_sim_drawdown_usdc: number;
  fee_bps: number;
};

export function buildBacktestRiskCard(
  spec: StrategySpec,
  result: Pick<BacktestResult, "starting_equity" | "max_drawdown_pct" | "fee_bps">,
): BacktestRiskCard {
  const start = result.starting_equity;
  const riskPct = Math.max(0.1, spec.sizing.risk_pct_equity);
  const stop = Math.max(0.1, spec.exit.stop_pct);
  // Engine sizes notional ≈ equity * risk% / stop%, capped by max_notional.
  // Dollar loss at stop ≈ equity * risk% (then also capped by max_notional * stop%).
  const uncapped = (start * riskPct) / 100;
  const cappedByNotional = (spec.sizing.max_notional_usdc * stop) / 100;
  const approxLoss = Math.round(Math.min(uncapped, cappedByNotional) * 100) / 100;
  const worstDd =
    Math.round(((start * Math.max(0, result.max_drawdown_pct)) / 100) * 100) / 100;
  return {
    risk_pct_equity: riskPct,
    max_notional_usdc: spec.sizing.max_notional_usdc,
    stop_pct: stop,
    take_profit_pct: spec.exit.take_profit_pct,
    starting_equity: start,
    approx_loss_per_idea_usdc: approxLoss,
    max_notional_usdc_live: spec.sizing.max_notional_usdc,
    worst_sim_drawdown_usdc: worstDd,
    fee_bps: result.fee_bps,
  };
}
