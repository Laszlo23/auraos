import { Sparkles } from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import { TRADING_PRESETS } from "@/lib/trading/presets";
import { cn } from "@/lib/utils";

export function PresetsPanel({
  busyId,
  onApply,
}: {
  busyId: string | null;
  onApply: (presetId: string) => void;
}) {
  return (
    <Panel label="Set & forget presets" glow data-tour="trading-presets">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        No trading plan? Pick one. Quant drafts, backtests on real candles, and approves it for you
        — then you arm the desk.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {TRADING_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busyId === p.id}
            onClick={() => onApply(p.id)}
            className={cn(
              "rounded-2xl border border-border/50 bg-foreground/[0.03] p-4 text-left transition hover:border-gold/40 hover:bg-gold/5 disabled:opacity-50",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold">{p.name}</p>
              <Chip tone={p.riskLabel === "Low" ? "gold" : "primary"}>{p.riskLabel}</Chip>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{p.tagline}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              {busyId === p.id ? "Setting up…" : "Use this"}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
