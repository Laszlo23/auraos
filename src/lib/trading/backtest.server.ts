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
  opened_at: number;
  closed_at: number;
};

export type BacktestResult = {
  equity: number[];
  trades: BacktestTrade[];
  win_rate: number;
  max_drawdown_pct: number;
  total_return_pct: number;
  trade_count: number;
  source: string;
  timeframe: Timeframe;
  symbol: string;
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

/**
 * Walk candles with a simple long-only strategy (spot DEX book).
 * Shorts are treated as flat (no borrow on Base spot in v1).
 */
export function runBacktest(
  candles: Candle[],
  spec: StrategySpec,
  source: string,
): BacktestResult {
  const symbol = spec.symbols[0] ?? "WETH/USDC";
  const closes = candles.map((c) => c.c);
  const highs = candles.map((c) => c.h);
  const fast = Number(spec.entry.params?.["fast"] ?? 12);
  const slow = Number(spec.entry.params?.["slow"] ?? 26);
  const lookback = Number(spec.entry.params?.["lookback"] ?? 20);
  const stop = Math.max(0.1, Number(spec.exit.stop_pct) || 2) / 100;
  const take = Math.max(0.1, Number(spec.exit.take_profit_pct) || 4) / 100;

  let equity = 10_000;
  const curve: number[] = [];
  const trades: BacktestTrade[] = [];
  let position: { entry: number; opened_at: number } | null = null;
  let peak = equity;

  for (let i = 0; i < candles.length; i++) {
    const price = closes[i]!;
    const candle = candles[i]!;

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
      // smart_money_follow: enter on strong up-days as a proxy when no whale feed in backtest
      const prev = closes[i - 1];
      entrySignal = prev != null && price > prev * 1.015;
    }

    if (!position && entrySignal) {
      position = { entry: price, opened_at: candle.t };
    } else if (position) {
      const ret = (price - position.entry) / position.entry;
      const hitStop = ret <= -stop;
      const hitTake = ret >= take;
      const lastBar = i === candles.length - 1;
      if (hitStop || hitTake || lastBar) {
        const pnlPct = ret * 100;
        const size = Math.min(
          equity * (Math.max(0.1, spec.sizing.risk_pct_equity) / 100) / stop,
          spec.sizing.max_notional_usdc,
          equity * 0.95,
        );
        equity += size * ret;
        trades.push({
          side: "long",
          entry: position.entry,
          exit: price,
          pnl_pct: Number(pnlPct.toFixed(3)),
          opened_at: position.opened_at,
          closed_at: candle.t,
        });
        position = null;
      }
    }

    peak = Math.max(peak, equity);
    curve.push(Number(equity.toFixed(2)));
  }

  const wins = trades.filter((t) => t.pnl_pct > 0).length;
  let maxDd = 0;
  let runPeak = curve[0] ?? 10_000;
  for (const e of curve) {
    runPeak = Math.max(runPeak, e);
    maxDd = Math.max(maxDd, ((runPeak - e) / runPeak) * 100);
  }
  const start = curve[0] ?? 10_000;
  const end = curve.at(-1) ?? start;

  return {
    equity: curve,
    trades,
    win_rate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
    max_drawdown_pct: Number(maxDd.toFixed(2)),
    total_return_pct: Number((((end - start) / start) * 100).toFixed(2)),
    trade_count: trades.length,
    source,
    timeframe: spec.timeframe,
    symbol,
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
  if (!["1h", "4h", "1d"].includes(timeframe)) throw new Error("Invalid timeframe");
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
