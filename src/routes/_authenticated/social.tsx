import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Link2, Megaphone } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { getLokalHub } from "@/lib/local-seat.functions";

export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({
    meta: [{ title: "Social — Aura Lokal" }],
  }),
  component: SocialPage,
});

function SocialPage() {
  const hub = useQuery({
    queryKey: ["lokal-hub"],
    queryFn: () => getLokalHub(),
  });
  const channels = hub.data?.channels ?? [];
  const connected = channels.filter((c) => c.status === "connected" || c.status === "active");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Social</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Kanäle & Posts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verbinden, Entwürfe freigeben, sichtbar bleiben — ohne Agentur-Overhead.
        </p>
      </div>

      <Panel label="Status" glow>
        <p className="text-sm text-muted-foreground">
          Verbunden:{" "}
          {connected.length ? connected.map((c) => c.provider).join(" · ") : "noch nichts"}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            to="/connect"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Link2 className="h-4 w-4" /> Konten verbinden
          </Link>
          <Link
            to="/channels"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
          >
            <Megaphone className="h-4 w-4" /> Channels öffnen <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Panel>

      <Panel label="Tipp">
        <p className="text-sm text-muted-foreground">
          Mit dem Boost-Paket <strong className="text-foreground">Sichtbarkeit</strong> startest du
          einen Wochenplan für 3 Posts — Entwürfe entstehen auf Deutsch, du gibst frei.
        </p>
        <Link to="/boost" className="mt-3 inline-block text-sm font-semibold text-primary">
          Zu Boost →
        </Link>
      </Panel>
    </div>
  );
}
