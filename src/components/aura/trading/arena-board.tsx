import { Trophy } from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ArenaEntry = {
  rank: number | null;
  company_name: string | null;
  company_id: string;
  realized_pnl: number;
  trade_count: number;
  score: number;
  max_drawdown_pct: number;
  isYou: boolean;
};

export function ArenaBoard({
  season,
  entries,
  you,
}: {
  season: {
    name: string;
    ends_at: string;
    prize_pool_aura: number;
  } | null;
  entries: ArenaEntry[];
  you: ArenaEntry | null;
}) {
  return (
    <Panel label="Weekly Trading Arena" data-tour="trading-arena">
      {!season ? (
        <p className="text-[13px] text-muted-foreground">
          Season starts when desks close their first real trades this week. Ranked on{" "}
          <span className="text-foreground">realized PnL</span> with a drawdown penalty — open
          positions do not count.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="gold">
              <Trophy className="mr-1 inline h-3 w-3" />
              {season.name}
            </Chip>
            <Chip tone="primary">{season.prize_pool_aura.toLocaleString()} AURA pool</Chip>
            <span className="text-[11px] text-muted-foreground">
              Ends {new Date(season.ends_at).toLocaleString(undefined, { dateStyle: "medium" })}
            </span>
          </div>
          {you && (
            <p className="mt-3 text-[13px]">
              Your rank <span className="num font-semibold text-gold">#{you.rank ?? "—"}</span>
              {" · "}
              score <span className="num">{you.score.toFixed(1)}</span>
              {" · "}
              realized <span className="num text-gold">{currency(you.realized_pnl)}</span>
            </p>
          )}
          <div className="mt-4 space-y-2">
            {entries.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Be first this week — close a trade to appear on the board.
              </p>
            ) : (
              entries.slice(0, 10).map((e) => (
                <div
                  key={e.company_id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                    e.isYou ? "bg-gold/10" : "bg-foreground/[0.03]",
                  )}
                >
                  <span className="num w-6 text-[12px] text-muted-foreground">{e.rank ?? "—"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">
                      {e.company_name || "Desk"}
                      {e.isYou ? " (you)" : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {e.trade_count} closed · max DD {e.max_drawdown_pct}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-[13px] font-semibold text-gold">
                      {currency(e.realized_pnl)}
                    </p>
                    <p className="num text-[10px] text-muted-foreground">{e.score.toFixed(1)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
