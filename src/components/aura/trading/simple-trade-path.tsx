import { Link } from "@tanstack/react-router";
import {
  Check,
  KeyRound,
  Loader2,
  Play,
  Radar,
  TrendingUp,
  Waves,
} from "lucide-react";
import { useState } from "react";

import { Chip, Panel } from "@/components/aura/primitives";
import type { DeskReadiness } from "@/components/aura/trading/start-checklist";
import { cn } from "@/lib/utils";

const STRATEGIES = [
  {
    id: "steady_eth" as const,
    name: "Steady growth",
    blurb: "Slow ETH trend follow — easiest place to start.",
    how: "Buys when trend turns up, sells on stop or take-profit.",
    risk: "Lower",
    recommend: true,
    Icon: TrendingUp,
  },
  {
    id: "dip_buyer" as const,
    name: "Buy dips",
    blurb: "Enters after strength — medium pace.",
    how: "Looks for breakouts, then rides the move with capped risk.",
    risk: "Medium",
    recommend: false,
    Icon: Waves,
  },
  {
    id: "whale_follow" as const,
    name: "Follow smart money",
    blurb: "Copy large Base wallet inflows — hands-off.",
    how: "When big wallets buy, your strategy can follow.",
    risk: "Medium",
    recommend: false,
    Icon: Radar,
  },
] as const;

export type SimpleTradePresetId = (typeof STRATEGIES)[number]["id"];

type Phase = "strategy" | "key" | "start" | "done";

function phaseOf(r: DeskReadiness | undefined): Phase {
  if (!r) return "strategy";
  const hasStrategy = Boolean(r.hasApprovedStrategy || r.hasBacktest);
  if (!hasStrategy) return "strategy";
  if (!r.hasTradeKey) return "key";
  if (!r.armed) return "start";
  return "done";
}

export function SimpleTradePath({
  readiness,
  busyId,
  issuingKey,
  armBusy,
  paperBusy,
  onPickStrategy,
  onIssueKey,
  onStart,
  onPracticeMode,
  onRealMoney,
}: {
  readiness: DeskReadiness | undefined;
  busyId: string | null;
  issuingKey?: boolean | undefined;
  armBusy?: boolean | undefined;
  paperBusy?: boolean | undefined;
  onPickStrategy: (presetId: SimpleTradePresetId) => void;
  onIssueKey: () => void;
  onStart: () => void;
  onPracticeMode: () => void;
  onRealMoney: () => void;
}) {
  const [picked, setPicked] = useState<SimpleTradePresetId | null>(null);
  const hasStrategy = Boolean(readiness?.hasApprovedStrategy || readiness?.hasBacktest);
  const hasKey = Boolean(readiness?.hasTradeKey);
  const funded = Boolean(readiness?.funded);
  const armed = Boolean(readiness?.armed);
  const paper = Boolean(readiness?.paper);
  const usdc = Number(readiness?.usdc ?? 0);
  const phase = phaseOf(readiness);

  const steps = [
    { id: "strategy" as const, label: "Strategy", done: hasStrategy },
    { id: "key" as const, label: "Allow", done: hasKey },
    { id: "start" as const, label: "Start", done: armed },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap gap-2">
          {steps.map((s, i) => {
            const active = phase === s.id || (phase === "done" && s.id === "start");
            return (
              <li
                key={s.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                  s.done
                    ? "bg-gold/16 text-gold"
                    : active
                      ? "bg-primary/16 text-primary"
                      : "bg-foreground/6 text-muted-foreground",
                )}
              >
                {s.done ? <Check className="h-3 w-3" /> : <span className="opacity-70">{i + 1}</span>}
                {s.label}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={paperBusy || paper}
            onClick={onPracticeMode}
            className={cn(
              "rounded-2xl px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50",
              paper ? "bg-gold/16 text-gold" : "bg-foreground/6 text-muted-foreground",
            )}
          >
            Practice
          </button>
          <button
            type="button"
            disabled={paperBusy || !paper}
            onClick={onRealMoney}
            className={cn(
              "rounded-2xl px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50",
              !paper ? "bg-primary/14 text-primary" : "bg-foreground/6 text-muted-foreground",
            )}
          >
            Real money
          </button>
        </div>
      </div>

      {phase === "done" ? (
        <Panel label="Money is working" glow>
          <p className="text-[15px] font-semibold tracking-tight">
            Your strategy is live{paper ? " in practice mode" : ""}.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Aura watches the market and can open small trades inside your caps. Check{" "}
            <span className="text-foreground">In trading</span> and{" "}
            <span className="text-foreground">Result so far</span> above for progress.
          </p>
          <p className="mt-4 text-[12px] text-muted-foreground">
            Want a different strategy? Tap a card below to switch.
          </p>
        </Panel>
      ) : (
        <Panel label="How this grows your money" glow>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            You pick a strategy → allow trading → start. Aura then opens and closes trades. Your
            return is trade profit or loss — not interest.
          </p>
        </Panel>
      )}

      {(phase === "strategy" || phase === "done" || hasStrategy) && (
        <Panel
          label={phase === "strategy" ? "1 · Pick a strategy (do this now)" : "Strategy"}
          glow={phase === "strategy"}
        >
          {phase === "strategy" ? (
            <p className="mb-4 text-[13px] text-muted-foreground">
              Start with <strong className="text-foreground">Steady growth</strong> if you’re unsure.
            </p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            {STRATEGIES.map((s) => {
              const selected =
                picked === s.id || (hasStrategy && !picked && s.id === "steady_eth");
              const busy = busyId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => {
                    setPicked(s.id);
                    onPickStrategy(s.id);
                  }}
                  className={cn(
                    "rounded-3xl border p-4 text-left transition-colors disabled:opacity-50",
                    selected
                      ? "border-primary/40 bg-primary/[0.08]"
                      : "border-border/50 bg-foreground/[0.03] hover:border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <s.Icon className="h-5 w-5 text-primary" />
                    <div className="flex flex-wrap gap-1">
                      {s.recommend ? <Chip tone="gold">Start here</Chip> : null}
                      <Chip tone={s.risk === "Lower" ? "gold" : "neutral"}>{s.risk}</Chip>
                    </div>
                  </div>
                  <p className="mt-3 text-[15px] font-semibold tracking-tight">{s.name}</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                    {s.blurb}
                  </p>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/90">{s.how}</p>
                  {busy ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" /> Setting up…
                    </p>
                  ) : hasStrategy && (picked === s.id || (!picked && s.id === "steady_eth")) ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-gold">
                      <Check className="h-3 w-3" /> Ready
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      {phase === "key" ? (
        <Panel label="2 · Allow trading (do this now)" glow>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            One tap issues a temporary trade key — not your seed phrase. Aura can only trade inside
            your daily cap. Revoke anytime on Wallet.
          </p>
          <button
            type="button"
            disabled={issuingKey}
            onClick={onIssueKey}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {issuingKey ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            {issuingKey ? "Allowing…" : "Allow trading"}
          </button>
        </Panel>
      ) : null}

      {phase === "start" ? (
        <Panel label="3 · Start working (do this now)" glow>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Available:{" "}
                <span className="font-mono font-semibold text-foreground">
                  ${usdc.toFixed(2)} USDC
                </span>
              </p>
              {!funded ? (
                <p className="mt-2 text-[12px] text-gold">
                  Add USDC on Wallet first, then come back and start.
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  When you start, Aura can open trades with your USDC
                  {paper ? " (practice — no real fills)" : ""}.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!funded ? (
                <Link
                  to="/wallet"
                  className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
                >
                  Go to Wallet
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={!readiness?.canArm || armBusy}
                  onClick={onStart}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {armBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {armBusy ? "Starting…" : "Start working my money"}
                </button>
              )}
            </div>
          </div>
          {readiness?.blockReason && !armed ? (
            <p className="mt-3 text-[12px] text-gold">{readiness.blockReason}</p>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
