import { Link } from "@tanstack/react-router";
import { Check, Loader2, Pause, Play, Radar, TrendingUp, Waves } from "lucide-react";
import { useState } from "react";

import { Chip, Panel } from "@/components/aura/primitives";
import { MoneyModeToggle } from "@/components/aura/trading/money-mode-toggle";
import type { DeskReadiness } from "@/components/aura/trading/start-checklist";
import { plainDeskBlockReason, simpleTradePhase } from "@/lib/trading/simple-path";
import { cn } from "@/lib/utils";

const STRATEGIES = [
  {
    id: "steady_eth" as const,
    name: "Steady growth",
    blurb: "Follows ETH up slowly. Easiest place to start.",
    risk: "Lower",
    recommend: true,
    Icon: TrendingUp,
  },
  {
    id: "dip_buyer" as const,
    name: "Buy dips",
    blurb: "Waits for a bounce, then rides a short move.",
    risk: "Medium",
    recommend: false,
    Icon: Waves,
  },
  {
    id: "whale_follow" as const,
    name: "Follow big wallets",
    blurb: "Copies large buys on Base when they show up.",
    risk: "Medium",
    recommend: false,
    Icon: Radar,
  },
] as const;

export type SimpleTradePresetId = (typeof STRATEGIES)[number]["id"];

export function SimpleTradePath({
  readiness,
  busyId,
  armBusy,
  paperBusy,
  onPickStrategy,
  onStart,
  onStop,
  onPracticeMode,
  onRealMoney,
}: {
  readiness: DeskReadiness | undefined;
  busyId: string | null;
  armBusy?: boolean | undefined;
  paperBusy?: boolean | undefined;
  onPickStrategy: (presetId: SimpleTradePresetId) => void;
  onStart: () => void;
  onStop: () => void;
  onPracticeMode: () => void;
  onRealMoney: () => void;
}) {
  const [picked, setPicked] = useState<SimpleTradePresetId | null>(null);
  const hasStrategy = Boolean(readiness?.hasApprovedStrategy || readiness?.hasBacktest);
  const funded = Boolean(readiness?.funded);
  const armed = Boolean(readiness?.armed);
  const paper = Boolean(readiness?.paper);
  const usdc = Number(readiness?.usdc ?? 0);
  const phase = simpleTradePhase(readiness);
  const block = plainDeskBlockReason(readiness?.blockReason);
  const settingUp = Boolean(busyId && STRATEGIES.some((s) => s.id === busyId));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap gap-2">
          {[
            { id: "pick" as const, label: "Pick a style", done: hasStrategy },
            { id: "start" as const, label: "Start", done: armed },
          ].map((s, i) => {
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
        {phase !== "pick" ? (
          <MoneyModeToggle
            practice={paper}
            busy={paperBusy}
            onPractice={onPracticeMode}
            onReal={onRealMoney}
          />
        ) : null}
      </div>

      {phase === "done" ? (
        <Panel label="Aura is trading for you" glow>
          <p className="text-[15px] font-semibold tracking-tight">
            {paper ? "Practice is on — no real fills." : "Real money is on."} Aura watches ETH and
            can open small trades inside your daily cap.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Check <span className="text-foreground">Working</span> and{" "}
            <span className="text-foreground">Result</span> above. Tap Stop anytime.
          </p>
          <button
            type="button"
            disabled={armBusy}
            onClick={onStop}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-foreground/10 px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            {armBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
            {armBusy ? "Stopping…" : "Stop trading"}
          </button>
        </Panel>
      ) : (
        <Panel label="How this works" glow>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            Pick a style, then start. Aura buys and sells ETH for you. You can win or lose — this is
            not interest. Practice first if you want to see the moves without spending USDC.
          </p>
        </Panel>
      )}

      <Panel
        label={phase === "pick" ? "1 · Pick a style" : "Your style"}
        glow={phase === "pick"}
      >
        {phase === "pick" ? (
          <p className="mb-4 text-[13px] text-muted-foreground">
            Unsure? Tap <strong className="text-foreground">Steady growth</strong>.
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          {STRATEGIES.map((s) => {
            const selected = picked === s.id || (hasStrategy && !picked && s.id === "steady_eth");
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
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{s.blurb}</p>
                {busy ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" /> Setting up…
                  </p>
                ) : hasStrategy && selected ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-gold">
                    <Check className="h-3 w-3" /> Ready
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </Panel>

      {phase === "start" ? (
        <Panel label="2 · Start" glow>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Ready to deploy:{" "}
                <span className="font-mono font-semibold text-foreground">
                  ${usdc.toFixed(2)} USDC
                </span>
              </p>
              {!funded ? (
                <p className="mt-2 text-[12px] text-gold">
                  Add at least $5 USDC on Wallet, then come back.
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {paper
                    ? "Practice: Aura pretends to trade so you can watch."
                    : "Real money: Aura can spend your USDC on Base inside your cap."}{" "}
                  One tap also allows trading — you can revoke that on Wallet.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!funded ? (
                <Link
                  to="/wallet"
                  className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
                >
                  Open Wallet
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={settingUp || armBusy}
                  onClick={onStart}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {armBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {armBusy ? "Starting…" : paper ? "Start practice" : "Start trading"}
                </button>
              )}
            </div>
          </div>
          {block && !armed ? <p className="mt-3 text-[12px] text-gold">{block}</p> : null}
        </Panel>
      ) : null}
    </div>
  );
}
