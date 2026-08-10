import { Link } from "@tanstack/react-router";
import { Check, KeyRound, Loader2, Play, Sparkles, Wallet } from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import { cn } from "@/lib/utils";

export type DeskReadiness = {
  funded: boolean;
  walletReady?: boolean;
  usdc: number;
  eth?: number;
  hasTradeKey: boolean;
  hasApprovedStrategy: boolean;
  hasBacktest: boolean;
  armed: boolean;
  paper?: boolean;
  canArm: boolean;
  blockReason: string | null;
};

type Phase = "strategy" | "key" | "go-live" | "done";

function currentPhase(r: DeskReadiness | undefined): Phase {
  if (!r) return "strategy";
  const hasStrategy = Boolean(r.hasApprovedStrategy || r.hasBacktest);
  if (!hasStrategy) return "strategy";
  if (!r.hasTradeKey) return "key";
  if (!r.armed) return "go-live";
  return "done";
}

/**
 * Single-focus trading onboarding: strategy → Trade session key → fund & arm.
 * Only the active step gets a big CTA so founders are not hunting the page.
 */
export function TradingSetup({
  readiness,
  onIssueKey,
  issuingKey,
  onStartSteadyEth,
  steadyBusy,
  onArm,
  armBusy,
  onEnablePaper,
  paperBusy,
  onReviewBacktest,
}: {
  readiness: DeskReadiness | undefined;
  onIssueKey: () => void;
  issuingKey?: boolean;
  onStartSteadyEth: () => void;
  steadyBusy?: boolean;
  onArm: () => void;
  armBusy?: boolean;
  onEnablePaper?: () => void;
  paperBusy?: boolean;
  onReviewBacktest?: () => void;
}) {
  const r = readiness;
  const phase = currentPhase(r);
  const hasStrategy = Boolean(r?.hasApprovedStrategy || r?.hasBacktest);

  const steps = [
    { id: "strategy" as const, label: "Pick a strategy", done: hasStrategy },
    { id: "key" as const, label: "Trade session key", done: Boolean(r?.hasTradeKey) },
    {
      id: "go-live" as const,
      label: "Fund & arm",
      done: Boolean(r?.armed),
    },
  ];

  return (
    <Panel label="Get Quant ready" glow data-tour="trading-checklist" className="overflow-hidden">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Three steps. Backtest first (see every trade + dollar risk — no money moves). Then grant a{" "}
        <span className="font-semibold text-foreground">Trade session key</span>. Then fund USDC
        (deposit USDC or ETH and convert on Wallet via OKX) and arm — live fills are real Base swaps.
      </p>

      <ol className="mt-5 flex flex-wrap gap-2">
        {steps.map((s, idx) => {
          const active = phase === s.id || (phase === "done" && s.id === "go-live");
          return (
            <li key={s.id}>
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                  s.done
                    ? "bg-gold/16 text-gold"
                    : active
                      ? "bg-primary/16 text-primary"
                      : "bg-foreground/6 text-muted-foreground",
                )}
              >
                {s.done ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="num text-[10px] opacity-70">{idx + 1}</span>
                )}
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {phase === "strategy" ? (
        <div className="mt-6 rounded-2xl border border-gold/25 bg-gold/[0.06] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Chip tone="gold">Step 1 · no wallet needed</Chip>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">
                See a strategy backtest in one tap
              </h3>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                Steady ETH drafts a gentle plan, runs it on real candle history, and shows every
                simulated trade plus how much you could lose per idea. Still practice — no USDC
                moves yet.
              </p>
            </div>
            <Sparkles className="h-8 w-8 shrink-0 text-gold/80" />
          </div>
          <button
            type="button"
            disabled={steadyBusy}
            onClick={onStartSteadyEth}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3.5 text-sm font-semibold text-background disabled:opacity-50 sm:w-auto"
          >
            {steadyBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Steady ETH…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Start with Steady ETH
              </>
            )}
          </button>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Prefer another preset? Scroll to the cards below — same one-tap flow.
          </p>
        </div>
      ) : null}

      {phase === "key" ? (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/[0.07] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Chip tone="primary">Step 2 · required</Chip>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">
                Issue a Trade session key
              </h3>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                This is a <span className="font-semibold text-foreground">permission slip</span> for
                Quant — not your seed phrase. It lets the agent place capped on-chain swaps on Base
                through your smart wallet. You can revoke it anytime on Wallet. Without this key,
                Arm stays locked.
              </p>
            </div>
            <KeyRound className="h-8 w-8 shrink-0 text-primary" />
          </div>
          <ul className="mt-4 space-y-1.5 text-[12px] text-muted-foreground">
            <li>· Spend stays inside your daily USDC cap</li>
            <li>· Only Trade actions — not withdrawals to random addresses</li>
            <li>· Revoke = Quant stops immediately</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={issuingKey}
              onClick={onIssueKey}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {issuingKey ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Issuing key…
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Issue Trade session key
                </>
              )}
            </button>
            {onReviewBacktest ? (
              <button
                type="button"
                onClick={onReviewBacktest}
                className="rounded-2xl bg-foreground/8 px-4 py-3.5 text-sm font-semibold"
              >
                Re-read backtest
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === "go-live" ? (
        <div className="mt-6 rounded-2xl border border-border/60 bg-foreground/[0.03] p-5">
          <Chip tone="gold">Step 3 · on-chain</Chip>
          <h3 className="mt-3 text-lg font-semibold tracking-tight">Fund the wallet, then arm</h3>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            When armed, Quant executes fully on Base — real DEX swaps from your smart wallet. Deposit{" "}
            <span className="font-semibold text-foreground">USDC</span> for size, or deposit{" "}
            <span className="font-semibold text-foreground">ETH</span> and convert to USDC in Wallet
            (OKX). Keep a little ETH for gas unless sponsorship is on. Prefer{" "}
            <span className="font-semibold text-foreground">Paper</span> first if you want simulated
            fills — paper never scores in the arena.
          </p>
          <div className="mt-4 grid gap-2 text-[12px]">
            <p className={cn(r?.funded ? "text-gold" : "text-muted-foreground")}>
              {r?.funded
                ? `✓ Funded · ${r.usdc.toFixed(2)} USDC`
                : (r?.eth ?? 0) >= 0.002
                  ? `○ Have ${(r?.eth ?? 0).toFixed(4)} ETH — convert to USDC on Wallet`
                  : "○ Need at least $5 USDC on Base (or ETH → USDC on Wallet)"}
            </p>
            <p className="text-muted-foreground">
              ○ Keep a small ETH balance for network gas on Base
            </p>
            <p className="text-gold">✓ Trade session key ready</p>
            <p className={cn(r?.hasApprovedStrategy ? "text-gold" : "text-muted-foreground")}>
              {r?.hasApprovedStrategy ? "✓ Strategy approved" : "○ Approve a strategy"}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {!r?.funded ? (
              <Link
                to="/wallet"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground"
              >
                <Wallet className="h-4 w-4" />
                {(r?.eth ?? 0) >= 0.002 ? "Convert ETH on Wallet" : "Open Wallet & deposit"}
              </Link>
            ) : null}
            {onEnablePaper && !r?.paper ? (
              <button
                type="button"
                disabled={paperBusy}
                onClick={onEnablePaper}
                className="rounded-2xl bg-foreground/8 px-4 py-3.5 text-sm font-semibold disabled:opacity-50"
              >
                {paperBusy ? "Switching…" : "Switch to Paper first"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={armBusy || !r?.canArm}
              title={r?.blockReason ?? undefined}
              onClick={onArm}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3.5 text-sm font-semibold text-background disabled:opacity-45"
            >
              {armBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Arm Quant
            </button>
          </div>
          {!r?.canArm && r?.blockReason ? (
            <p className="mt-3 text-[12px] text-gold/90">{r.blockReason}</p>
          ) : null}
        </div>
      ) : null}

      {phase === "done" ? (
        <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/[0.05] p-5">
          <p className="text-sm font-semibold text-gold">Quant is armed</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Caps and Disarm are your kill switch. Revisit the lab anytime to re-check strategies.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {onReviewBacktest ? (
              <button
                type="button"
                onClick={onReviewBacktest}
                className="rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold"
              >
                Open Backtest Lab
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

/** @deprecated Use TradingSetup */
export const StartQuantChecklist = TradingSetup;
