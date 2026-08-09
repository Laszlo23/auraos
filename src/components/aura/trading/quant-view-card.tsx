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
          Quant&apos;s view
        </p>
        <div className="mt-3 flex items-center gap-2">
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
            {view.stance}
          </Chip>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{view.blurb}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-[12px]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Confidence</p>
          <p className="num mt-1 text-lg font-semibold">{view.confidence}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Risk</p>
          <p className="mt-1 text-lg font-semibold">{view.risk}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Regime</p>
          <p className="mt-1 text-lg font-semibold">{view.regime}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setWhy((v) => !v)}
        className="inline-flex items-center gap-1.5 self-start rounded-full bg-foreground/8 px-3 py-1.5 text-[11px] font-semibold"
      >
        Why? {why ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {why ? (
        <div className="space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4 text-[12px]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Quant thinks · {view.stance}
          </p>
          <ul className="space-y-1.5">
            {view.checks.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span className={cn(c.ok ? "text-gold" : c.warn ? "text-destructive" : "text-muted-foreground")}>
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
          Quant recommends
        </p>
        <p className="mt-2 text-lg font-semibold tracking-tight">{view.recommendationTitle}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          {view.recommendationBody}
        </p>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Advisory only — does not auto-execute trades.
        </p>
        {onPrimaryAction ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="mt-3 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            View setup
          </button>
        ) : null}
      </div>
    </div>
  );
}
