import { ArrowRight, FlaskConical, ShieldAlert } from "lucide-react";

import { Chip, DataRow } from "@/components/aura/primitives";
import { Spark } from "@/components/aura/spark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type BacktestTradeSnap = {
  side?: "long";
  entry: number;
  exit: number;
  pnl_pct: number;
  pnl_usdc: number;
  opened_at: number;
  closed_at: number;
  exit_reason: "stop" | "take" | "trail" | "time" | "eod" | string;
};

export type BacktestRiskSnap = {
  risk_pct_equity: number;
  max_notional_usdc: number;
  stop_pct: number;
  take_profit_pct: number;
  starting_equity: number;
  approx_loss_per_idea_usdc: number;
  max_notional_usdc_live: number;
  worst_sim_drawdown_usdc: number;
  fee_bps: number;
};

export type BacktestSnapshot = {
  equity?: number[];
  win_rate?: number;
  total_return_pct?: number;
  max_drawdown_pct?: number;
  trade_count?: number;
  profit_factor?: number;
  expectancy_pct?: number;
  starting_equity?: number;
  ending_equity?: number;
  fee_bps?: number;
  honesty_note?: string;
  source?: string;
  trades?: BacktestTradeSnap[];
  risk?: BacktestRiskSnap;
  window?: {
    from_ms?: number | null;
    to_ms?: number | null;
    bars?: number;
    timeframe?: string;
  };
  walk_forward?: {
    out_of_sample_return_pct?: number;
    out_of_sample_win_rate?: number;
    out_of_sample_dd_pct?: number;
    test_bars?: number;
    train_bars?: number;
  };
};

const EXIT_LABEL: Record<string, string> = {
  stop: "Stop",
  take: "Take profit",
  trail: "Trail",
  time: "Time stop",
  eod: "End of data",
};

function fmtDay(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function plainEnglish(bt: BacktestSnapshot): string {
  const ret = bt.total_return_pct ?? 0;
  const wr = bt.win_rate ?? 0;
  const dd = bt.max_drawdown_pct ?? 0;
  const trades = bt.trade_count ?? 0;
  const tone =
    ret >= 5 && dd <= 15
      ? "This lookback was relatively calm."
      : ret < 0
        ? "This lookback lost money — treat live sizing as optional practice."
        : "Mixed result — caps matter more than the headline return.";
  return `${tone} Across ${trades} simulated trades, return was ${ret}% with a ${wr}% win rate and ${dd}% max drawdown. That is history on a CEX candle proxy — not a guarantee of Base fills.`;
}

function riskEnglish(risk: BacktestRiskSnap): string {
  return `Per idea, if price hits the ${risk.stop_pct}% stop you are sized to lose about $${risk.approx_loss_per_idea_usdc.toFixed(2)} (≈${risk.risk_pct_equity}% of the $${risk.starting_equity.toLocaleString()} sim bank, hard-capped at $${risk.max_notional_usdc} notional). The worst simulated drawdown was $${risk.worst_sim_drawdown_usdc.toFixed(2)}.`;
}

export function BacktestResultsDialog({
  open,
  onOpenChange,
  strategyName,
  backtest,
  onApprove,
  approveBusy,
  canApprove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyName: string;
  backtest: BacktestSnapshot | null;
  onApprove?: () => void;
  approveBusy?: boolean;
  canApprove?: boolean;
}) {
  const bt = backtest;
  if (!bt) return null;

  const oos = bt.walk_forward;
  const trades = bt.trades ?? [];
  const risk = bt.risk;
  const win = bt.window;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-border/60 bg-background sm:rounded-2xl">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <Chip tone="gold">
              <FlaskConical className="h-3 w-3" /> Backtest ready
            </Chip>
          </div>
          <DialogTitle className="text-left text-xl">{strategyName}</DialogTitle>
          <DialogDescription className="text-left text-[13px] leading-relaxed">
            {plainEnglish(bt)}
          </DialogDescription>
        </DialogHeader>

        {win?.from_ms && win?.to_ms ? (
          <p className="text-[11px] text-muted-foreground">
            Window {fmtDay(win.from_ms)} → {fmtDay(win.to_ms)}
            {win.bars != null ? ` · ${win.bars} ${win.timeframe ?? ""} bars` : ""}
          </p>
        ) : null}

        {bt.equity && bt.equity.length > 1 ? (
          <div className="h-20 rounded-2xl bg-foreground/[0.04] px-3 py-2">
            <Spark points={bt.equity} tone="gold" />
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Simulated equity path
            </p>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <DataRow label="Return" value={`${bt.total_return_pct ?? 0}%`} tone="gold" />
          <DataRow label="Win rate" value={`${bt.win_rate ?? 0}%`} />
          <DataRow label="Max drawdown" value={`${bt.max_drawdown_pct ?? 0}%`} />
          <DataRow label="Trades" value={bt.trade_count ?? 0} />
          {bt.profit_factor != null ? (
            <DataRow label="Profit factor" value={bt.profit_factor} tone="primary" />
          ) : null}
          {bt.expectancy_pct != null ? (
            <DataRow label="Expectancy / trade" value={`${bt.expectancy_pct}%`} />
          ) : null}
          {bt.starting_equity != null && bt.ending_equity != null ? (
            <DataRow
              label="Sim bank"
              value={`$${bt.starting_equity.toLocaleString()} → $${Math.round(bt.ending_equity).toLocaleString()}`}
            />
          ) : null}
        </div>

        {risk ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-gold">
                  What you are putting money into
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
                  {riskEnglish(risk)}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <DataRow
                    label="Loss if stop hits"
                    value={`≈$${risk.approx_loss_per_idea_usdc.toFixed(2)}`}
                    tone="gold"
                  />
                  <DataRow label="Max swap size" value={`$${risk.max_notional_usdc}`} />
                  <DataRow
                    label="Stop / take"
                    value={`${risk.stop_pct}% / ${risk.take_profit_pct}%`}
                  />
                  <DataRow label="Sim fee model" value={`${risk.fee_bps} bps round-trip`} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {oos ? (
          <div className="rounded-2xl border border-border/50 bg-foreground/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Walk-forward check · held-out {oos.test_bars ?? "—"} bars
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              Trained on earlier bars, then scored on unseen bars so the number is harder to
              overfit.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <DataRow
                label="OOS return"
                value={`${oos.out_of_sample_return_pct ?? 0}%`}
                tone="gold"
              />
              <DataRow label="OOS win rate" value={`${oos.out_of_sample_win_rate ?? 0}%`} />
              <DataRow label="OOS max DD" value={`${oos.out_of_sample_dd_pct ?? 0}%`} />
            </div>
          </div>
        ) : null}

        {trades.length > 0 ? (
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Simulated trades taken ({trades.length})
            </p>
            <div className="max-h-56 overflow-y-auto rounded-2xl border border-border/50">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-background/95 text-[10px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 font-medium">Opened</th>
                    <th className="px-3 py-2 font-medium">Entry → exit</th>
                    <th className="px-3 py-2 font-medium">Exit</th>
                    <th className="px-3 py-2 font-medium text-right">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => {
                    const won = t.pnl_usdc >= 0;
                    return (
                      <tr key={`${t.opened_at}-${i}`} className="border-t border-border/40">
                        <td className="px-3 py-2 text-muted-foreground">{fmtDay(t.opened_at)}</td>
                        <td className="px-3 py-2 num">
                          {t.entry.toFixed(2)} → {t.exit.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {EXIT_LABEL[t.exit_reason] ?? t.exit_reason}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 text-right num font-semibold",
                            won ? "text-gold" : "text-destructive",
                          )}
                        >
                          {won ? "+" : ""}
                          {t.pnl_usdc.toFixed(2)}{" "}
                          <span className="font-normal text-muted-foreground">
                            ({won ? "+" : ""}
                            {t.pnl_pct.toFixed(2)}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/50 bg-foreground/[0.03] p-4 text-[12px] leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">When you arm — this goes on-chain</p>
          <p className="mt-1.5">
            Live Quant places real Base swaps from your smart wallet (WETH/USDC). You need a little{" "}
            <span className="text-foreground">ETH for gas</span> (or a sponsored wallet path), plus
            USDC for the trade. DEX fees and slippage are separate from this backtest&apos;s flat
            fee model.
          </p>
          <p className="mt-2 text-[11px]">
            {bt.honesty_note ?? bt.source ?? "Proxy candles — not live Base fill history."}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold"
          >
            Keep reviewing
          </button>
          {canApprove && onApprove ? (
            <button
              type="button"
              disabled={approveBusy}
              onClick={onApprove}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl bg-gold/18 px-4 py-2.5 text-xs font-semibold text-gold disabled:opacity-50",
              )}
            >
              {approveBusy ? "Approving…" : "Approve strategy"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              Got it — next is Arm
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
