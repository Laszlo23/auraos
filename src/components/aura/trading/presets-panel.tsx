import { Sparkles } from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import { TRADING_PRESETS } from "@/lib/trading/presets";
import { cn } from "@/lib/utils";

export function PresetsPanel({
  busyId,
  onApply,
  recommendId = "steady_eth",
  compact = false,
}: {
  busyId: string | null;
  onApply: (presetId: string) => void;
  recommendId?: string;
  /** When true, only show the recommended preset + a note. */
  compact?: boolean;
}) {
  const list = compact
    ? TRADING_PRESETS.filter((p) => p.id === recommendId)
    : TRADING_PRESETS;
  const shown = list.length ? list : TRADING_PRESETS.slice(0, 1);

  return (
    <Panel label="Pick a strategy" glow data-tour="trading-presets">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        One tap drafts, backtests, and approves. Start with Steady ETH — then read the results
        panel before you grant a Trade key.
      </p>
      <div className={cn("mt-5 grid gap-3", compact ? "md:grid-cols-1" : "md:grid-cols-3")}>
        {shown.map((p) => {
          const recommended = p.id === recommendId;
          return (
            <button
              key={p.id}
              type="button"
              disabled={busyId === p.id}
              onClick={() => onApply(p.id)}
              className={cn(
                "rounded-2xl border p-4 text-left transition disabled:opacity-50",
                recommended
                  ? "border-gold/50 bg-gold/[0.07] hover:border-gold/70"
                  : "border-border/50 bg-foreground/[0.03] hover:border-gold/40 hover:bg-gold/5",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] font-semibold">{p.name}</p>
                <div className="flex items-center gap-1.5">
                  {recommended ? <Chip tone="gold">Start here</Chip> : null}
                  <Chip tone={p.riskLabel === "Low" ? "gold" : "primary"}>{p.riskLabel}</Chip>
                </div>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{p.tagline}</p>
              <span
                className={cn(
                  "mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold",
                  recommended ? "text-gold" : "text-primary",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {busyId === p.id ? "Backtesting…" : recommended ? "Use Steady ETH" : "Use this"}
              </span>
            </button>
          );
        })}
      </div>
      {compact && TRADING_PRESETS.length > 1 ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          More presets unlock after your first backtest.
        </p>
      ) : null}
    </Panel>
  );
}
