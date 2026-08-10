import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Star, Users, Megaphone, Sparkle } from "lucide-react";

import { Chip, Panel, Pulse } from "@/components/aura/primitives";
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
  const hub = useQuery({
    queryKey: ["lokal-hub"],
    queryFn: () => getLokalHub(),
  });

  const data = hub.data;
  const next = data?.nextStep;

  const nextCopy =
    next === "seat"
      ? {
          title: "Local Seat freischalten",
          body: "99 € einmalig — Code von der Theke einlösen oder mit Karte zahlen.",
          to: "/boost" as const,
          cta: "Seat öffnen",
        }
      : next === "social"
        ? {
            title: "Social verbinden",
            body: "Instagram, Facebook oder andere Kanäle einmal verbinden.",
            to: "/social" as const,
            cta: "Zu Social",
          }
        : next === "reviews" || next === "reviews_start"
          ? {
              title: "Google-Bewertungen",
              body: "Review-Link einfügen und echte Kunden einladen.",
              to: "/bewertungen" as const,
              cta: "Zu Bewertungen",
            }
          : {
              title: "Boost nutzen",
              body: "Sichtbarkeit, Bewertungen oder Neukunden — ein Paket wählen.",
              to: "/boost" as const,
              cta: "Boost öffnen",
            };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Heute</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {data?.company.name || "Dein Betrieb"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[data?.company.city, data?.company.niche].filter(Boolean).join(" · ") ||
            "Lokales Service-Geschäft"}
        </p>
      </div>

      <Panel label="Nächster Schritt" glow>
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
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Boost</p>
          <p className="mt-2 flex items-center gap-1.5 font-display text-2xl font-semibold tabular-nums">
            <Sparkle className="h-4 w-4 text-gold" />
            {compact(data?.boostBalance ?? 0)}
          </p>
        </div>
        <div className="rounded-3xl border border-border/40 bg-card/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Seat</p>
          <p className="mt-2 text-sm font-semibold">
            {data?.seatPaid ? (
              <span className="inline-flex items-center gap-1.5">
                <Pulse tone="gold" /> Aktiv
              </span>
            ) : (
              "Offen"
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {(
          [
            { to: "/social", label: "Social", icon: Megaphone },
            { to: "/kunden", label: "Kunden", icon: Users },
            { to: "/bewertungen", label: "Bewertungen", icon: Star },
          ] as const
        ).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-border/40 bg-card/20 px-4 py-3 text-sm font-semibold",
            )}
          >
            <item.icon className="h-4 w-4 text-primary" />
            {item.label}
            <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {data?.company.local_cohort_number ? (
        <Chip tone="gold">Review Boost #{data.company.local_cohort_number}</Chip>
      ) : null}
    </div>
  );
}
