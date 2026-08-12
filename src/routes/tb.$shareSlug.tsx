import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Chip, DataRow, Panel } from "@/components/aura/primitives";
import { Spark } from "@/components/aura/spark";
import { getPublicBacktestShare } from "@/lib/trading/public-backtest.functions";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/tb/$shareSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `Backtest · ${params.shareSlug} — Aura OS` },
      {
        name: "description",
        content: "Shared Quant backtest snapshot from Aura OS Trading Desk.",
      },
      { property: "og:title", content: "Aura OS backtest snapshot" },
      { property: "og:url", content: `${SITE_URL}/tb/${params.shareSlug}` },
    ],
  }),
  component: PublicBacktestShare,
});

function PublicBacktestShare() {
  const { shareSlug } = Route.useParams();
  const q = useQuery({
    queryKey: ["public-backtest", shareSlug],
    queryFn: () => getPublicBacktestShare({ data: { shareSlug } }),
  });

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-muted-foreground">
        Loading snapshot…
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-muted-foreground">
        This backtest share was not found.
      </div>
    );
  }

  const bt = ((q.data.payload as { backtest?: Record<string, unknown> }).backtest ?? {}) as {
    equity?: number[];
    total_return_pct?: number;
    win_rate?: number;
    max_drawdown_pct?: number;
    trade_count?: number;
    profit_factor?: number;
    expectancy_pct?: number;
    honesty_note?: string;
    source?: string;
    trades?: Array<{
      entry: number;
      exit: number;
      pnl_pct: number;
      pnl_usdc: number;
      opened_at: number;
      exit_reason: string;
    }>;
    risk?: {
      approx_loss_per_idea_usdc: number;
      max_notional_usdc: number;
      stop_pct: number;
      worst_sim_drawdown_usdc: number;
    };
    walk_forward?: {
      out_of_sample_return_pct?: number;
      out_of_sample_win_rate?: number;
      out_of_sample_dd_pct?: number;
    };
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div>
        <Chip tone="gold">Shared backtest</Chip>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{q.data.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Snapshot only — not live trading advice. Past proxy results ≠ future fills.
        </p>
      </div>

      <Panel>
        {bt.equity?.length ? <Spark points={bt.equity} tone="gold" /> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <DataRow label="Return" value={`${bt.total_return_pct ?? 0}%`} tone="gold" />
          <DataRow label="Win rate" value={`${bt.win_rate ?? 0}%`} />
          <DataRow label="Max DD" value={`${bt.max_drawdown_pct ?? 0}%`} />
          <DataRow label="Trades" value={bt.trade_count ?? 0} />
          <DataRow label="Profit factor" value={bt.profit_factor ?? "—"} />
          <DataRow label="Expectancy" value={`${bt.expectancy_pct ?? 0}%`} />
        </div>
        {bt.walk_forward ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DataRow
              label="OOS return"
              value={`${bt.walk_forward.out_of_sample_return_pct ?? 0}%`}
              tone="primary"
            />
            <DataRow
              label="OOS win rate"
              value={`${bt.walk_forward.out_of_sample_win_rate ?? 0}%`}
            />
            <DataRow label="OOS max DD" value={`${bt.walk_forward.out_of_sample_dd_pct ?? 0}%`} />
          </div>
        ) : null}
        {bt.risk ? (
          <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
            Risk · ~${bt.risk.approx_loss_per_idea_usdc.toFixed(2)} if a {bt.risk.stop_pct}% stop
            hits · max ${bt.risk.max_notional_usdc} notional · worst sim drawdown $
            {bt.risk.worst_sim_drawdown_usdc.toFixed(2)}.
          </p>
        ) : null}
        {bt.trades && bt.trades.length > 0 ? (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-2xl border border-border/50 text-[12px]">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Opened</th>
                  <th className="px-3 py-2">Entry → exit</th>
                  <th className="px-3 py-2 text-right">PnL</th>
                </tr>
              </thead>
              <tbody>
                {bt.trades.slice(0, 40).map((t, i) => (
                  <tr key={`${t.opened_at}-${i}`} className="border-t border-border/40">
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {new Date(t.opened_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-1.5 num">
                      {t.entry.toFixed(2)} → {t.exit.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right num">
                      {t.pnl_usdc >= 0 ? "+" : ""}
                      {t.pnl_usdc.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="mt-4 text-[12px] text-muted-foreground">
          {bt.honesty_note ?? bt.source ?? "Aura OS Trading Desk"}
        </p>
      </Panel>
    </div>
  );
}
