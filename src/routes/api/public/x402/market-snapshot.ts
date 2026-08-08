import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";
import { fetchCandles } from "@/lib/trading/market-data.server";

export const Route = createFileRoute("/api/public/x402/market-snapshot")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse({ error: "use POST", input: { symbols: ["ETH"] } }, { status: 405 }),
      POST: async ({ request }) => {
        return withPayment("market-snapshot", request, async () => {
          const { candles, source } = await fetchCandles({
            symbol: "WETH/USDC",
            timeframe: "1h",
            limit: 48,
          });
          const last = candles.at(-1)!;
          const prev = candles.at(-24) ?? candles[0]!;
          const change = ((last.c - prev.c) / prev.c) * 100;
          const highs = candles.map((c) => c.h);
          const lows = candles.map((c) => c.l);
          const hi = Math.max(...highs);
          const lo = Math.min(...lows);
          return {
            assets: [
              {
                symbol: "WETH/USDC",
                price: Number(last.c.toFixed(2)),
                change_24h_pct: Number(change.toFixed(2)),
                vol_band: [Number(lo.toFixed(2)), Number(hi.toFixed(2))],
                regime: change > 1 ? "risk-on" : change < -1 ? "risk-off" : "chop",
              },
            ],
            breadth: change > 0 ? "1/1 advancing" : "0/1 advancing",
            market_regime: change > 1 ? "risk-on" : "defensive",
            desk: "Quant",
            simulated: false,
            market_source: source,
            note: "Live candle snapshot (ETHUSDT proxy for Base WETH/USDC).",
            generated_at: new Date().toISOString(),
          };
        });
      },
    },
  },
});
