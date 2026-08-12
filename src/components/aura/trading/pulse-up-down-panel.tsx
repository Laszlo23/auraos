import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import {
  getPulseDeskState,
  placePulseBet,
  topUpPulsePaper,
} from "@/lib/pulse.functions";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

const STAKES = [1, 5, 10, 25] as const;

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function PulseUpDownPanel({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [side, setSide] = useState<"up" | "down" | null>(null);
  const [stake, setStake] = useState<number>(5);
  const [tick, setTick] = useState(0);

  const desk = useQuery({
    queryKey: ["pulse-desk", companyId],
    queryFn: () => getPulseDeskState({ data: { companyId } }),
    refetchInterval: 6_000,
  });

  useEffect(() => {
    let id = 0;
    const start = () => {
      if (id) return;
      id = window.setInterval(() => setTick((t) => t + 1), 250);
    };
    const stop = () => {
      if (!id) return;
      window.clearInterval(id);
      id = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const state = desk.data;
  const msToLock = useMemo(() => {
    if (!state) return 0;
    void tick;
    const locks = new Date(state.round.locksAt).getTime();
    return Math.max(0, locks - Date.now());
  }, [state, tick]);
  const msToClose = useMemo(() => {
    if (!state) return 0;
    void tick;
    const closes = new Date(state.round.closesAt).getTime();
    return Math.max(0, closes - Date.now());
  }, [state, tick]);

  const progress = state
    ? 1 - Math.min(1, Math.max(0, msToClose / (state.roundMs || 180_000)))
    : 0;

  const place = useMutation({
    mutationFn: () => {
      if (!side) throw new Error("Pick UP or DOWN.");
      return placePulseBet({ data: { companyId, side, stakeUsdc: stake } });
    },
    onSuccess: async (res) => {
      toast.success(
        `${res.bet.side === "up" ? "UP" : "DOWN"} · $${res.bet.stakeUsdc} locked for this Pulse`,
      );
      setSide(null);
      await qc.invalidateQueries({ queryKey: ["pulse-desk", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const topUp = useMutation({
    mutationFn: () => topUpPulsePaper({ data: { companyId } }),
    onSuccess: async (res) => {
      toast.success(`Demo bankroll topped to ${currency(res.paperUsdc, 2)}`);
      await qc.invalidateQueries({ queryKey: ["pulse-desk", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delta = state?.deltaPct;
  const goingUp = delta != null && delta >= 0;
  const canBet = Boolean(state?.bettingOpen && !state.myBet && !place.isPending);
  const potential =
    stake * (state?.payoutMult ?? 1.85);

  return (
    <div className="space-y-4">
      <Panel label="Pulse · 3 min" glow>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              ETH up or down
            </p>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              Pick the next move. Lock before the timer hits zero — winners pay{" "}
              <span className="font-semibold text-foreground">
                {state?.payoutMult ?? 1.85}×
              </span>
              . Paper bankroll first so you can play without moving chain funds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip tone="gold">Paper</Chip>
            <Chip tone="primary">WETH/USDC</Chip>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Arena */}
          <div className="relative overflow-hidden rounded-[1.5rem] border border-border/50 bg-gradient-to-br from-foreground/[0.05] via-background to-primary/[0.08] p-5">
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl",
                goingUp ? "bg-primary/20" : "bg-destructive/15",
              )}
            />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Live mark
                </p>
                <p className="num mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {state?.livePrice != null ? (
                    <Counter
                      value={state.livePrice}
                      format={(n) =>
                        n.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 2,
                        })
                      }
                    />
                  ) : (
                    "—"
                  )}
                </p>
                <p
                  className={cn(
                    "mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold",
                    goingUp ? "text-primary" : "text-destructive",
                  )}
                >
                  {goingUp ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {delta == null
                    ? "vs open"
                    : `${delta >= 0 ? "+" : ""}${delta.toFixed(3)}% from open`}
                </p>
                {state?.openPrice != null ? (
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    Open {state.openPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                ) : null}
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-foreground/8 px-3 py-2">
                  <Timer className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-lg font-semibold tabular-nums">
                    {state?.bettingOpen
                      ? formatCountdown(msToLock)
                      : formatCountdown(msToClose)}
                  </span>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {state?.bettingOpen
                    ? "To lock"
                    : state?.myBet?.status === "pending"
                      ? "Settling"
                      : "Next round"}
                </p>
              </div>
            </div>

            <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-gold to-primary"
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>

            {/* UP / DOWN */}
            <div className="relative mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!canBet}
                onClick={() => setSide("up")}
                className={cn(
                  "group relative overflow-hidden rounded-[1.25rem] border px-4 py-5 text-left transition-all disabled:opacity-45",
                  side === "up"
                    ? "border-primary/60 bg-primary/20 shadow-[0_0_40px_-12px_hsl(var(--primary))]"
                    : "border-border/50 bg-foreground/[0.04] hover:border-primary/35 hover:bg-primary/10",
                )}
              >
                <ArrowUp className="h-7 w-7 text-primary" />
                <p className="mt-3 text-lg font-semibold tracking-tight">UP</p>
                <p className="text-[11px] text-muted-foreground">ETH finishes higher</p>
              </button>
              <button
                type="button"
                disabled={!canBet}
                onClick={() => setSide("down")}
                className={cn(
                  "group relative overflow-hidden rounded-[1.25rem] border px-4 py-5 text-left transition-all disabled:opacity-45",
                  side === "down"
                    ? "border-destructive/60 bg-destructive/15 shadow-[0_0_40px_-12px_hsl(var(--destructive))]"
                    : "border-border/50 bg-foreground/[0.04] hover:border-destructive/35 hover:bg-destructive/10",
                )}
              >
                <ArrowDown className="h-7 w-7 text-destructive" />
                <p className="mt-3 text-lg font-semibold tracking-tight">DOWN</p>
                <p className="text-[11px] text-muted-foreground">ETH finishes lower</p>
              </button>
            </div>

            {state?.myBet ? (
              <div className="relative mt-4 rounded-2xl border border-primary/25 bg-primary/[0.08] px-4 py-3">
                <p className="text-[12px] font-semibold text-foreground">
                  You’re on{" "}
                  <span className={state.myBet.side === "up" ? "text-primary" : "text-destructive"}>
                    {state.myBet.side.toUpperCase()}
                  </span>{" "}
                  · {currency(state.myBet.stakeUsdc, 2)}
                  {state.myBet.status === "pending" ? " · waiting for settle" : null}
                  {state.myBet.status === "won"
                    ? ` · won ${currency(state.myBet.payoutUsdc ?? 0, 2)}`
                    : null}
                  {state.myBet.status === "lost" ? " · lost this round" : null}
                  {state.myBet.status === "refunded" ? " · flat — stake returned" : null}
                </p>
              </div>
            ) : null}
          </div>

          {/* Stake ticket */}
          <div className="rounded-[1.5rem] border border-border/50 bg-foreground/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Pulse bankroll
            </p>
            <p className="num mt-1 text-3xl font-semibold text-gold">
              {state ? currency(state.paperUsdc, 2) : "…"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Demo credits · not deducted from your smart wallet yet
            </p>

            <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Stake
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STAKES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!canBet}
                  onClick={() => setStake(s)}
                  className={cn(
                    "rounded-xl px-3 py-2 font-mono text-[12px] font-semibold transition-colors disabled:opacity-40",
                    stake === s
                      ? "bg-primary/18 text-primary"
                      : "bg-foreground/8 text-muted-foreground hover:text-foreground",
                  )}
                >
                  ${s}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-background/60 px-3 py-3 text-[12px] text-muted-foreground">
              <div className="flex justify-between gap-2">
                <span>If you win</span>
                <span className="font-mono font-semibold text-primary">
                  {currency(potential, 2)}
                </span>
              </div>
              <div className="mt-1 flex justify-between gap-2">
                <span>House edge</span>
                <span className="font-mono">~7.5%</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!canBet || !side}
              onClick={() => void place.mutateAsync()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {place.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {side
                ? `Lock ${side.toUpperCase()} · $${stake}`
                : "Pick UP or DOWN"}
            </button>

            {(state?.paperUsdc ?? 100) < 25 ? (
              <button
                type="button"
                disabled={topUp.isPending}
                onClick={() => void topUp.mutateAsync()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
              >
                {topUp.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Top up demo bankroll
              </button>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel label="Last rounds">
          <div className="flex flex-wrap gap-2">
            {(state?.recentRounds ?? []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No settled rounds yet.</p>
            ) : (
              state!.recentRounds.map((r) => (
                <span
                  key={r.id}
                  className={cn(
                    "inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-[11px] font-bold uppercase",
                    r.result === "up" && "bg-primary/16 text-primary",
                    r.result === "down" && "bg-destructive/16 text-destructive",
                    (r.result === "flat" || !r.result) && "bg-foreground/8 text-muted-foreground",
                  )}
                  title={r.closesAt}
                >
                  {r.result === "up" ? "▲" : r.result === "down" ? "▼" : "–"}
                </span>
              ))
            )}
          </div>
        </Panel>

        <Panel label="Your Pulse">
          {(state?.recentBets ?? []).length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No bets yet — lock your first call above.
            </p>
          ) : (
            <div className="space-y-2">
              {state!.recentBets.slice(0, 6).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-foreground/[0.04] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {b.side === "up" ? (
                      <ArrowUp className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span className="text-[12px] font-medium">{b.side.toUpperCase()}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {currency(b.stakeUsdc, 2)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.12em]",
                      b.status === "won" && "text-primary",
                      b.status === "lost" && "text-destructive",
                      b.status === "pending" && "text-gold",
                      (b.status === "refunded" || b.status === "void") && "text-muted-foreground",
                    )}
                  >
                    {b.status === "won" && b.payoutUsdc != null
                      ? `+${currency(b.payoutUsdc, 2)}`
                      : b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
