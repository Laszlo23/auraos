import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Chip, Pulse } from "@/components/aura/primitives";
import type { QuantView } from "@/lib/trading/quant-view";
import { cn } from "@/lib/utils";

export function QuantViewCard({
  view,
  onPrimaryAction,
}: {
  view: QuantView;
  onPrimaryAction?: () => void;
}) {
  const [why, setWhy] = useState(false);
  const stanceTone =
    view.stance === "BULLISH" ? "gold" : view.stance === "BEARISH" ? "danger" : "neutral";

  return (
    <div className="flex h-full flex-col gap-4 rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Quant&apos;s read
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone={stanceTone}>
            <Pulse
              tone={
                view.stance === "BULLISH"
                  ? "gold"
                  : view.stance === "BEARISH"
                    ? "destructive"
                    : "muted"
              }
            />
            {view.stanceLabel}
          </Chip>
          <span className="text-[11px] text-muted-foreground">{view.regimeLabel}</span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{view.blurb}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              How sure
            </p>
            <p className="num mt-1 text-lg font-semibold">{view.confidence}%</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Risk feel
            </p>
            <p className="mt-1 text-sm font-semibold">{view.riskLabel}</p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              view.stance === "BULLISH"
                ? "bg-gold"
                : view.stance === "BEARISH"
                  ? "bg-destructive/80"
                  : "bg-primary/70",
            )}
            style={{ width: `${view.confidence}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setWhy((v) => !v)}
        className="inline-flex items-center gap-1.5 self-start rounded-full bg-foreground/8 px-3 py-1.5 text-[11px] font-semibold"
      >
        Why this read?{" "}
        {why ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {why ? (
        <div className="space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4 text-[12px]">
          <ul className="space-y-1.5">
            {view.checks.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    c.ok ? "text-gold" : c.warn ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {c.ok ? "✓" : c.warn ? "⚠" : "·"}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
          <p>
            <span className="font-semibold text-foreground">What I&apos;d do · </span>
            {view.whatIdDo}
          </p>
          <p>
            <span className="font-semibold text-foreground">What would change my view · </span>
            {view.whatWouldChange.join(" or ")}.
          </p>
        </div>
      ) : null}

      <div className="mt-auto rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Suggested next step
        </p>
        <p className="mt-2 text-base font-semibold tracking-tight sm:text-lg">
          {view.recommendationTitle}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          {view.recommendationBody}
        </p>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Autopilot advice only — Buy/Sell ETH below is you trading spot, not leverage.
        </p>
        {onPrimaryAction ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="mt-3 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            {view.actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
