import { Chip, Pulse } from "@/components/aura/primitives";
import type { BacktestSnapshot } from "@/components/aura/trading/backtest-results-dialog";

export function ActiveStrategyCard({
  name,
  timeframe,
  status,
  backtest,
  onView,
}: {
  name: string | null;
  timeframe?: string | null;
  status?: string | null;
  backtest?: BacktestSnapshot | null;
  onView?: () => void;
}) {
  if (!name) {
    return (
      <div className="rounded-3xl border border-dashed border-border/60 bg-foreground/[0.02] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Active strategy
        </p>
        <p className="mt-3 text-sm font-semibold">None yet</p>
        <p className="mt-1 text-[12px] text-muted-foreground">Pick Steady ETH or draft your own.</p>
        {onView ? (
          <button
            type="button"
            onClick={onView}
            className="mt-4 rounded-2xl bg-foreground/8 px-3 py-2 text-[11px] font-semibold"
          >
            View strategies
          </button>
        ) : null}
      </div>
    );
  }

  const active = status === "approved";

  return (
    <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Active strategy
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-lg font-semibold tracking-tight">{name}</p>
        {timeframe ? <Chip tone="neutral">{timeframe}</Chip> : null}
        <Chip tone={active ? "gold" : "neutral"}>
          {active ? <Pulse tone="gold" /> : null}
          {active ? "ACTIVE" : (status ?? "draft").toUpperCase()}
        </Chip>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
        <Metric label="Win rate" value={`${backtest?.win_rate ?? "—"}%`} />
        <Metric label="Profit factor" value={`${backtest?.profit_factor ?? "—"}`} />
        <Metric label="Max drawdown" value={`${backtest?.max_drawdown_pct ?? "—"}%`} />
        <Metric label="Trades" value={`${backtest?.trade_count ?? "—"}`} />
      </div>

      {onView ? (
        <button
          type="button"
          onClick={onView}
          className="mt-4 rounded-2xl bg-foreground/8 px-3 py-2 text-[11px] font-semibold"
        >
          View strategy
        </button>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="num mt-1 font-semibold">{value}</p>
    </div>
  );
}
