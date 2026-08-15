import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import {
  NACHBAR_FIRST_CHECKIN_GRANT,
  NACHBAR_FRIEND_BONUS,
  NACHBAR_WELCOME_GRANT,
} from "@/lib/nachbar";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/nachbar/")({
  head: () => ({
    meta: [
      { title: "Aura Nachbar — Check-in, verdienen, Freunde einladen" },
      {
        name: "description",
        content:
          "Die Gäste-App für Aura Lokal: Check-in im Laden, Guthaben verdienen, Freunde mitbringen. Keine Belohnung für Google-Sterne.",
      },
      { property: "og:title", content: "Aura Nachbar" },
      { property: "og:url", content: `${SITE_URL}/nachbar` },
      ...ogCampaignMeta("nachbar"),
      { property: "og:locale", content: "de_DE" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/nachbar` }],
  }),
  component: NachbarLandingPage,
});

function NachbarLandingPage() {
  const { t, locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

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

      <header className="relative z-10 mx-auto flex max-w-lg items-center justify-between gap-3 px-6 py-5">
        <Link to="/nachbar" className="font-display text-lg font-semibold tracking-tight">
          Aura <span className="text-muted-foreground">Nachbar</span>
        </Link>
        <LanguageToggle />
        <Link
          to="/lokal"
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        >
          {t("nachbar.forBusiness")}
        </Link>
      </header>

      <section className="relative z-10 mx-auto max-w-lg px-6 pb-16 pt-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Aura Nachbar
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,10vw,3.4rem)] font-semibold leading-[1.02] tracking-tight">
          Aura Nachbar
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {t("nachbar.hero")} {t("nachbar.googleNote")}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup", next: "/nachbar/heute", lang: locale }}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground"
          >
            {t("nachbar.ctaAccount")}
          </Link>
          <Link
            to="/nachbar/heute"
            className="inline-flex items-center justify-center rounded-2xl border border-border/50 px-5 py-3.5 text-sm font-semibold"
          >
            {t("nachbar.ctaApp")}
          </Link>
        </div>

        <ul className="mt-12 space-y-4 text-sm text-muted-foreground">
          <li className="rounded-3xl border border-border/40 bg-card/30 p-4">
            <p className="font-semibold text-foreground">Check-in</p>
            <p className="mt-1">
              QR → {NACHBAR_WELCOME_GRANT + NACHBAR_FIRST_CHECKIN_GRANT} · friends +
              {NACHBAR_FRIEND_BONUS}
            </p>
          </li>
        </ul>
      </section>

      <SiteFooter />
    </main>
  );
}
