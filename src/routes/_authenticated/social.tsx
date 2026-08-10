import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Link2, Megaphone } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { getLokalHub } from "@/lib/local-seat.functions";

export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({
    meta: [{ title: "Social — Aura Lokal" }],
  }),
  component: SocialPage,
});

function SocialPage() {
  const { t } = useLocale();
  const hub = useQuery({
    queryKey: ["lokal-hub"],
    queryFn: () => getLokalHub(),
  });
  const channels = hub.data?.channels ?? [];
  const connected = channels.filter((c) => c.status === "connected" || c.status === "active");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {t("nav.social")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {t("social.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("social.blurb")}</p>
      </div>

      <Panel label="Status" glow>
        <p className="text-sm text-muted-foreground">
          {connected.length ? connected.map((c) => c.provider).join(" · ") : "—"}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            to="/connect"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Link2 className="h-4 w-4" /> {t("social.connect")}
          </Link>
          <Link
            to="/channels"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
          >
            <Megaphone className="h-4 w-4" /> {t("social.openChannels")}{" "}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Panel>

      <Panel label="Boost">
        <Link to="/boost" className="inline-block text-sm font-semibold text-primary">
          {t("heute.boostCta")} →
        </Link>
      </Panel>
    </div>
  );
}
