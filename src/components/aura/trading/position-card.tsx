import { Chip, Pulse } from "@/components/aura/primitives";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PositionCardTrade = {
  id: string;
  symbol: string;
  side: string;
  size: number;
  entry: number;
  pnl: number;
  mark_price?: number | null;
  paper?: boolean | null;
};

export function PositionCard({
  trade,
  mark,
  stop,
  target,
  riskDollars,
  onManage,
  onCloseHint,
}: {
  trade: PositionCardTrade | null;
  mark?: number | null;
  stop?: number | null;
  target?: number | null;
  riskDollars?: number | null;
  onManage?: () => void;
  onCloseHint?: () => void;
}) {
  if (!trade) {
    return (
      <div className="rounded-3xl border border-dashed border-border/60 bg-foreground/[0.02] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Your position
        </p>
        <p className="mt-3 text-lg font-semibold">No open position</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Quant is monitoring for a setup.
        </p>
      </div>
    );
  }

  const current = mark ?? trade.mark_price ?? trade.entry;
  const pnlPct = trade.entry > 0 ? ((current - trade.entry) / trade.entry) * 100 : 0;
  const won = trade.pnl >= 0;

  return (
    <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Your position
          </p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xl font-semibold tracking-tight">
              {trade.side.toUpperCase()} {trade.symbol.replace("/USDC", "").replace("WETH", "ETH")}
            </p>
            <Chip tone="primary">
              <Pulse /> open
            </Chip>
            {trade.paper ? <Chip tone="neutral">paper</Chip> : null}
          </div>
        </div>
        <div className="text-right">
          <p className={cn("num text-2xl font-semibold", won ? "text-gold" : "text-destructive")}>
            {won ? "+" : ""}
            {currency(trade.pnl, 2)}
          </p>
          <p className={cn("num text-sm", won ? "text-gold" : "text-destructive")}>
            {won ? "+" : ""}
            {pnlPct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Entry" value={currency(trade.entry, 2)} />
        <Stat label="Current" value={currency(current, 2)} />
        <Stat label="Size" value={currency(trade.size, 0)} />
        <Stat
          label="Risk"
          value={riskDollars != null ? currency(riskDollars, 2) : "—"}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <Stat label="Stop" value={stop != null ? currency(stop, 2) : "—"} tone="danger" />
        <Stat label="Target" value={target != null ? currency(target, 2) : "—"} tone="gold" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {onManage ? (
          <button
            type="button"
            onClick={onManage}
            className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Manage position
          </button>
        ) : null}
        {onCloseHint ? (
          <button
            type="button"
            onClick={onCloseHint}
            className="rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold"
          >
            Close
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Exits run via stop / target. Disarm halts new entries — no forced market close API.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gold" | "danger";
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num mt-1 text-sm font-semibold",
          tone === "gold" && "text-gold",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}
