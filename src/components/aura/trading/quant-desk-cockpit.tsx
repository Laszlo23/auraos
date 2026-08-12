import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ActiveStrategyCard } from "@/components/aura/trading/active-strategy-card";
import type { BacktestSnapshot } from "@/components/aura/trading/backtest-results-dialog";
import { DeskHero } from "@/components/aura/trading/desk-hero";
import {
  DeskFooterActions,
  ManagePositionHint,
  type DeskDrawerId,
} from "@/components/aura/trading/desk-drawers";
import { MarketCandles } from "@/components/aura/trading/market-candles";
import { MarketPulseStrip } from "@/components/aura/trading/market-pulse-strip";
import { OnchainPulse, type OnchainEventLite } from "@/components/aura/trading/onchain-pulse";
import { PositionCard } from "@/components/aura/trading/position-card";
import { QuantViewCard } from "@/components/aura/trading/quant-view-card";
import { RecentTradesList } from "@/components/aura/trading/recent-trades-list";
import { RiskMeter } from "@/components/aura/trading/risk-meter";
import { SpotTradeTicket } from "@/components/aura/trading/spot-trade-ticket";
import { getMarketCandles, getMarketPulse, getMarketQuote } from "@/lib/trading.functions";
import type { ChartInterval, DeskMarket } from "@/lib/trading/market-data.server";
import { deriveQuantView } from "@/lib/trading/quant-view";
import { toast } from "sonner";

type TradeLite = {
  id: string;
  symbol: string;
  side: string;
  size: number;
  entry: number;
  exit: number | null;
  pnl: number;
  status: string;
  mark_price?: number | null;
  paper?: boolean | null;
};

type StrategyLite = {
  id: string;
  name: string;
  status: string;
  backtest: BacktestSnapshot | null;
  spec?: { timeframe?: string; exit?: { stop_pct?: number; take_profit_pct?: number } } | null;
};

export function QuantDeskCockpit({
  armed,
  paper,
  paperBusy,
  armBusy,
  canArm,
  blockReason,
  dailyLimit,
  dailyUsed,
  usdcBalance,
  maxRiskPct,
  openTrades,
  closedTrades,
  activeStrategy,
  hasApprovedStrategy,
  pendingSignals,
  whaleEvents,
  onPaperMode,
  onArm,
  onOpenDrawer,
}: {
  armed: boolean;
  paper: boolean;
  paperBusy?: boolean;
  armBusy?: boolean;
  canArm?: boolean;
  blockReason?: string | null;
  dailyLimit: number;
  dailyUsed: number;
  usdcBalance: number;
  maxRiskPct: number;
  openTrades: TradeLite[];
  closedTrades: TradeLite[];
  activeStrategy: StrategyLite | null;
  hasApprovedStrategy: boolean;
  pendingSignals: number;
  whaleEvents: OnchainEventLite[];
  onPaperMode: (paper: boolean) => void;
  onArm: (armed: boolean) => void;
  onOpenDrawer: (id: Exclude<DeskDrawerId, null>) => void;
}) {
  const [market, setMarket] = useState<DeskMarket>("WETH/USDC");
  const [interval, setInterval] = useState<ChartInterval>("15m");
  const [manageOpen, setManageOpen] = useState(false);

  const quoteQ = useQuery({
    queryKey: ["market-quote", market],
    queryFn: () => getMarketQuote({ data: { symbol: market } }),
    refetchInterval: 12_000,
    staleTime: 8_000,
  });

  const candlesQ = useQuery({
    queryKey: ["market-candles", market, interval],
    queryFn: () =>
      getMarketCandles({ data: { symbol: market, interval, limit: 96 } }),
    refetchInterval: 20_000,
    staleTime: 15_000,
  });

  const pulseQ = useQuery({
    queryKey: ["market-pulse"],
    queryFn: () => getMarketPulse(),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const open = openTrades[0] ?? null;
  const mark = quoteQ.data?.price ?? open?.mark_price ?? null;

  const stopPct = Number(activeStrategy?.spec?.exit?.stop_pct ?? 2);
  const takePct = Number(activeStrategy?.spec?.exit?.take_profit_pct ?? 4);

  const levels = useMemo(() => {
    if (!open) return null;
    const entry = open.entry;
    const long = open.side.toLowerCase() !== "short";
    return {
      entry,
      stop: long ? entry * (1 - stopPct / 100) : entry * (1 + stopPct / 100),
      target: long ? entry * (1 + takePct / 100) : entry * (1 - takePct / 100),
    };
  }, [open, stopPct, takePct]);

  const openNotional = openTrades.reduce((s, t) => s + Number(t.size), 0);
  const equity = Math.max(usdcBalance, openNotional, 1);
  const exposurePct = (openNotional / equity) * 100;
  const dailyUsedPct = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0;
  const riskDollars = open ? (open.size * stopPct) / 100 : null;

  const quant = useMemo(() => {
    const q = quoteQ.data;
    return deriveQuantView({
      change24hPct: q?.change24hPct ?? 0,
      high24h: q?.high24h ?? q?.price ?? 0,
      low24h: q?.low24h ?? q?.price ?? 0,
      price: q?.price ?? 0,
      volumeQuote: q?.volumeQuote ?? 0,
      armed,
      paper,
      hasOpenPosition: Boolean(open),
      openPnl: open?.pnl ?? 0,
      exposurePct,
      maxRiskPct: Math.max(maxRiskPct, 0.1),
      hasApprovedStrategy,
      backtest: activeStrategy?.backtest,
      pendingSignals,
    });
  }, [
    quoteQ.data,
    armed,
    paper,
    open,
    exposurePct,
    maxRiskPct,
    hasApprovedStrategy,
    activeStrategy?.backtest,
    pendingSignals,
  ]);

  const onPrimary = () => {
    switch (quant.recommendation) {
      case "REVIEW_STRATEGY":
      case "WAIT_FOR_ENTRY":
      case "NO_CLEAR_SETUP":
        onOpenDrawer("strategies");
        break;
      case "REDUCE_EXPOSURE":
        setManageOpen(true);
        break;
      case "MAINTAIN_POSITION":
        onOpenDrawer("history");
        break;
      default: {
        const _exhaustive: never = quant.recommendation;
        return _exhaustive;
      }
    }
  };

  return (
    <div className="space-y-5">
      <DeskHero
        market={market}
        onMarketChange={setMarket}
        quote={quoteQ.data}
        quoteLoading={quoteQ.isLoading}
        armed={armed}
        paper={paper}
        {...(paperBusy != null ? { paperBusy } : {})}
        {...(armBusy != null ? { armBusy } : {})}
        {...(canArm != null ? { canArm } : {})}
        {...(blockReason !== undefined ? { blockReason } : {})}
        dailyLimit={dailyLimit}
        dailyUsed={dailyUsed}
        capitalAtRisk={openNotional}
        onPaperMode={onPaperMode}
        onArm={onArm}
      />

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <MarketCandles
          candles={candlesQ.data?.candles ?? []}
          loading={candlesQ.isFetching}
          interval={interval}
          onIntervalChange={setInterval}
          levels={market === "WETH/USDC" ? levels : null}
        />
        <div className="flex flex-col gap-5">
          <QuantViewCard view={quant} onPrimaryAction={onPrimary} />
          {market === "WETH/USDC" ? (
            <SpotTradeTicket paper={paper} markPrice={mark} />
          ) : (
            <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5 text-[12px] text-muted-foreground">
              Spot Buy/Sell is live for ETH/USDC. {market} is watch-only on this desk.
            </div>
          )}
        </div>
      </div>

      {openTrades.length === 0 ? (
        <PositionCard
          trade={null}
          mark={null}
          stop={null}
          target={null}
          riskDollars={null}
          onManage={() => setManageOpen(true)}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-1">
          {openTrades.length > 1 ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Open inventory · {openTrades.length}/3
            </p>
          ) : null}
          {openTrades.slice(0, 3).map((t) => {
            const long = t.side.toLowerCase() !== "short";
            const tStop = long
              ? t.entry * (1 - stopPct / 100)
              : t.entry * (1 + stopPct / 100);
            const tTarget = long
              ? t.entry * (1 + takePct / 100)
              : t.entry * (1 - takePct / 100);
            return (
              <PositionCard
                key={t.id}
                trade={t}
                mark={t.mark_price ?? mark}
                stop={tStop}
                target={tTarget}
                riskDollars={(t.size * stopPct) / 100}
                onManage={() => setManageOpen(true)}
                onCloseHint={() => {
                  toast.message("Stop / target manage exits", {
                    description: "Disarm to halt new entries. Forced close is not available yet.",
                  });
                  setManageOpen(true);
                }}
              />
            );
          })}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <RiskMeter
          exposurePct={exposurePct}
          maxExposurePct={maxRiskPct}
          dailyUsedPct={dailyUsedPct}
        />
        <ActiveStrategyCard
          name={activeStrategy?.name ?? null}
          timeframe={activeStrategy?.spec?.timeframe ?? null}
          status={activeStrategy?.status ?? null}
          {...(activeStrategy?.backtest != null ? { backtest: activeStrategy.backtest } : {})}
          onView={() => onOpenDrawer("strategies")}
        />
        <MarketPulseStrip rows={pulseQ.data?.rows} loading={pulseQ.isLoading} />
        <OnchainPulse events={whaleEvents} />
      </div>

      <RecentTradesList
        trades={closedTrades}
        onViewAll={() => onOpenDrawer("history")}
      />

      <DeskFooterActions
        onBacktest={() => onOpenDrawer("backtest")}
        onStrategies={() => onOpenDrawer("strategies")}
        onHistory={() => onOpenDrawer("history")}
      />

      <ManagePositionHint
        open={manageOpen}
        onOpenChange={setManageOpen}
        onDisarm={() => onArm(false)}
      />
    </div>
  );
}
