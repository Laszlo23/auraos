import { Link } from "@tanstack/react-router";
import { Check, Circle, Loader2 } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { cn } from "@/lib/utils";

export type DeskReadiness = {
  funded: boolean;
  walletReady?: boolean;
  usdc: number;
  hasTradeKey: boolean;
  hasApprovedStrategy: boolean;
  hasBacktest: boolean;
  armed: boolean;
  canArm: boolean;
  blockReason: string | null;
};

type StepAction = {
  label: string;
  to?: string;
  onClick?: () => void;
  busy?: boolean;
};

type Step = {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  action?: StepAction;
};

export function StartQuantChecklist({
  readiness,
  onIssueKey,
  issuingKey,
}: {
  readiness: DeskReadiness | undefined;
  onIssueKey: () => void;
  issuingKey?: boolean;
}) {
  const r = readiness;
  const steps: Step[] = [
    {
      key: "fund",
      label: "Fund smart wallet",
      hint: r?.funded
        ? `${r.usdc.toFixed(2)} USDC ready`
        : "Deposit USDC on Base — this is Quant’s working capital",
      done: Boolean(r?.funded),
      ...(r?.funded
        ? {}
        : { action: { label: "Open Wallet", to: "/wallet" } satisfies StepAction }),
    },
    {
      key: "key",
      label: "Issue Trade session key",
      hint: "Lets Quant swap inside your caps — you can revoke anytime",
      done: Boolean(r?.hasTradeKey),
      ...(r?.hasTradeKey
        ? {}
        : {
            action: {
              label: issuingKey ? "Issuing…" : "Issue Trade key",
              onClick: onIssueKey,
              ...(issuingKey ? { busy: true } : {}),
            } satisfies StepAction,
          }),
    },
    {
      key: "preset",
      label: "Pick a safe preset",
      hint: "No trading plan needed — Steady ETH is the default",
      done: Boolean(r?.hasApprovedStrategy),
    },
    {
      key: "backtest",
      label: "Review the backtest",
      hint: "See return, win rate, and max drawdown in plain numbers",
      done: Boolean(r?.hasBacktest || r?.hasApprovedStrategy),
    },
    {
      key: "arm",
      label: "Arm the desk",
      hint: r?.canArm
        ? "Caps are on — Disarm is always one click away"
        : (r?.blockReason ?? "Finish the steps above first"),
      done: Boolean(r?.armed),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Panel label="Start Quant" glow data-tour="trading-checklist">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Five clear steps. Markets can lose money — your daily USDC cap and Disarm are the kill
        switch.
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/8">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {doneCount} / {steps.length} ready
      </p>
      <ol className="mt-5 space-y-3">
        {steps.map((s, idx) => (
          <li key={s.key} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                s.done ? "bg-gold/20 text-gold" : "bg-foreground/8 text-muted-foreground",
              )}
            >
              {s.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">
                <span className="mr-2 text-[10px] text-muted-foreground">{idx + 1}.</span>
                {s.label}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{s.hint}</p>
              {s.action && (
                <div className="mt-2">
                  {s.action.to ? (
                    <Link
                      to={s.action.to}
                      className="inline-flex rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold text-primary"
                    >
                      {s.action.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={s.action.busy}
                      onClick={s.action.onClick}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gold/16 px-3 py-1.5 text-[11px] font-semibold text-gold disabled:opacity-50"
                    >
                      {s.action.busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {s.action.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
