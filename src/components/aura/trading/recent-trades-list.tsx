import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RecentTradeRow = {
  id: string;
  symbol: string;
  side: string;
  pnl: number;
  entry: number;
  exit: number | null;
  paper?: boolean | null;
};

export function RecentTradesList({
  trades,
  onViewAll,
}: {
  trades: RecentTradeRow[];
  onViewAll?: () => void;
}) {
  const rows = trades.slice(0, 5);

  return (
    <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Recent trades
        </p>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[11px] font-semibold text-primary"
          >
            View all
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground">No closed trades yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/40">
          {rows.map((t) => {
            const sym = t.symbol.replace("/USDC", "").replace("WETH", "ETH");
            const pct = t.entry > 0 && t.exit != null ? ((t.exit - t.entry) / t.entry) * 100 : null;
            const won = t.pnl >= 0;
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-[13px] font-semibold">
                    {sym} · {t.side.toUpperCase()}
                    {t.paper ? " · paper" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "num text-sm font-semibold",
                      won ? "text-gold" : "text-destructive",
                    )}
                  >
                    {won ? "+" : ""}
                    {currency(t.pnl, 2)}
                  </p>
                  {pct != null ? (
                    <p className={cn("num text-[11px]", won ? "text-gold" : "text-destructive")}>
                      {won ? "+" : ""}
                      {pct.toFixed(1)}%
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
