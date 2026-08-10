import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users } from "lucide-react";

import { Panel } from "@/components/aura/primitives";

export const Route = createFileRoute("/_authenticated/kunden")({
  head: () => ({
    meta: [{ title: "Kunden — Aura Lokal" }],
  }),
  component: KundenPage,
});

function KundenPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Kunden</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Neukunden & Outreach
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lokale Leads finden und Anschreiben vorbereiten — du bleibst Absender.
        </p>
      </div>

      <Panel label="Akquise" glow>
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
