import { Chip, Pulse } from "@/components/aura/primitives";
import { cn } from "@/lib/utils";

export function RiskMeter({
  exposurePct,
  maxExposurePct,
  dailyUsedPct,
  maxDailyPct = 100,
}: {
  exposurePct: number;
  maxExposurePct: number;
  dailyUsedPct: number;
  maxDailyPct?: number;
}) {
  const hot = exposurePct > maxExposurePct * 0.75 || dailyUsedPct > 80;
  const safe = !hot && exposurePct < maxExposurePct * 0.5;

  return (
    <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Risk
        </p>
        <Chip tone={safe ? "gold" : hot ? "danger" : "neutral"}>
          <Pulse tone={safe ? "gold" : hot ? "destructive" : "muted"} />
          {safe ? "SAFE" : hot ? "ELEVATED" : "OK"}
        </Chip>
      </div>

      <Bar label="Exposure" value={exposurePct} max={Math.max(maxExposurePct, 0.1)} suffix="%" />
      <p className="mt-1 text-[11px] text-muted-foreground">Max {maxExposurePct.toFixed(1)}%</p>

      <Bar
        label="Daily risk used"
        value={dailyUsedPct}
        max={maxDailyPct}
        suffix="%"
        className="mt-4"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">Vs daily notional cap</p>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  suffix,
  className,
}: {
  label: string;
  value: number;
  max: number;
  suffix: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("mt-4", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="num text-sm font-semibold">
          {value.toFixed(1)}
          {suffix}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/8">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct > 75 ? "bg-destructive" : pct > 45 ? "bg-primary" : "bg-gold",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
