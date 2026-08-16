import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Circle, Flame, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DailyWheel } from "@/components/aura/wheel";
import { Panel, Shimmer } from "@/components/aura/primitives";
import { useCompany, useUpdateCompany } from "@/hooks/use-aura";
import { useLocale } from "@/hooks/use-locale";
import { useLokalEngagement } from "@/hooks/use-lokal-engagement";
import { createLocalPeerInvite, getLokalHub } from "@/lib/local-seat.functions";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/heute")({
  head: () => ({
    meta: [{ title: "Heute — Aura Local" }],
  }),
  component: HeutePage,
});

function BetriebEditor() {
  const { t } = useLocale();
  const { data: company } = useCompany();
  const update = useUpdateCompany();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");

  useEffect(() => {
    if (!company) return;
    setName(company.name ?? "");
    setCity(company.city ?? "");
    setNiche(company.niche ?? "");
  }, [company]);

  if (!company) return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {t("heute.editBetrieb")}
      </button>
    );
  }

  return (
    <Panel label={t("heute.betrieb")}>
      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("heute.betriebName")}
          aria-label={t("heute.betriebName")}
          className="w-full rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("heute.betriebCity")}
            aria-label={t("heute.betriebCity")}
            className="w-full rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder={t("heute.betriebNiche")}
            aria-label={t("heute.betriebNiche")}
            className="w-full rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={name.trim().length < 2 || update.isPending}
            onClick={async () => {
              try {
                await update.mutateAsync({
                  name: name.trim(),
                  city: city.trim() || null,
                  niche: niche.trim() || null,
                });
                setEditing(false);
                toast.success(t("heute.betriebSaved"));
              } catch (e) {
                toast.error(e instanceof Error ? e.message : t("heute.betriebError"));
              }
            }}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {update.isPending ? "…" : t("heute.betriebSave")}
          </button>
          <button
            type="button"
            onClick={() => {
              setName(company.name ?? "");
              setCity(company.city ?? "");
              setNiche(company.niche ?? "");
              setEditing(false);
            }}
            className="rounded-2xl bg-foreground/8 px-4 py-2 text-sm text-muted-foreground"
          >
            {t("heute.betriebCancel")}
          </button>
        </div>
      </div>
    </Panel>
  );
}

function ActivationChecklist({
  activation,
}: {
  activation: { seat: boolean; google: boolean; invite: boolean; guest: boolean };
}) {
  const { t } = useLocale();
  const steps = [
    { done: activation.seat, label: t("heute.checkSeat"), to: "/boost" as const },
    { done: activation.google, label: t("heute.checkGoogle"), to: "/bewertungen" as const },
    { done: activation.invite, label: t("heute.checkInvite"), to: "/bewertungen" as const },
    { done: activation.guest, label: t("heute.checkGuest"), to: "/kunden" as const },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Panel label={t("heute.checklist", { done: doneCount, total: steps.length })}>
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.label}>
            <Link
              to={s.to}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                s.done
                  ? "text-muted-foreground"
                  : "bg-primary/8 text-foreground hover:bg-primary/12",
              )}
            >
              {s.done ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-gold" />
              )}
              <span className={cn(s.done && "line-through decoration-border")}>{s.label}</span>
              {!s.done ? <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-60" /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function PeerInviteCard() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const peerInvite = useMutation({
    mutationFn: () => createLocalPeerInvite(),
    onSuccess: async (res) => {
      const url = `${SITE_URL}${res.path}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* clipboard may be blocked */
      }
      setCopiedUrl(url);
      toast.success(t("heute.peerCopied"));
      void qc.invalidateQueries({ queryKey: ["lokal-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel label={t("heute.peerTitle")} glow>
      <p className="text-[14px] leading-relaxed text-muted-foreground">{t("heute.peerBlurb")}</p>
      <button
        type="button"
        disabled={peerInvite.isPending}
        onClick={() => peerInvite.mutate()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {peerInvite.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            {t("heute.peerCta")}
          </>
        )}
      </button>
      {copiedUrl ? (
        <p className="mt-3 break-all text-center text-[11px] text-muted-foreground">{copiedUrl}</p>
      ) : null}
    </Panel>
  );
}

function HeutePage() {
  const { t } = useLocale();
  const { streakDays } = useLokalEngagement();
  const hub = useQuery({
    queryKey: ["lokal-hub"],
    queryFn: () => getLokalHub(),
  });

  const data = hub.data;
  const next = data?.nextStep;
  const activation = data?.activation ?? {
    seat: false,
    google: false,
    invite: false,
    guest: false,
  };

  const nextCopy =
    next === "seat"
      ? {
          title: t("heute.seatTitle"),
          body: t("heute.seatBody"),
          to: "/boost" as const,
          cta: t("heute.seatCta"),
        }
      : next === "reviews" || next === "reviews_start"
        ? {
            title: t("heute.reviewsTitle"),
            body: t("heute.reviewsBody"),
            to: "/bewertungen" as const,
            cta: t("heute.reviewsCta"),
          }
        : next === "guests"
          ? {
              title: t("heute.guestsTitle"),
              body: t("heute.guestsBody"),
              to: "/kunden" as const,
              cta: t("heute.guestsCta"),
            }
          : next === "social"
            ? {
                title: t("heute.socialTitle"),
                body: t("heute.socialBody"),
                to: "/social" as const,
                cta: t("heute.socialCta"),
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
          {hub.isPending ? <Shimmer className="h-9 w-48" /> : data?.company.name || "—"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[data?.company.city, data?.company.niche].filter(Boolean).join(" · ") || "·"}
        </p>
        <div className="mt-3">
          <BetriebEditor />
        </div>
        {streakDays > 1 ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold text-gold">
            <Flame className="h-3.5 w-3.5" />
            {t("heute.streak", { days: streakDays })}
          </p>
        ) : null}
      </div>

      <Panel label={t("heute.next")} glow>
        {hub.isPending ? (
          <div className="space-y-3">
            <Shimmer className="h-8 w-56" />
            <Shimmer className="h-16 w-full" />
          </div>
        ) : (
          <>
            <p className="font-display text-2xl font-semibold leading-tight">{nextCopy.title}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {nextCopy.body}
            </p>
            <Link
              to={nextCopy.to}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground"
            >
              {nextCopy.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-center text-[12px] text-muted-foreground">{t("heute.tip")}</p>
          </>
        )}
      </Panel>

      {!hub.isPending ? <ActivationChecklist activation={activation} /> : null}

      {data?.seatPaid ? <PeerInviteCard /> : null}

      <Panel label={t("heute.wheel")}>
        <p className="mb-4 text-[13px] text-muted-foreground">{t("heute.wheelHint")}</p>
        <DailyWheel />
      </Panel>

      {data?.seatPaid ? (
        <p className="text-center text-[12px] text-muted-foreground">{t("heute.expandHint")}</p>
      ) : null}
    </div>
  );
}
