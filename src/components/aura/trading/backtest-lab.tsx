import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Check, FlaskConical, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Chip, DataRow, Panel } from "@/components/aura/primitives";
import { Spark } from "@/components/aura/spark";
import {
  BacktestResultsDialog,
  type BacktestSnapshot,
} from "@/components/aura/trading/backtest-results-dialog";
import {
  comparePresetBacktests,
  getExecutionVsBacktest,
  runBacktestLab,
  shareBacktestSnapshot,
} from "@/lib/trading.functions";
import { cn } from "@/lib/utils";

type StrategyLite = {
  id: string;
  name: string;
  status: string;
  backtest?: BacktestSnapshot | null;
};

const LAB_STEPS = [
  { id: "candles", label: "Pull candle history" },
  { id: "sim", label: "Simulate entries & exits" },
  { id: "walk", label: "Walk-forward out-of-sample" },
  { id: "score", label: "Score return, win rate, drawdown" },
] as const;

type LabStepId = (typeof LAB_STEPS)[number]["id"];

export function BacktestLab({
  companyId,
  strategies,
  highlight,
  externalResult,
  onExternalResultConsumed,
  onApproveStrategy,
  approveBusy,
}: {
  companyId: string;
  strategies: StrategyLite[];
  highlight?: boolean;
  externalResult?: { strategyId: string; name: string; backtest: BacktestSnapshot } | null;
  onExternalResultConsumed?: () => void;
  onApproveStrategy?: (strategyId: string) => void;
  approveBusy?: boolean;
}) {
  const qc = useQueryClient();
  const [strategyId, setStrategyId] = useState(strategies[0]?.id ?? "");
  const [mode, setMode] = useState<"recent" | "range">("range");
  const [bars, setBars] = useState(360);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [walkForward, setWalkForward] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<LabStepId | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPayload, setDialogPayload] = useState<{
    name: string;
    strategyId: string;
    backtest: BacktestSnapshot;
  } | null>(null);
  const [compare, setCompare] = useState<
    | {
        id: string;
        name: string;
        oos_return_pct: number;
        oos_dd_pct: number;
        oos_win_rate: number;
        full: { total_return_pct: number; win_rate: number; max_drawdown_pct: number };
      }[]
    | null
  >(null);

  useEffect(() => {
    if (!strategyId && strategies[0]?.id) setStrategyId(strategies[0].id);
  }, [strategies, strategyId]);

  useEffect(() => {
    if (!externalResult) return;
    setStrategyId(externalResult.strategyId);
    setDialogPayload({
      name: externalResult.name,
      strategyId: externalResult.strategyId,
      backtest: externalResult.backtest,
    });
    setDialogOpen(true);
    onExternalResultConsumed?.();
  }, [externalResult, onExternalResultConsumed]);

  const selected = strategies.find((s) => s.id === strategyId) ?? strategies[0];
  const bt = selected?.backtest;
  const hasResult = Boolean(bt?.equity?.length || (bt?.trade_count ?? 0) > 0);

  const execQ = useQuery({
    queryKey: ["exec-vs-bt", companyId, strategyId || "any"],
    queryFn: () =>
      getExecutionVsBacktest({
        data: {
          companyId,
          ...(strategyId ? { strategyId } : {}),
        },
      }),
    enabled: Boolean(companyId),
    staleTime: 20_000,
  });

  const advancePhases = (withWalk: boolean) => {
    const order: LabStepId[] = withWalk
      ? ["candles", "sim", "walk", "score"]
      : ["candles", "sim", "score"];
    let i = 0;
    setPhase(order[0] ?? null);
    const timer = window.setInterval(() => {
      i += 1;
      if (i >= order.length) {
        window.clearInterval(timer);
        return;
      }
      setPhase(order[i] ?? null);
    }, 700);
    return () => window.clearInterval(timer);
  };

  const onLab = async () => {
    if (!selected) return;
    setBusy("lab");
    const stop = advancePhases(walkForward);
    try {
      const fromMs = Date.parse(`${fromDate}T00:00:00.000Z`);
      const toMs = Date.parse(`${toDate}T23:59:59.999Z`);
      if (mode === "range") {
        if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
          throw new Error("Pick a valid from / to date.");
        }
        if (toMs <= fromMs) {
          throw new Error("End date must be after the start date.");
        }
      }
      const res = await runBacktestLab({
        data: {
          companyId,
          strategyId: selected.id,
          walkForward,
          ...(mode === "range"
            ? { fromMs, toMs }
            : { bars }),
        },
      });
      const snapshot: BacktestSnapshot = {
        ...res.full,
        ...(res.walk
          ? {
              walk_forward: {
                train_bars: res.walk.train_bars,
                test_bars: res.walk.test_bars,
                out_of_sample_return_pct: res.walk.out_of_sample.total_return_pct,
                out_of_sample_dd_pct: res.walk.out_of_sample.max_drawdown_pct,
                out_of_sample_win_rate: res.walk.out_of_sample.win_rate,
              },
            }
          : {}),
      };
      setDialogPayload({
        name: res.name,
        strategyId: res.strategyId,
        backtest: snapshot,
      });
      setDialogOpen(true);
      await qc.invalidateQueries({ queryKey: ["table", "trading_strategies"] });
      await qc.invalidateQueries({ queryKey: ["trading-readiness"] });
      await execQ.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lab failed");
    } finally {
      stop();
      setPhase(null);
      setBusy(null);
    }
  };

  const onCompare = async () => {
    setBusy("compare");
    try {
      const res = await comparePresetBacktests({ data: { companyId, bars } });
      setCompare(res.results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    if (!selected) return;
    setBusy("share");
    try {
      const res = await shareBacktestSnapshot({
        data: { companyId, strategyId: selected.id },
      });
      await navigator.clipboard.writeText(res.url);
      toast.success("Share link copied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Share failed");
    } finally {
      setBusy(null);
    }
  };

  const openExisting = () => {
    if (!selected?.backtest) return;
    setDialogPayload({
      name: selected.name,
      strategyId: selected.id,
      backtest: selected.backtest,
    });
    setDialogOpen(true);
  };

  const running = busy === "lab";
  const canApprove =
    Boolean(dialogPayload) &&
    (selected?.status === "backtested" || selected?.status === "draft") &&
    Boolean(dialogPayload?.backtest);

  return (
    <>
      <Panel
        label="Understand the strategy"
        glow
        data-tour="trading-lab"
        className={cn(highlight && "ring-2 ring-gold/40")}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl space-y-2">
            <p className="text-[15px] font-semibold tracking-tight">
              Run a backtest before you arm
            </p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Pick a date window, replay every entry and exit, and see dollar risk before you arm.
              Walk-forward holds out later bars so the score is harder to game.
            </p>
          </div>
          <Chip tone="gold">
            <FlaskConical className="h-3 w-3" /> Backtest Lab
          </Chip>
        </div>

        {strategies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-foreground/[0.02] px-5 py-8 text-center">
            <p className="text-sm font-medium">Pick a preset above first</p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Steady ETH drafts a strategy and runs an initial backtest automatically. You can re-run
              a deeper lab here anytime.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-[1.2fr_auto]">
              <label className="text-[11px] text-muted-foreground">
                Strategy to test
                <select
                  value={selected?.id ?? ""}
                  onChange={(e) => setStrategyId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-foreground/6 px-3 py-2.5 text-sm outline-none"
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2.5 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={walkForward}
                  onChange={(e) => setWalkForward(e.target.checked)}
                />
                Walk-forward
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("range")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold",
                  mode === "range" ? "bg-primary/16 text-primary" : "bg-foreground/6 text-muted-foreground",
                )}
              >
                Date range
              </button>
              <button
                type="button"
                onClick={() => setMode("recent")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold",
                  mode === "recent" ? "bg-primary/16 text-primary" : "bg-foreground/6 text-muted-foreground",
                )}
              >
                Recent bars
              </button>
            </div>

            {mode === "range" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] text-muted-foreground">
                  From
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-foreground/6 px-3 py-2.5 text-sm outline-none"
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  To
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-foreground/6 px-3 py-2.5 text-sm outline-none"
                  />
                </label>
                <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                  Max ~500 candles in one run. Longer windows use the most recent slice inside your
                  dates.
                </p>
              </div>
            ) : (
              <label className="mt-3 block text-[11px] text-muted-foreground sm:max-w-xs">
                History depth (bars)
                <input
                  type="number"
                  min={80}
                  max={500}
                  value={bars}
                  onChange={(e) => setBars(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl bg-foreground/6 px-3 py-2.5 text-sm outline-none"
                />
              </label>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!selected || running}
                onClick={() => void onLab()}
                className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running backtest…
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-4 w-4" />
                    {hasResult ? "Re-run backtest" : "Run backtest"}
                  </>
                )}
              </button>
              {hasResult ? (
                <button
                  type="button"
                  onClick={openExisting}
                  className="rounded-2xl bg-foreground/8 px-4 py-3.5 text-sm font-semibold"
                >
                  Explain last result
                </button>
              ) : null}
            </div>

            {running ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-2xl border border-primary/25 bg-primary/[0.05] p-4"
              >
                <p className="text-[12px] font-semibold text-primary">Backtest in progress</p>
                <ol className="mt-3 space-y-2">
                  {LAB_STEPS.filter((s) => walkForward || s.id !== "walk").map((s) => {
                    const idx = LAB_STEPS.findIndex((x) => x.id === s.id);
                    const cur = phase ? LAB_STEPS.findIndex((x) => x.id === phase) : -1;
                    const done = cur > idx;
                    const active = phase === s.id;
                    return (
                      <li key={s.id} className="flex items-center gap-2 text-[13px]">
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full",
                            done || active ? "bg-primary/20 text-primary" : "bg-foreground/8",
                          )}
                        >
                          {done ? (
                            <Check className="h-3 w-3" />
                          ) : active ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                          )}
                        </span>
                        <span className={cn(active && "font-medium text-foreground")}>{s.label}</span>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Results open in a full breakdown when this finishes — not just a toast.
                </p>
              </motion.div>
            ) : null}

            {hasResult && !running ? (
              <div className="mt-5 space-y-4">
                <div className="h-16">
                  <Spark points={bt?.equity ?? []} tone="gold" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <DataRow label="Return" value={`${bt?.total_return_pct ?? 0}%`} tone="gold" />
                  <DataRow label="Win rate" value={`${bt?.win_rate ?? 0}%`} />
                  <DataRow label="Max DD" value={`${bt?.max_drawdown_pct ?? 0}%`} />
                  <DataRow label="Trades" value={bt?.trade_count ?? 0} />
                  <DataRow label="Profit factor" value={bt?.profit_factor ?? "—"} tone="primary" />
                  <DataRow label="Expectancy" value={`${bt?.expectancy_pct ?? 0}%`} />
                </div>
                {bt?.risk ? (
                  <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] px-4 py-3 text-[12px] leading-relaxed">
                    <span className="font-semibold text-gold">Risk · </span>
                    ~${bt.risk.approx_loss_per_idea_usdc.toFixed(2)} if a stop hits · max $
                    {bt.risk.max_notional_usdc} per swap · worst sim drawdown $
                    {bt.risk.worst_sim_drawdown_usdc.toFixed(2)}. Open the full breakdown for every
                    trade.
                  </div>
                ) : null}
                {bt?.walk_forward ? (
                  <div className="rounded-2xl border border-border/50 bg-foreground/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Out-of-sample ({bt.walk_forward.test_bars ?? "—"} bars)
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <DataRow
                        label="OOS return"
                        value={`${bt.walk_forward.out_of_sample_return_pct ?? 0}%`}
                        tone="gold"
                      />
                      <DataRow
                        label="OOS win rate"
                        value={`${bt.walk_forward.out_of_sample_win_rate ?? 0}%`}
                      />
                      <DataRow
                        label="OOS max DD"
                        value={`${bt.walk_forward.out_of_sample_dd_pct ?? 0}%`}
                      />
                    </div>
                  </div>
                ) : null}
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {bt?.honesty_note ?? bt?.source ?? "Proxy candles"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === "share"}
                    onClick={() => void onShare()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-3 py-2 text-[11px] font-semibold"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share snapshot
                  </button>
                  <button
                    type="button"
                    disabled={busy === "compare"}
                    onClick={() => void onCompare()}
                    className="rounded-2xl bg-foreground/8 px-3 py-2 text-[11px] font-semibold"
                  >
                    {busy === "compare" ? "Comparing…" : "Compare presets"}
                  </button>
                </div>
              </div>
            ) : !running ? (
              <p className="mt-5 text-[13px] text-muted-foreground">
                No lab result on this strategy yet. Hit <span className="font-semibold">Run backtest</span>{" "}
                — we will walk you through the scores when it finishes.
              </p>
            ) : null}
          </>
        )}

        {compare ? (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Preset compare · OOS
            </p>
            {compare.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{row.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Full {row.full.total_return_pct}% · DD {row.full.max_drawdown_pct}%
                  </p>
                </div>
                <div className="text-right text-[12px]">
                  <p className="font-semibold text-gold">OOS {row.oos_return_pct}%</p>
                  <p className="text-muted-foreground">
                    WR {row.oos_win_rate}% · DD {row.oos_dd_pct}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {execQ.data ? (
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-primary">Live vs backtest</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[12px] text-muted-foreground">Backtest</p>
                <p className="mt-1 text-sm">
                  {execQ.data.backtest
                    ? `${execQ.data.backtest.total_return_pct}% · WR ${execQ.data.backtest.win_rate}% · ${execQ.data.backtest.trade_count} trades`
                    : "No backtest yet"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground">Live closed (non-paper)</p>
                <p className="mt-1 text-sm">
                  {execQ.data.live.trade_count
                    ? `$${execQ.data.live.realized_pnl} · WR ${execQ.data.live.win_rate}% · avg ${execQ.data.live.avg_return_pct}% · ${execQ.data.live.trade_count} fills`
                    : "No live fills yet"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">{execQ.data.note}</p>
          </div>
        ) : null}
      </Panel>

      <BacktestResultsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        strategyName={dialogPayload?.name ?? ""}
        backtest={dialogPayload?.backtest ?? null}
        {...(canApprove && dialogPayload?.strategyId === selected?.id
          ? { canApprove: true as const }
          : {})}
        {...(approveBusy ? { approveBusy: true as const } : {})}
        {...(dialogPayload && onApproveStrategy
          ? {
              onApprove: () => {
                onApproveStrategy(dialogPayload.strategyId);
                setDialogOpen(false);
              },
            }
          : {})}
      />
    </>
  );
}
