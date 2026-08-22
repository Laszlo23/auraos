import { cn } from "@/lib/utils";

export function NachbarNotePips({
  avg,
  count,
  className,
}: {
  avg: number | null;
  count: number;
  className?: string;
}) {
  const filled = avg == null ? 0 : Math.round(avg);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="inline-flex gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 w-1.5 rotate-45", i < filled ? "bg-gold" : "bg-foreground/15")}
          />
        ))}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {avg == null || count === 0
          ? "Noch keine Nachbar-Note"
          : `${avg.toFixed(1)} · ${count} ${count === 1 ? "Nachbar" : "Nachbarn"}`}
      </span>
    </div>
  );
}

export function NachbarRatePad({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick: (score: number) => void;
}) {
  return (
    <div className="mt-3 flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onPick(n)}
          className="grid h-11 flex-1 place-items-center rounded-2xl border border-border/50 bg-foreground/5 text-sm font-semibold tabular-nums transition-colors hover:border-gold/50 hover:bg-gold/10 disabled:opacity-40"
        >
          {n}
        </button>
      ))}
    </div>
  );
}
