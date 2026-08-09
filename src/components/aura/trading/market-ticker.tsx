import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Radio } from "lucide-react";

import { Counter } from "@/components/aura/counter";
import { Chip, Pulse } from "@/components/aura/primitives";
import { Spark } from "@/components/aura/spark";
import { compact, currency } from "@/lib/format";
import { getMarketQuote } from "@/lib/trading.functions";
import { cn } from "@/lib/utils";

export type MarketQuote = {
  symbol: string;
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volumeQuote: number;
  spark: number[];
  source: string;
  asOf: number;
};

function useMarketQuote(symbol = "WETH/USDC") {
  return useQuery({
    queryKey: ["market-quote", symbol],
    queryFn: () => getMarketQuote({ data: { symbol } }),
    refetchInterval: 12_000,
    staleTime: 8_000,
    refetchOnWindowFocus: true,
  });
}

function usePriceFlash(price: number | undefined) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (price == null || !Number.isFinite(price)) return;
    if (prev.current != null && price !== prev.current) {
      setFlash(price > prev.current ? "up" : "down");
      const t = window.setTimeout(() => setFlash(null), 700);
      prev.current = price;
      return () => window.clearTimeout(t);
    }
    prev.current = price;
    return;
  }, [price]);

  return flash;
}

/** Compact chip for PageHeader — always-on live mid. */
export function MarketTickerChip({ symbol = "WETH/USDC" }: { symbol?: string }) {
  const q = useMarketQuote(symbol);
  const quote = q.data;
  const flash = usePriceFlash(quote?.price);
  const up = (quote?.change24hPct ?? 0) >= 0;

  if (q.isError && !quote) {
    return (
      <Chip tone="neutral">
        <Radio className="h-3 w-3" /> Feed offline
      </Chip>
    );
  }

  return (
    <Chip tone={up ? "gold" : "danger"}>
      <Pulse tone={up ? "gold" : "destructive"} />
      <span className="font-semibold">WETH</span>
      <span
        className={cn(
          "num transition-colors duration-300",
          flash === "up" && "text-gold",
          flash === "down" && "text-destructive",
        )}
      >
        {quote ? (
          <Counter
            value={quote.price}
            duration={500}
            format={(n) =>
              new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              }).format(n)
            }
          />
        ) : (
          "…"
        )}
      </span>
      {quote ? (
        <span className="num opacity-90">
          {up ? "+" : ""}
          {quote.change24hPct.toFixed(2)}%
        </span>
      ) : null}
    </Chip>
  );
}

/**
 * Full live market strip — price, 24h range, spark, desk activity line.
 * Keeps the Trading Desk feeling alive without crowding onboarding steps.
 */
export function MarketLiveStrip({
  symbol = "WETH/USDC",
  armed,
  paper,
  openCount,
  pendingSignals,
}: {
  symbol?: string;
  armed?: boolean;
  paper?: boolean;
  openCount?: number;
  pendingSignals?: number;
}) {
  const q = useMarketQuote(symbol);
  const quote = q.data as MarketQuote | undefined;
  const flash = usePriceFlash(quote?.price);
  const up = (quote?.change24hPct ?? 0) >= 0;

  const activity =
    armed && (openCount ?? 0) > 0
      ? `Quant managing ${openCount} open ${openCount === 1 ? "position" : "positions"}${paper ? " · paper" : " · live Base"}`
      : armed
        ? `Quant armed · watching ${symbol}${paper ? " on paper" : " for on-chain entries"}`
        : (pendingSignals ?? 0) > 0
          ? `${pendingSignals} pending signal${pendingSignals === 1 ? "" : "s"} · approve in Advanced`
          : `Live ${symbol} mid · backtest first, then arm for Base swaps`;

  return (
    <div
      data-tour="trading-market"
      className="overflow-hidden rounded-3xl border border-border/50 bg-foreground/[0.03]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <Pulse tone={up ? "gold" : "destructive"} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Live market
          </span>
          <Chip tone="primary">Base · WETH/USDC</Chip>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {q.isFetching && !quote ? "Refreshing…" : quote ? "Updates ~12s" : "Connecting…"}
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1.1fr_0.9fr] sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {symbol}
              </p>
              <p
                className={cn(
                  "num text-3xl font-semibold tracking-tight transition-colors duration-300",
                  flash === "up" && "text-gold",
                  flash === "down" && "text-destructive",
                )}
              >
                {quote ? (
                  <Counter
                    value={quote.price}
                    duration={450}
                    format={(n) =>
                      new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      }).format(n)
                    }
                  />
                ) : (
                  "—"
                )}
              </p>
            </div>
            {quote ? (
              <span
                className={cn(
                  "mb-1 rounded-full px-2.5 py-1 text-[12px] font-semibold num",
                  up ? "bg-gold/16 text-gold" : "bg-destructive/14 text-destructive",
                )}
              >
                {up ? "+" : ""}
                {quote.change24hPct.toFixed(2)}% 24h
              </span>
            ) : null}
          </div>

          {quote ? (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                24h high{" "}
                <span className="num text-foreground/80">{currency(quote.high24h, 2)}</span>
              </span>
              <span>
                24h low{" "}
                <span className="num text-foreground/80">{currency(quote.low24h, 2)}</span>
              </span>
              <span>
                Vol{" "}
                <span className="num text-foreground/80">${compact(quote.volumeQuote)}</span>
              </span>
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-muted-foreground">Pulling ETHUSDT proxy feed…</p>
          )}

          <AnimatePresence mode="wait">
            <motion.p
              key={activity}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground"
            >
              <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {activity}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="min-w-0">
          <div className="h-16 rounded-2xl bg-foreground/[0.04] px-2 py-1.5">
            <Spark
              points={quote?.spark ?? [0, 0]}
              tone={up ? "gold" : "primary"}
              height={52}
            />
          </div>
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Last ~12h · 15m closes · {quote?.source?.split(" ")[0] ?? "binance"}
          </p>
        </div>
      </div>
    </div>
  );
}
