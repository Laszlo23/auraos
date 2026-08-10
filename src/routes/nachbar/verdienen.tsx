import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Panel, Shimmer } from "@/components/aura/primitives";
import { getNachbarHub } from "@/lib/nachbar.functions";
import { compact, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/nachbar/verdienen")({
  head: () => ({ meta: [{ title: "Verdienen — Aura Nachbar" }] }),
  component: NachbarVerdienenPage,
});

function NachbarVerdienenPage() {
  const { data: hub, isLoading } = useQuery({
    queryKey: ["nachbar-hub"],
    queryFn: () => getNachbarHub(),
  });

  if (isLoading) return <Shimmer className="h-40" />;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Verdienen</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Dein Guthaben</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Punkte aus Check-ins und Freunden. Später: Tausch in USDC (gestaffelt, kein Yield).
        </p>
      </div>

      <Panel label="Saldo" glow>
        <p className="font-display text-5xl font-semibold tracking-tight tabular-nums">
          {compact(hub?.profile.balance ?? 0)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Phase A: Shop-Perks. Phase B: optional USDC — siehe Docs.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 w-full rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold text-muted-foreground"
        >
          Tausche in USDC — bald
        </button>
      </Panel>

      <Panel label="Verlauf">
        {(hub?.ledger?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Buchungen. Checke zuerst ein.</p>
        ) : (
          <ul className="space-y-3">
            {hub!.ledger.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{row.reason}</p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(row.created_at)}</p>
                </div>
                <span
                  className={
                    row.amount >= 0 ? "font-semibold tabular-nums text-primary" : "font-semibold tabular-nums"
                  }
                >
                  {row.amount >= 0 ? "+" : ""}
                  {row.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
