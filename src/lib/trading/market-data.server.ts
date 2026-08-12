export type Candle = {
  t: number; // open time ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

/** Strategy / backtest timeframes (includes intraday for day-trade desk). */
export type Timeframe = "5m" | "15m" | "1h" | "4h" | "1d";

/** Chart-only intervals for the Quant Desk. */
export type ChartInterval = "5m" | "15m" | "1h" | "4h" | "1d";

/** Desk market keys — native wrapped pair is tradeable; BTC/SOL watch-only. */
export type DeskMarket = "WETH/USDC" | "WBNB/USDC" | "WETH/USDG" | "BTC/USDC" | "SOL/USDC";

const TF_TO_BINANCE: Record<Timeframe, string> = {
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

const CHART_TO_BINANCE: Record<ChartInterval, string> = {
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

const TF_MS: Record<Timeframe, number> = {
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

type BinancePair = {
  binance: string;
  display: DeskMarket;
  tradeable: boolean;
  sourceNote: string;
};

function resolvePair(symbol: string): BinancePair {
  const s = symbol.trim().toUpperCase();
  if (s === "WETH/USDC" || s === "ETH/USDC" || s === "ETH" || s === "ETH/USDT") {
    return {
      binance: "ETHUSDT",
      display: "WETH/USDC",
      tradeable: true,
      sourceNote: "binance:ETHUSDT (proxy for Base WETH/USDC)",
    };
  }
  if (s === "WETH/USDG" || s === "ETH/USDG") {
    return {
      binance: "ETHUSDT",
      display: "WETH/USDG",
      tradeable: true,
      sourceNote: "binance:ETHUSDT (proxy for Robinhood WETH/USDG)",
    };
  }
  if (s === "WBNB/USDC" || s === "BNB/USDC" || s === "BNB" || s === "BNB/USDT") {
    return {
      binance: "BNBUSDT",
      display: "WBNB/USDC",
      tradeable: true,
      sourceNote: "binance:BNBUSDT (proxy for BSC WBNB/USDC)",
    };
  }
  if (s === "BTC/USDC" || s === "BTC" || s === "BTC/USDT") {
    return {
      binance: "BTCUSDT",
      display: "BTC/USDC",
      tradeable: false,
      sourceNote: "binance:BTCUSDT (watch-only — desk trades wrapped native/USDC)",
    };
  }
  if (s === "SOL/USDC" || s === "SOL" || s === "SOL/USDT") {
    return {
      binance: "SOLUSDT",
      display: "SOL/USDC",
      tradeable: false,
      sourceNote: "binance:SOLUSDT (watch-only — desk trades wrapped native/USDC)",
    };
  }
  return {
    binance: "ETHUSDT",
    display: "WETH/USDC",
    tradeable: true,
    sourceNote: "binance:ETHUSDT (fallback)",
  };
}

function parseKlines(rows: unknown[]): Candle[] {
  return rows.map((row) => {
    const r = row as (string | number)[];
    return {
      t: Number(r[0]),
      o: Number(r[1]),
      h: Number(r[2]),
      l: Number(r[3]),
      c: Number(r[4]),
      v: Number(r[5]),
    };
  });
}

/** How many bars fit between two timestamps for a timeframe (inclusive-ish). */
export function estimateBarsInRange(fromMs: number, toMs: number, timeframe: Timeframe): number {
  if (!(toMs > fromMs)) return 0;
  return Math.ceil((toMs - fromMs) / TF_MS[timeframe]) + 1;
}

/**
 * Fetch real OHLC candles for backtests / signals.
 * Uses Binance public klines. Never synthesizes fake sin-wave series.
 *
 * Optional `startTime` / `endTime` (ms) pin the window; Binance still caps at
 * 500 bars — we clamp and prefer the most recent slice inside the range.
 */
export async function fetchCandles(input: {
  symbol: string;
  timeframe: Timeframe;
  limit?: number;
  startTime?: number;
  endTime?: number;
}): Promise<{ candles: Candle[]; source: string; truncated?: boolean }> {
  const pair = resolvePair(input.symbol);
  // Strategy backtests historically use WETH; chart/pulse may request BTC/SOL.
  const tf = TF_TO_BINANCE[input.timeframe];
  let startTime = input.startTime;
  const endTime = input.endTime;
  let truncated = false;

  if (startTime != null && endTime != null && endTime <= startTime) {
    throw new Error("Backtest end date must be after the start date.");
  }

  let limit = Math.min(500, Math.max(50, input.limit ?? 200));
  if (startTime != null && endTime != null) {
    const needed = estimateBarsInRange(startTime, endTime, input.timeframe);
    if (needed > 500) {
      startTime = endTime - 499 * TF_MS[input.timeframe];
      truncated = true;
    }
    limit = Math.min(500, Math.max(50, needed));
  }

  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", pair.binance);
  url.searchParams.set("interval", tf);
  url.searchParams.set("limit", String(limit));
  if (startTime != null) url.searchParams.set("startTime", String(Math.floor(startTime)));
  if (endTime != null) url.searchParams.set("endTime", String(Math.floor(endTime)));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Market data unavailable (${res.status}). Try again shortly.`);
  }
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows) || rows.length < 20) {
    throw new Error("Not enough candle history in that date range — widen the window.");
  }
  const candles = parseKlines(rows);
  const from = candles[0]?.t;
  const to = candles.at(-1)?.t;
  const windowNote =
    from != null && to != null
      ? ` · ${new Date(from).toISOString().slice(0, 10)} → ${new Date(to).toISOString().slice(0, 10)}`
      : "";
  return {
    candles,
    source: `${pair.sourceNote}${windowNote}${truncated ? " · clipped to 500 bars" : ""}`,
    ...(truncated ? { truncated: true } : {}),
  };
}

/** Chart candles for the Quant Desk (finer intervals than strategy backtests). */
export async function fetchMarketCandles(input: {
  symbol: string;
  interval: ChartInterval;
  limit?: number;
}): Promise<{
  symbol: DeskMarket;
  interval: ChartInterval;
  candles: Candle[];
  tradeable: boolean;
  source: string;
}> {
  const pair = resolvePair(input.symbol);
  const limit = Math.min(200, Math.max(40, input.limit ?? 96));
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", pair.binance);
  url.searchParams.set("interval", CHART_TO_BINANCE[input.interval]);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Chart data unavailable (${res.status}). Try again shortly.`);
  }
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows) || rows.length < 10) {
    throw new Error("Not enough candles for the chart.");
  }
  return {
    symbol: pair.display,
    interval: input.interval,
    candles: parseKlines(rows),
    tradeable: pair.tradeable,
    source: pair.sourceNote,
  };
}

/** Latest mid / last price — prefer Binance ticker (near real-time) over candle close. */
export async function fetchMarkPrice(symbol: string): Promise<{ price: number; source: string }> {
  try {
    const pair = resolvePair(symbol);
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair.binance}`);
    if (res.ok) {
      const json = (await res.json()) as { price?: string };
      const price = Number(json.price);
      if (Number.isFinite(price) && price > 0) {
        return { price, source: `${pair.sourceNote} ticker` };
      }
    }
  } catch {
    /* fall through */
  }
  const { candles, source } = await fetchCandles({
    symbol: symbol.startsWith("BTC") || symbol.startsWith("SOL") ? symbol : "WETH/USDC",
    timeframe: "1h",
    limit: 2,
  });
  const last = candles.at(-1);
  if (!last) throw new Error("No mark price");
  return { price: last.c, source };
}

/**
 * Live desk quote: last price + 24h stats + short sparkline (15m closes).
 * Never fabricated.
 */
export async function fetchLiveMarketQuote(symbol = "WETH/USDC"): Promise<{
  symbol: DeskMarket;
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volumeQuote: number;
  spark: number[];
  tradeable: boolean;
  source: string;
  asOf: number;
}> {
  const pair = resolvePair(symbol);

  const [tickerRes, sparkRes] = await Promise.all([
    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair.binance}`),
    fetch(`https://api.binance.com/api/v3/klines?symbol=${pair.binance}&interval=15m&limit=48`),
  ]);

  if (!tickerRes.ok) {
    throw new Error(`Live quote unavailable (${tickerRes.status}). Try again shortly.`);
  }

  const ticker = (await tickerRes.json()) as {
    lastPrice?: string;
    priceChangePercent?: string;
    highPrice?: string;
    lowPrice?: string;
    quoteVolume?: string;
    closeTime?: number;
  };

  const price = Number(ticker.lastPrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Live quote returned an invalid price.");
  }

  let spark: number[] = [];
  if (sparkRes.ok) {
    const rows = (await sparkRes.json()) as unknown[];
    if (Array.isArray(rows)) {
      spark = rows.map((row) => Number((row as (string | number)[])[4])).filter(Number.isFinite);
    }
  }
  if (spark.length < 2) spark = [price * 0.999, price];

  return {
    symbol: pair.display,
    price,
    change24hPct: Math.round(Number(ticker.priceChangePercent ?? 0) * 100) / 100,
    high24h: Number(ticker.highPrice ?? price),
    low24h: Number(ticker.lowPrice ?? price),
    volumeQuote: Number(ticker.quoteVolume ?? 0),
    spark,
    tradeable: pair.tradeable,
    source: pair.sourceNote,
    asOf: Number(ticker.closeTime ?? Date.now()),
  };
}

export type MarketPulseMood = "bullish" | "bearish" | "neutral" | "stable";

export type MarketPulseRow = {
  id: "BTC" | "ETH" | "SOL" | "USDC";
  label: string;
  change24hPct: number | null;
  mood: MarketPulseMood;
};

function moodFromChange(pct: number): MarketPulseMood {
  if (pct >= 1) return "bullish";
  if (pct <= -1) return "bearish";
  return "neutral";
}

/** Compact multi-asset 24h moods for the Market Pulse strip. */
export async function fetchMarketPulse(): Promise<{
  rows: MarketPulseRow[];
  asOf: number;
  source: string;
}> {
  const res = await fetch(
    "https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D",
  );
  if (!res.ok) {
    throw new Error(`Market pulse unavailable (${res.status}).`);
  }
  const rowsRaw = (await res.json()) as Array<{
    symbol?: string;
    priceChangePercent?: string;
  }>;
  const bySym = new Map(
    rowsRaw.map((r) => [String(r.symbol), Number(r.priceChangePercent ?? 0)] as const),
  );
  const eth = bySym.get("ETHUSDT") ?? 0;
  const btc = bySym.get("BTCUSDT") ?? 0;
  const sol = bySym.get("SOLUSDT") ?? 0;

  const rows: MarketPulseRow[] = [
    {
      id: "BTC",
      label: "BTC",
      change24hPct: Math.round(btc * 100) / 100,
      mood: moodFromChange(btc),
    },
    {
      id: "ETH",
      label: "ETH",
      change24hPct: Math.round(eth * 100) / 100,
      mood: moodFromChange(eth),
    },
    {
      id: "SOL",
      label: "SOL",
      change24hPct: Math.round(sol * 100) / 100,
      mood: moodFromChange(sol),
    },
    { id: "USDC", label: "USDC", change24hPct: 0, mood: "stable" },
  ];
  return {
    rows,
    asOf: Date.now(),
    source: "binance:24hr tickers",
  };
}
