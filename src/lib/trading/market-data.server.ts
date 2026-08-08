export type Candle = {
  t: number; // open time ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type Timeframe = "1h" | "4h" | "1d";

const TF_TO_BINANCE: Record<Timeframe, string> = {
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

/**
 * Fetch real OHLC candles for backtests / signals.
 * Uses Binance public ETHUSDT klines as an honest WETH/USDC proxy when OKX
 * market candles are unavailable. Never synthesizes fake sin-wave series.
 */
export async function fetchCandles(input: {
  symbol: string;
  timeframe: Timeframe;
  limit?: number;
}): Promise<{ candles: Candle[]; source: string }> {
  const limit = Math.min(500, Math.max(50, input.limit ?? 200));
  const tf = TF_TO_BINANCE[input.timeframe];

  // Prefer Binance public ETHUSDT — liquid, free, real market history.
  if (input.symbol === "WETH/USDC" || input.symbol === "ETH/USDC" || input.symbol === "ETH") {
    const url = `https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=${tf}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Market data unavailable (${res.status}). Try again shortly.`);
    }
    const rows = (await res.json()) as unknown[];
    if (!Array.isArray(rows) || rows.length < 20) {
      throw new Error("Not enough candle history to backtest.");
    }
    const candles: Candle[] = rows.map((row) => {
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
    return {
      candles,
      source: "binance:ETHUSDT (proxy for Base WETH/USDC)",
    };
  }

  throw new Error(`No candle source for ${input.symbol}`);
}

/** Latest mid price from the most recent candle. */
export async function fetchMarkPrice(symbol: string): Promise<{ price: number; source: string }> {
  const { candles, source } = await fetchCandles({
    symbol,
    timeframe: "1h",
    limit: 2,
  });
  const last = candles.at(-1);
  if (!last) throw new Error("No mark price");
  return { price: last.c, source };
}
