import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Check, CircleAlert } from "lucide-react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { LocalCohortSeatsLeft } from "@/components/aura/local-cohort-seats";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import {
  authHrefForLokal,
  captureAttribution,
  rememberFunnel,
  rememberLocale,
} from "@/lib/attribution";
import { LOCAL_DE_NICHES, AURA_REPUTATION_EUR } from "@/lib/boost-packs";
import { LOCAL_COHORT_CAP } from "@/lib/funnels";
import { runReputationAudit } from "@/lib/reputation.functions";
import type { ReputationAuditResult } from "@/lib/reputation-audit";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { t as translate } from "@/lib/i18n";

export const Route = createFileRoute("/lokal_/audit")({
  head: () => ({
    meta: [
      {
        title: "Kostenloser Reputation-Check — Aura Lokal",
      },
      {
        name: "description",
        content:
          "Prüfe in 60 Sekunden, wie bereit dein Betrieb für echte Google-Bewertungen und Kunden-Nachbetreuung ist.",
      },
      { property: "og:title", content: "Kostenloser Reputation-Check — Aura Lokal" },
      { property: "og:url", content: `${SITE_URL}/lokal/audit` },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:locale", content: "de_DE" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/lokal/audit` }],
  }),
  component: LokalAuditPage,
});

function LokalAuditPage() {
  const { locale, setLocale } = useLocale();
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ReputationAuditResult | null>(null);

  useEffect(() => {
    rememberFunnel("local");
    rememberLocale("de");
    setLocale("de");
    captureAttribution();
  }, [setLocale]);

  const run = useMutation({
    mutationFn: () => {
      const data: {
        businessName: string;
        city: string;
        niche?: string;
        googleUrl?: string;
        websiteUrl?: string;
        email?: string;
      } = {
        businessName,
        city,
      };
      if (niche) data.niche = niche;
      if (googleUrl) data.googleUrl = googleUrl;
      if (websiteUrl) data.websiteUrl = websiteUrl;
      if (email) data.email = email;
      return runReputationAudit({ data });
    },
    onSuccess: (res) => setResult(res),
  });

  const ctaHref = authHrefForLokal("signup", locale);

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 10% -8%, oklch(0.58 0.09 195 / 0.28), transparent 58%), radial-gradient(ellipse 55% 40% at 90% 5%, oklch(0.78 0.11 82 / 0.16), transparent 52%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link to="/lokal" className="font-display text-lg font-semibold tracking-tight">
            {SITE_NAME} <span className="text-muted-foreground">Lokal</span>
          </Link>
          <LanguageToggle className="ml-auto" />
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Kostenloser Check
        </p>
        <h1 className="mt-4 font-display text-[clamp(2rem,6vw,3.2rem)] font-semibold leading-[1.02] tracking-tight">
          Wie steht deine Reputation?
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          In unter einer Minute siehst du, was fehlt — ohne Fake-Sterne, ohne Agentur-Blabla. Danach
          kannst du Aura Reputation starten.
        </p>

        {!result ? (
          <form
            className="mt-10 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run.mutate();
            }}
          >
            <label className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Betriebsname
              <input
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                placeholder="z. B. Salon Mira"
              />
            </label>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Stadt
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                placeholder="Wien"
              />
            </label>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Branche
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none"
              >
                <option value="">— optional —</option>
                {LOCAL_DE_NICHES.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Google-Bewertungslink
              <input
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                placeholder="https://g.page/r/…"
              />
            </label>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Website (optional)
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none"
                placeholder="https://"
              />
            </label>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              E-Mail (optional, für Ergebnis-Kopie)
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none"
                placeholder="du@betrieb.de"
              />
            </label>
            {run.isError ? (
              <p className="text-sm text-destructive">
                {(run.error as Error)?.message || "Check fehlgeschlagen — bitte nochmal."}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={run.isPending}
              className="w-full rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {run.isPending ? "Prüfe…" : "Kostenlos prüfen"}
            </button>
          </form>
        ) : (
          <div className="mt-10 space-y-6">
            <div className="rounded-3xl border border-border/50 bg-card/30 p-6">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Score</p>
              <p className="mt-2 font-display text-5xl font-semibold tabular-nums">
                {result.score}
                <span className="ml-2 text-2xl text-muted-foreground">/ 100 · {result.grade}</span>
              </p>
            </div>

            <ul className="space-y-2">
              {result.findings.map((f) => (
                <li
                  key={f.id}
                  className="flex gap-3 rounded-2xl border border-border/40 px-4 py-3 text-sm"
                >
                  {f.ok ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  )}
                  <div>
                    <p
                      className={cn("font-semibold", f.ok ? "text-foreground" : "text-foreground")}
                    >
                      {f.title}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">{f.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-3xl border border-primary/25 bg-primary/8 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Nächste Schritte
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {result.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
              <a
                href={ctaHref}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground"
              >
                Aura Reputation starten · {AURA_REPUTATION_EUR} €/Monat{" "}
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-3 text-center text-[12px] text-muted-foreground">
                Kunden-Nachbetreuung + echte Google-Bewertungen anfragen — keine Fake-Sterne.
              </p>
              <div className="mt-5 border-t border-border/40 pt-4">
                <LocalCohortSeatsLeft
                  compact
                  label={translate("lokal.seatsLeft", "de", { cap: LOCAL_COHORT_CAP })}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setResult(null)}
              className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
            >
              Nochmal prüfen
            </button>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
