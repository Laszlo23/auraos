import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Star, Users, Megaphone, Sparkle } from "lucide-react";

import { Chip, Panel, Pulse } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { getLokalHub } from "@/lib/local-seat.functions";
import { compact } from "@/lib/format";
import { cn } from "@/lib/utils";

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
    <div className="space-y-5">
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
        <p className="font-display text-xl font-semibold">{nextCopy.title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{nextCopy.body}</p>
        <Link
          to={nextCopy.to}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
        >
          {nextCopy.cta} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border/40 bg-card/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {t("common.boost")}
          </p>
          <p className="mt-2 flex items-center gap-1.5 font-display text-2xl font-semibold tabular-nums">
            <Sparkle className="h-4 w-4 text-gold" />
            {compact(data?.boostBalance ?? 0)}
          </p>
        </div>
        <div className="rounded-3xl border border-border/40 bg-card/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {t("common.seat")}
          </p>
          <p className="mt-2 text-sm font-semibold">
            {data?.seatPaid ? (
              <span className="inline-flex items-center gap-1.5">
                <Pulse tone="gold" /> {t("heute.seatActive")}
              </span>
            ) : (
              t("heute.seatOpen")
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {(
          [
            ["/social", Megaphone, t("nav.social")],
            ["/kunden", Users, t("nav.kunden")],
            ["/bewertungen", Star, t("nav.bewertungen")],
          ] as const
        ).map(([to, Icon, label]) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-border/40 bg-card/20 px-4 py-3 text-sm font-semibold",
            )}
          >
            <Icon className="h-4 w-4 text-primary" />
            {label}
            <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
        <Link
          to="/akquise"
          search={{ autostart: true }}
          className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold"
        >
          <Users className="h-4 w-4 text-primary" />
          {t("heute.huntCta")}
          <Chip className="ml-auto text-[10px]">Run</Chip>
        </Link>
      </div>
    </div>
  );
}
