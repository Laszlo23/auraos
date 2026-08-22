import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import {
  NACHBAR_FIRST_CHECKIN_GRANT,
  NACHBAR_FRIEND_BONUS,
  NACHBAR_WELCOME_GRANT,
} from "@/lib/nachbar";
import { nachbarHead } from "@/lib/nachbar-seo";

export const Route = createFileRoute("/nachbar/")({
  head: () =>
    nachbarHead({
      title: "Aura Nachbar — Check-in, verdienen, Freunde einladen",
      description:
        "Die Gäste-App für Aura Local: Check-in im Laden, Guthaben verdienen, Freunde mitbringen. Keine Belohnung für Google-Sterne.",
      path: "/nachbar",
    }),
  component: NachbarLandingPage,
});

function NachbarLandingPage() {
  const { t, locale } = useLocale();
  const { data: user } = useSupabaseSession();

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
          {user ? (
            <Link
              to="/nachbar/heute"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              Weiter spielen
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ mode: "signup", next: "/nachbar/heute", lang: locale }}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              {t("nachbar.ctaAccount")}
            </Link>
          )}
          <Link
            to="/nachbar/entdecken"
            className="inline-flex items-center justify-center rounded-2xl border border-border/50 px-5 py-3.5 text-sm font-semibold"
          >
            Läden entdecken
          </Link>
        </div>

        <ol className="mt-12 space-y-3">
          {[
            { n: "01", t: "Konto", d: "Kostenlos. Kein Investment." },
            {
              n: "02",
              t: "Check-in",
              d: `QR am Tresen. +${NACHBAR_FIRST_CHECKIN_GRANT} nach Bestätigung.`,
            },
            { n: "03", t: "Freunde", d: `Wer mitkommt und eincheckt: +${NACHBAR_FRIEND_BONUS}.` },
          ].map((s) => (
            <li key={s.n} className="rounded-3xl border border-border/40 bg-card/30 p-4">
              <p className="font-display text-xl text-gold">{s.n}</p>
              <p className="mt-1 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[12px] text-muted-foreground">
          Willkommen +{NACHBAR_WELCOME_GRANT}. Google-Sterne bleiben optional — ohne Belohnung.
        </p>
        <Link
          to="/nachbar/entdecken"
          className="mt-4 inline-block text-sm font-semibold text-primary"
        >
          Läden entdecken →
        </Link>
        <Link to="/wien" className="mt-2 block text-sm text-muted-foreground">
          Wien-Verzeichnis
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
