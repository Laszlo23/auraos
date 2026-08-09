import { Chip } from "@/components/aura/primitives";
import type { MarketPulseRow } from "@/lib/trading/market-data.server";

export function MarketPulseStrip({
  rows,
  loading,
}: {
  rows: MarketPulseRow[] | undefined;
  loading?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Market pulse
      </p>
      {loading && !rows?.length ? (
        <p className="mt-3 text-[12px] text-muted-foreground">Loading…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(rows ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-semibold">{r.label}</span>
              <Chip
                tone={
                  r.mood === "bullish"
                    ? "gold"
                    : r.mood === "bearish"
                      ? "danger"
                      : r.mood === "stable"
                        ? "primary"
                        : "neutral"
                }
              >
                {r.mood === "bullish"
                  ? "Bullish"
                  : r.mood === "bearish"
                    ? "Bearish"
                    : r.mood === "stable"
                      ? "Stable"
                      : "Neutral"}
              </Chip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
