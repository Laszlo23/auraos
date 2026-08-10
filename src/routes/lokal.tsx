import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { SiteFooter } from "@/components/aura/site-footer";
import {
  authHrefForLokal,
  captureAttribution,
  rememberFunnel,
  rememberLocale,
} from "@/lib/attribution";
import { LOCAL_SEAT_EUR } from "@/lib/boost-packs";
import { LOCAL_COHORT_CAP, REVIEW_BOOST_INVITE_GOAL } from "@/lib/funnels";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/lokal")({
  head: () => ({
    meta: [
      {
        title: `Aura Lokal — Social, Kunden & Google-Bewertungen für dein Geschäft`,
      },
      {
        name: "description",
        content:
          "Die einfache Super-App für Friseur, Beauty, Gastro und Immobilien: Social automatisieren, Kunden gewinnen, Google-Bewertungen anfragen. Local Seat 99 € — auch bar.",
      },
      {
        property: "og:title",
        content: "Aura Lokal — für lokale Service-Betriebe",
      },
      {
        property: "og:description",
        content: "Social, Sales, Support und Review Boost — einfach auf dem Handy.",
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
  useEffect(() => {
    rememberFunnel("local");
    rememberLocale("de");
    captureAttribution();
  }, []);

  const href = authHrefForLokal("signup");

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
          <a
            href="/presentation-lokal.pptx"
            download
            className="ml-auto rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold"
          >
            Präsentation
          </a>
          <a
            href={href}
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            App starten
          </a>
        </div>
      </header>

      <section className="relative mx-auto flex min-h-[78svh] max-w-5xl flex-col justify-center px-6 py-16 sm:py-24">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Aura · Lokal
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.6rem,8vw,4.4rem)] font-semibold leading-[0.96] tracking-tight">
          Dein lokales Geschäft — online, sichtbar, bewertet.
        </h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          Für Friseur, Beauty, Gastronomie und Immobilien: Social automatisieren, Kunden gewinnen und
          echte Google-Bewertungen anfragen — als einfache Handy-App.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a
            href={href}
            className="rounded-2xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_40px_-18px_oklch(0.55_0.12_200)] transition-transform hover:scale-[1.02]"
          >
            Local Seat · {LOCAL_SEAT_EUR} €
          </a>
          <a
            href="#barzahlung"
            className="rounded-2xl border border-border/50 px-7 py-3.5 text-sm font-semibold"
          >
            Barzahlung & Codes
          </a>
          <a
            href="/presentation-lokal.pptx"
            download
            className="rounded-2xl border border-border/50 px-7 py-3.5 text-sm font-semibold"
          >
            Präsentation laden
          </a>
        </div>
        <p className="mt-5 text-[12px] text-muted-foreground">
          Friseur · Beauty · Gastro · Immobilien · Handwerk
        </p>
      </section>

      <section className="relative border-t border-border/40 py-16">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 sm:grid-cols-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Social</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Kanäle verbinden, Posts freigeben — ohne Agentur-Chaos.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Kunden</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Lokale Leads finden und Anschreiben vorbereiten — du bleibst der Absender.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Bewertungen</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Review Boost: bis zu {REVIEW_BOOST_INVITE_GOAL} Einladungen an echte Kunden (erste{" "}
              {LOCAL_COHORT_CAP} Betriebe).
            </p>
          </div>
        </div>
      </section>

      <section id="barzahlung" className="relative border-t border-border/40 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            {LOCAL_SEAT_EUR} € Local Seat
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Einmalig freischalten. Meist bar an der Theke — du bekommst einen Code und löst ihn in der
            App ein. Karte (Stripe) geht auch.
          </p>
          <a
            href={href}
            className="mt-8 inline-flex rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Jetzt starten
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
