import { createFileRoute, Link } from "@tanstack/react-router";
import { useLayoutEffect, useState } from "react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { LocalCohortSeatsLeft } from "@/components/aura/local-cohort-seats";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import {
  authHrefForLokal,
  captureAttribution,
  rememberFunnel,
  rememberLocale,
  type UiLocale,
} from "@/lib/attribution";
import { AURA_REPUTATION_EUR } from "@/lib/boost-packs";
import { LOCAL_COHORT_CAP } from "@/lib/funnels";
import { t as translate } from "@/lib/i18n";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/lokal")({
  head: () => ({
    meta: [
      {
        title: `Aura Lokal — mehr echte Bewertungen & Nachbetreuung`,
      },
      {
        name: "description",
        content:
          "Aura Reputation automatisiert deine Kunden-Nachbetreuung und hilft dir, mehr echte Google-Bewertungen zu bekommen. Kostenloser Check · ab 49 €/Monat.",
      },
      {
        property: "og:title",
        content: "Aura Lokal — für lokale Service-Betriebe",
      },
      {
        property: "og:description",
        content: "Kunden-Nachbetreuung + echte Google-Bewertungen — keine Fake-Sterne.",
      },
      { property: "og:url", content: `${SITE_URL}/lokal` },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:locale", content: "de_DE" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/lokal` }],
  }),
  component: LokalLandingPage,
});

function LokalLandingPage() {
  const { locale, setLocale } = useLocale();
  // DE-first for SSR + first paint (no English flash for shops).
  const [lang, setLang] = useState<UiLocale>("de");

  useLayoutEffect(() => {
    rememberFunnel("local");
    const params = new URLSearchParams(window.location.search);
    const next: UiLocale = params.get("lang") === "en" ? "en" : "de";
    rememberLocale(next);
    setLocale(next);
    setLang(next);
    captureAttribution();
  }, [setLocale]);

  useLayoutEffect(() => {
    setLang(locale);
  }, [locale]);

  const tr = (key: string, vars?: Record<string, string | number>) => translate(key, lang, vars);

  const signupHref = authHrefForLokal("signup", lang);
  const loginHref = authHrefForLokal("signin", lang);

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 10% -8%, oklch(0.58 0.09 195 / 0.3), transparent 58%), radial-gradient(ellipse 55% 40% at 90% 5%, oklch(0.78 0.11 82 / 0.18), transparent 52%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Link
            to="/lokal"
            className="font-display text-lg font-semibold tracking-tight sm:text-xl"
          >
            {SITE_NAME}
          </Link>
          <span className="font-display text-lg font-medium text-muted-foreground sm:text-xl">
            Lokal
          </span>
          <LanguageToggle className="ml-auto" />
          <a
            href={loginHref}
            className="hidden rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold sm:inline-flex"
          >
            {tr("lokal.ctaLogin")}
          </a>
          <a
            href={signupHref}
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {tr("lokal.ctaStart")}
          </a>
        </div>
      </header>

      <section className="relative mx-auto flex min-h-[72svh] max-w-5xl flex-col justify-center px-6 py-16 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Aura · Reputation
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.6rem,8vw,4.4rem)] font-semibold leading-[0.96] tracking-tight">
          {tr("lokal.hero")}
        </h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          {tr("lokal.blurb")}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/lokal/audit"
            className="rounded-2xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_40px_-18px_oklch(0.55_0.12_200)] transition-transform hover:scale-[1.02]"
          >
            {tr("lokal.ctaAudit")}
          </Link>
          <a
            href={signupHref}
            className="rounded-2xl border border-border/50 px-7 py-3.5 text-sm font-semibold"
          >
            {tr("lokal.ctaSeat", { eur: AURA_REPUTATION_EUR })}
          </a>
          <a
            href="#barzahlung"
            className="rounded-2xl border border-border/50 px-7 py-3.5 text-sm font-semibold"
          >
            {tr("lokal.ctaCash")}
          </a>
        </div>
        <p className="mt-5 text-[12px] text-muted-foreground">{tr("lokal.niches")}</p>
        <div className="mt-8 max-w-md rounded-3xl border border-gold/30 bg-gold/8 px-5 py-4">
          <LocalCohortSeatsLeft label={tr("lokal.seatsLeft", { cap: LOCAL_COHORT_CAP })} />
        </div>
      </section>

      <section className="relative border-t border-border/40 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {tr("lokal.stepsTitle")}
          </h2>
          <ol className="mt-6 max-w-xl space-y-3 text-[15px] leading-relaxed text-muted-foreground">
            <li>{tr("lokal.step1")}</li>
            <li>{tr("lokal.step2")}</li>
            <li>{tr("lokal.step3")}</li>
          </ol>
        </div>
      </section>

      <section className="relative border-t border-border/40 py-16">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 sm:grid-cols-3">
          <div>
            <h2 className="font-display text-xl font-semibold">{tr("nav.bewertungen")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tr("bewertungen.blurb")}</p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">{tr("nav.kunden")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tr("kunden.blurb")}</p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">{tr("nav.social")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tr("social.blurb")}</p>
          </div>
        </div>
      </section>

      <section id="barzahlung" className="relative border-t border-border/40 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            {tr("boost.unlockSeat")} · {AURA_REPUTATION_EUR} €/Monat
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">{tr("boost.seatBlurb")}</p>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">{tr("lokal.cashHow")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/lokal/audit"
              className="inline-flex rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              {tr("lokal.ctaAudit")}
            </Link>
            <a
              href={signupHref}
              className="inline-flex rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
            >
              {tr("paywall.cta")}
            </a>
            <a
              href={loginHref}
              className="inline-flex rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
            >
              {tr("lokal.ctaLogin")}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
