import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Link2 } from "lucide-react";

import { Panel, Pulse } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { getLokalHub } from "@/lib/local-seat.functions";

export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({
    meta: [{ title: "Posten — Aura Local" }],
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
  const ready = connected.length > 0;

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

      <Panel label={t("social.next")} glow>
        {ready ? (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Pulse tone="gold" /> {t("social.connected")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {connected.map((c) => c.provider).join(" · ")}
            </p>
            <Link
              to="/channels"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              {t("social.openDrafts")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/connect"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
            >
              <Link2 className="h-4 w-4" /> {t("social.connect")}
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("social.none")}</p>
            <p className="mt-2 text-[12px] text-muted-foreground">{t("social.connectNote")}</p>
            <Link
              to="/connect"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              <Link2 className="h-4 w-4" /> {t("social.connect")}
            </Link>
          </>
        )}
      </Panel>
    </div>
  );
}
