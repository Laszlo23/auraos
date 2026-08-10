import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, QrCode, Radar, Users } from "lucide-react";

import { Panel, Shimmer } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { useCompany } from "@/hooks/use-aura";
import { getOwnerNachbarCheckinCode } from "@/lib/nachbar.functions";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/kunden")({
  head: () => ({
    meta: [{ title: "Kunden — Aura Lokal" }],
  }),
  component: KundenPage,
});

function KundenPage() {
  const { t } = useLocale();
  const { data: company } = useCompany();
  const { data, isLoading } = useQuery({
    queryKey: ["owner-nachbar-checkin"],
    queryFn: () => getOwnerNachbarCheckinCode(),
  });

  const code = data?.code || "";
  const deepLink = code ? `${SITE_URL}/nachbar/c/${code}` : "";
  const region = company?.city || undefined;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {t("kunden.eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {t("kunden.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("kunden.blurb")}</p>
      </div>

      <Panel label={t("kunden.leadHunter")} glow>
        <p className="text-sm text-muted-foreground">
          {t("kunden.leadHunterBlurb", {
            region: region ? ` · ${region}` : "",
          })}
        </p>
        <Link
          to="/akquise"
          search={{ autostart: true, ...(region ? { region } : {}) }}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          <Radar className="h-4 w-4" /> {t("kunden.huntNow")}{" "}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>

      <Panel label="Nachbar Check-in QR">
        {isLoading ? <Shimmer className="h-16" /> : null}
        {!isLoading && code ? (
          <>
            <p className="font-mono text-3xl font-semibold tracking-[0.2em]">{code}</p>
            <p className="mt-2 break-all text-xs text-muted-foreground">{deepLink}</p>
            <a
              href={deepLink}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
            >
              <QrCode className="h-4 w-4" /> Check-in
            </a>
          </>
        ) : null}
      </Panel>

      <Panel label="Akquise">
        <Link
          to="/akquise"
          search={{ autostart: true }}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
        >
          <Users className="h-4 w-4" /> {t("kunden.huntNow")}{" "}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>
    </div>
  );
}
