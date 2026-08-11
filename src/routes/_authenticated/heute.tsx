import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { getLokalHub } from "@/lib/local-seat.functions";

export const Route = createFileRoute("/_authenticated/heute")({
  head: () => ({
    meta: [{ title: "Heute — Aura Lokal" }],
  }),
  component: HeutePage,
});

function HeutePage() {
  const { t } = useLocale();
  const hub = useQuery({
    queryKey: ["lokal-hub"],
    queryFn: () => getLokalHub(),
  });

  const data = hub.data;
  const next = data?.nextStep;

  const nextCopy =
    next === "seat"
      ? {
          title: t("heute.seatTitle"),
          body: t("heute.seatBody"),
          to: "/boost" as const,
          cta: t("heute.seatCta"),
        }
      : next === "social"
        ? {
            title: t("heute.socialTitle"),
            body: t("heute.socialBody"),
            to: "/social" as const,
            cta: t("heute.socialCta"),
          }
        : next === "reviews" || next === "reviews_start"
          ? {
              title: t("heute.reviewsTitle"),
              body: t("heute.reviewsBody"),
              to: "/bewertungen" as const,
              cta: t("heute.reviewsCta"),
            }
          : {
              title: t("heute.boostTitle"),
              body: t("heute.boostBody"),
              to: "/boost" as const,
              cta: t("heute.boostCta"),
            };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {t("nav.heute")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {data?.company.name || "—"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[data?.company.city, data?.company.niche].filter(Boolean).join(" · ") || "·"}
        </p>
      </div>

      <Panel label={t("heute.next")} glow>
        <p className="font-display text-2xl font-semibold leading-tight">{nextCopy.title}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{nextCopy.body}</p>
        <Link
          to={nextCopy.to}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground"
        >
          {nextCopy.cta} <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-center text-[12px] text-muted-foreground">{t("heute.tip")}</p>
      </Panel>
    </div>
  );
}
