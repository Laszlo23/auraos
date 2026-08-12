import { Counter } from "@/components/aura/counter";
import { Chip, Pulse } from "@/components/aura/primitives";
import { compact, currency } from "@/lib/format";
import type { DeskMarket } from "@/lib/trading/market-data.server";
import { cn } from "@/lib/utils";
import { Loader2, Pause, Play, ShieldAlert } from "lucide-react";

const MARKETS: { id: DeskMarket; label: string; watchOnly: boolean }[] = [
  { id: "WETH/USDC", label: "ETH / USDC", watchOnly: false },
  { id: "BTC/USDC", label: "BTC / USDC", watchOnly: true },
  { id: "SOL/USDC", label: "SOL / USDC", watchOnly: true },
];

export function DeskHero({
  market,
  onMarketChange,
  quote,
  quoteLoading,
  armed,
  paper,
  paperBusy,
  armBusy,
  canArm,
  blockReason,
  dailyLimit,
  dailyUsed,
  capitalAtRisk,
  onPaperMode,
  onArm,
}: {
  market: DeskMarket;
  onMarketChange: (m: DeskMarket) => void;
  quote:
    | {
        price: number;
        change24hPct: number;
        high24h: number;
        low24h: number;
        volumeQuote: number;
        tradeable?: boolean;
      }
    | null
    | undefined;
  quoteLoading?: boolean;
  armed: boolean;
  paper: boolean;
  paperBusy?: boolean;
  armBusy?: boolean;
  canArm?: boolean;
  blockReason?: string | null;
  dailyLimit: number;
  dailyUsed: number;
  capitalAtRisk: number;
  onPaperMode: (paper: boolean) => void;
  onArm: (armed: boolean) => void;
}) {
  const up = (quote?.change24hPct ?? 0) >= 0;
  const selected = MARKETS.find((m) => m.id === market) ?? MARKETS[0]!;

  return (
    <header
      data-tour="trading-market"
      className={cn(
        "rounded-3xl border px-5 py-5 sm:px-6",
        paper
          ? "border-border/50 bg-foreground/[0.03]"
          : armed
            ? "border-destructive/35 bg-destructive/[0.06]"
            : "border-primary/25 bg-primary/[0.04]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Quant Desk
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            AI-powered trading intelligence
          </h1>
          <p className="mt-1.5 max-w-lg text-[13px] text-muted-foreground">
            Market → Quant → Position → Risk. Simple outside, powerful underneath.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Chip tone={armed ? "gold" : "neutral"}>
              <Pulse tone={armed ? "gold" : "muted"} />
              {armed ? "ARMED" : "DISARMED"}
            </Chip>
            {paper ? (
              <Chip tone="neutral">PAPER MODE</Chip>
            ) : (
              <Chip tone="danger">
                <ShieldAlert className="h-3 w-3" /> LIVE
              </Chip>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Session · Daily {currency(dailyUsed, 2)} / {currency(dailyLimit, 0)}
          </p>
          {!paper && armed ? (
            <p className="text-[11px] font-semibold text-destructive">
              Capital at risk · {currency(Math.max(capitalAtRisk, 0), 2)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-foreground/6 p-1">
          {(["paper", "live"] as const).map((mode) => {
            const active = mode === "paper" ? paper : !paper;
            return (
              <button
                key={mode}
                type="button"
                disabled={paperBusy}
                onClick={() => onPaperMode(mode === "paper")}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide",
                  active
                    ? mode === "live"
                      ? "bg-destructive/20 text-destructive"
                      : "bg-foreground/12 text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {mode}
              </button>
            );
          })}
        </div>

        {armed ? (
          <button
            type="button"
            disabled={armBusy}
            onClick={() => onArm(false)}
            className="inline-flex items-center gap-2 rounded-2xl bg-destructive/18 px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
          >
            {armBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
            Disarm
          </button>
        ) : (
          <button
            type="button"
            disabled={armBusy || !canArm}
            title={blockReason ?? undefined}
            onClick={() => onArm(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2 text-xs font-semibold text-background disabled:opacity-45"
          >
            {armBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Arm Quant
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {MARKETS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onMarketChange(m.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12px] font-semibold",
              market === m.id
                ? "bg-primary/16 text-primary"
                : "bg-foreground/6 text-muted-foreground",
            )}
          >
            {m.label}
            {m.watchOnly ? (
              <span className="ml-1.5 text-[9px] uppercase tracking-wider opacity-70">Watch</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {selected.label}
            {selected.watchOnly ? " · watch only" : " · Base tradeable"}
          </p>
          <p className="num mt-1 text-4xl font-semibold tracking-tight">
            {quoteLoading && !quote ? (
              "…"
            ) : quote ? (
              <Counter
                value={quote.price}
                duration={400}
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
          {quote ? (
            <p
              className={cn(
                "mt-1 text-sm font-semibold num",
                up ? "text-gold" : "text-destructive",
              )}
            >
              {up ? "+" : ""}
              {quote.change24hPct.toFixed(2)}%
            </p>
          ) : null}
        </div>

        {quote ? (
          <div className="grid grid-cols-3 gap-4 text-[12px]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                24h High
              </p>
              <p className="num mt-1 font-semibold">{currency(quote.high24h, 2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                24h Low
              </p>
              <p className="num mt-1 font-semibold">{currency(quote.low24h, 2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Volume
              </p>
              <p className="num mt-1 font-semibold">${compact(quote.volumeQuote)}</p>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
