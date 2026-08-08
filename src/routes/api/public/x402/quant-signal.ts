import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";
import { fetchCandles, fetchMarkPrice } from "@/lib/trading/market-data.server";
import { validateStrategySpec, runBacktest } from "@/lib/trading/backtest.server";

export const Route = createFileRoute("/api/public/x402/quant-signal")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse({ error: "use POST", input: { symbol: "WETH/USDC" } }, { status: 405 }),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          symbol?: unknown;
          timeframe?: unknown;
        };
        const symbolRaw = typeof body.symbol === "string" ? body.symbol.toUpperCase() : "ETH";
        const symbol =
          symbolRaw === "ETH" || symbolRaw === "WETH" ? "WETH/USDC" : `${symbolRaw}/USDC`;
        const timeframe =
          body.timeframe === "4h" || body.timeframe === "1d" ? body.timeframe : "1h";

        return withPayment("quant-signal", request, async () => {
          const { price, source: priceSource } = await fetchMarkPrice(
            symbol === "WETH/USDC" ? "WETH/USDC" : "WETH/USDC",
          );
          const { candles, source } = await fetchCandles({
            symbol: "WETH/USDC",
            timeframe,
            limit: 80,
          });
          const spec = validateStrategySpec({
            timeframe,
            symbols: ["WETH/USDC"],
            entry: { type: "ma_cross", params: { fast: 12, slow: 26 } },
            exit: { stop_pct: 2, take_profit_pct: 4 },
            sizing: { risk_pct_equity: 0.5, max_notional_usdc: 100 },
          });
          const bt = runBacktest(candles.slice(-60), spec, source);
          const closes = candles.map((c) => c.c);
          const i = closes.length - 1;
          const sma = (period: number, idx: number) => {
            let sum = 0;
            for (let j = idx - period + 1; j <= idx; j++) sum += closes[j]!;
            return sum / period;
          };
          const f = sma(12, i);
          const s = sma(26, i);
          const pf = sma(12, i - 1);
          const ps = sma(26, i - 1);
          const direction = pf <= ps && f > s ? "long" : f < s ? "flat" : "flat";
          const stop = price * 0.98;
          const target = price * 1.04;
          return {
            symbol: "WETH/USDC",
            direction,
            conviction: direction === "long" ? 0.64 : 0.4,
            entry: Number(price.toFixed(2)),
            stop: Number(stop.toFixed(2)),
            target: Number(target.toFixed(2)),
            horizon_hours: 12,
            risk_budget_pct: 0.5,
            desk: "Quant",
            simulated: false,
            market_source: priceSource,
            backtest_hint: {
              win_rate: bt.win_rate,
              total_return_pct: bt.total_return_pct,
              max_drawdown_pct: bt.max_drawdown_pct,
            },
            note: "Live candle-derived signal for Base WETH/USDC (ETHUSDT proxy).",
            generated_at: new Date().toISOString(),
          };
        });
      },
    },
  },
});
