import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, QrCode, Users } from "lucide-react";

import { Panel, Shimmer } from "@/components/aura/primitives";
import { getOwnerNachbarCheckinCode } from "@/lib/nachbar.functions";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/kunden")({
  head: () => ({
    meta: [{ title: "Kunden — Aura Lokal" }],
  }),
  component: KundenPage,
});

function KundenPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["owner-nachbar-checkin"],
    queryFn: () => getOwnerNachbarCheckinCode(),
  });

  const code = data?.code || "";
  const deepLink = code ? `${SITE_URL}/nachbar/c/${code}` : "";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Kunden</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Neukunden & Check-in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gäste checken mit Aura Nachbar ein und verdienen Punkte — Google bleibt optional und unbezahlt.
        </p>
      </div>

      <Panel label="Nachbar Check-in QR" glow>
        {isLoading ? <Shimmer className="h-16" /> : null}
        {!isLoading && code ? (
          <>
            <p className="font-mono text-3xl font-semibold tracking-[0.2em]">{code}</p>
            <p className="mt-2 break-all text-xs text-muted-foreground">{deepLink}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Am Tresen zeigen oder als QR drucken. Gäste öffnen den Link und tippen „Los“.
            </p>
            <a
              href={deepLink}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
            >
              <QrCode className="h-4 w-4" /> Check-in Link öffnen
            </a>
          </>
        ) : null}
      </Panel>

      <Panel label="Akquise">
        <p className="text-sm text-muted-foreground">
          Vorlagen für Friseur, Beauty, Gastro und Immobilien. Entwürfe auf Deutsch, Versand erst nach
          deiner Freigabe.
        </p>
        <Link
          to="/akquise"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          <Users className="h-4 w-4" /> Akquise öffnen <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>

      <Panel label="Pipeline">
        <Link
          to="/sales"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
        >
          Sales-Board <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>

      <Panel label="Tipp">
        <p className="text-sm text-muted-foreground">
          Das Boost-Paket <strong className="text-foreground">Neukunden</strong> legt eine
          Akquise-Kampagne an und füllt dein Boost-Guthaben.
        </p>
        <Link to="/boost" className="mt-3 inline-block text-sm font-semibold text-primary">
          Zu Boost →
        </Link>
      </Panel>
    </div>
  );
}
