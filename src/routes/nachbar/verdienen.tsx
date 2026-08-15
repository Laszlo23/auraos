import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Panel, Shimmer } from "@/components/aura/primitives";
import { getNachbarHub } from "@/lib/nachbar.functions";
import { nachbarHead } from "@/lib/nachbar-seo";
import { AURA_OFFICIAL_CA_SOURCES, auraCaLive } from "@/lib/aura-token";
import { compact, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/nachbar/verdienen")({
  ssr: false,
  head: () =>
    nachbarHead({
      title: "Verdienen — Aura Nachbar",
      description:
        "Nachbar-Punkte aus echten Besuchen. AURA bleibt reserviert, bis ein Contract live ist. Keine Fake-Sterne.",
      path: "/nachbar/verdienen",
      index: false,
    }),
  component: NachbarVerdienenPage,
});

function NachbarVerdienenPage() {
  const { data: hub, isLoading } = useQuery({
    queryKey: ["nachbar-hub"],
    queryFn: () => getNachbarHub(),
  });

  if (isLoading) return <Shimmer className="h-40" />;

  const reserved = hub?.progress.aura_weight ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Verdienen
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Dein Guthaben</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Punkte aus bestätigten Besuchen und Missionen. AURA erst, wenn der offizielle CA live ist.
        </p>
      </div>

      <Panel label="Saldo" glow>
        <p className="font-display text-5xl font-semibold tracking-tight tabular-nums">
          {compact(hub?.profile.balance ?? 0)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Nachbar-Punkte · kein Google-Deal</p>
        <button
          type="button"
          disabled
          className="mt-4 w-full rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold text-muted-foreground"
        >
          Tausche in USDC — bald
        </button>
      </Panel>

      <Panel label="AURA reserved">
        <p className="font-display text-4xl font-semibold tabular-nums">{reserved}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {auraCaLive()
            ? "Claim öffnet, sobald der Button hier steht."
            : "In-app Reservation aus echten Besuchen. Claim, wenn der CA auf aibusiness.fun und @buildingcultu3 steht — nicht vorher."}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {AURA_OFFICIAL_CA_SOURCES[0]}
        </p>
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
                    row.amount >= 0
                      ? "font-semibold tabular-nums text-primary"
                      : "font-semibold tabular-nums"
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
