import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useLayoutEffect, useState } from "react";
import { ClipboardCheck, Heart, KeyRound, Megaphone, Star, Store, Users } from "lucide-react";

import {
  FunnelCloseBand,
  FunnelConceptStrip,
  FunnelHeroBleed,
  FunnelPainSection,
  FunnelStoryBeats,
  FunnelTrustStrip,
  FunnelWiifmStrip,
  type StoryBeat,
} from "@/components/aura/funnel-visuals";
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
    links: [
      { rel: "canonical", href: `${SITE_URL}/lokal` },
      { rel: "preload", as: "image", href: "/funnels/lokal-hero.jpg" },
    ],
  }),
  component: LokalLandingPage,
});

function LokalLandingPage() {
  const { locale, setLocale } = useLocale();
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

  const beats: StoryBeat[] = [
    {
      no: tr("lokal.beat1No"),
      kicker: tr("lokal.beat1Kicker"),
      line: tr("lokal.beat1Line"),
      body: tr("lokal.beat1Body"),
      icon: Star,
      tone: "gold",
    },
    {
      no: tr("lokal.beat2No"),
      kicker: tr("lokal.beat2Kicker"),
      line: tr("lokal.beat2Line"),
      body: tr("lokal.beat2Body"),
      icon: Users,
      tone: "primary",
    },
    {
      no: tr("lokal.beat3No"),
      kicker: tr("lokal.beat3Kicker"),
      line: tr("lokal.beat3Line"),
      body: tr("lokal.beat3Body"),
      icon: Store,
      tone: "muted",
    },
  ];

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-black/25 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Link
            to="/lokal"
            className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl"
          >
            {SITE_NAME}
          </Link>
          <span className="font-display text-lg font-medium text-white/60 sm:text-xl">Lokal</span>
          <LanguageToggle className="ml-auto border-white/25 bg-black/30 text-white" />
          <a
            href={loginHref}
            className="hidden rounded-2xl border border-white/25 px-4 py-2 text-xs font-semibold text-white sm:inline-flex"
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

      <FunnelHeroBleed
        src="/funnels/lokal-hero.jpg"
        alt={
          lang === "de"
            ? "Lokaler Laden am Abend mit leuchtender 5-Sterne-Bewertung"
            : "Neighborhood shop with a glowing five-star review"
        }
        wash="linear-gradient(105deg, oklch(0.16 0.03 200 / 0.92) 0%, oklch(0.17 0.03 190 / 0.7) 46%, oklch(0.25 0.06 85 / 0.38) 100%), linear-gradient(0deg, oklch(0.14 0.02 210 / 0.78) 0%, transparent 44%)"
        showScrollCue={tr("lokal.scrollCue")}
      >
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[clamp(1.9rem,5vw,2.8rem)] font-semibold tracking-tight text-white"
        >
          Aura Lokal
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-3 max-w-3xl font-display text-[clamp(2.2rem,7vw,3.8rem)] font-semibold leading-[0.98] tracking-tight text-white"
        >
          {tr("lokal.hero")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mt-5 max-w-lg text-[16px] leading-relaxed text-white/75"
        >
          {tr("lokal.blurb")}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-9 flex flex-wrap gap-3"
        >
          <Link
            to="/lokal/audit"
            className="rounded-2xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_40px_-18px_oklch(0.55_0.12_200)] transition-transform hover:scale-[1.02]"
          >
            {tr("lokal.ctaAudit")}
          </Link>
          <a
            href="#story"
            className="rounded-2xl border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm"
          >
            {tr("lokal.wiifmCta")}
          </a>
        </motion.div>
      </FunnelHeroBleed>

      <FunnelPainSection
        title={tr("lokal.painTitle")}
        body={tr("lokal.painBody")}
        items={[
          { bad: tr("lokal.painBad1"), good: tr("lokal.painGood1") },
          { bad: tr("lokal.painBad2"), good: tr("lokal.painGood2") },
        ]}
        eyebrow={lang === "de" ? "Was bringt’s dir" : "What’s in it for you"}
      />

      <FunnelWiifmStrip
        title={tr("lokal.wiifmTitle")}
        sub={tr("lokal.wiifmSub")}
        eyebrow={tr("lokal.storyPillars")}
        items={[
          {
            icon: Star,
            title: tr("lokal.wiifmStars"),
            payoff: tr("lokal.wiifmStarsHint"),
          },
          {
            icon: Heart,
            title: tr("lokal.wiifmGuests"),
            payoff: tr("lokal.wiifmGuestsHint"),
          },
          {
            icon: Megaphone,
            title: tr("lokal.wiifmSocial"),
            payoff: tr("lokal.wiifmSocialHint"),
          },
        ]}
      />

      <FunnelStoryBeats beats={beats} />

      <FunnelConceptStrip
        eyebrow={lang === "de" ? "In drei Bildern" : "In three pictures"}
        title={tr("lokal.conceptsTitle")}
        concepts={[
          {
            icon: ClipboardCheck,
            title: lang === "de" ? "Prüfen" : "Check",
            hint: tr("lokal.step1").replace(/^\d\s*·\s*/, ""),
          },
          {
            icon: Store,
            title: lang === "de" ? "Betrieb" : "Shop",
            hint: tr("lokal.step2").replace(/^\d\s*·\s*/, ""),
          },
          {
            icon: KeyRound,
            title: lang === "de" ? "Freischalten" : "Unlock",
            hint: tr("lokal.step3").replace(/^\d\s*·\s*/, ""),
          },
        ]}
      />

      <section className="relative border-t border-border/40 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-[12px] text-muted-foreground">{tr("lokal.niches")}</p>
          <div className="mt-6 max-w-md rounded-3xl border border-gold/30 bg-gold/8 px-5 py-4">
            <LocalCohortSeatsLeft label={tr("lokal.seatsLeft", { cap: LOCAL_COHORT_CAP })} />
          </div>
        </div>
      </section>

      <FunnelTrustStrip
        title={tr("lokal.trustTitle")}
        items={[tr("lokal.trust1"), tr("lokal.trust2"), tr("lokal.trust3"), tr("lokal.trust4")]}
      />

      <FunnelCloseBand
        title={`${tr("boost.unlockSeat")} · ${AURA_REPUTATION_EUR} €/Monat`}
        body={tr("boost.seatBlurb")}
        cta={tr("lokal.ctaAudit")}
        href="/lokal/audit"
        secondaryHref={signupHref}
        secondaryLabel={tr("paywall.cta")}
      />

      <section id="barzahlung" className="relative border-t border-border/40 py-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6">
          <p className="text-sm text-muted-foreground">{tr("lokal.cashHow")}</p>
          <a
            href={signupHref}
            className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            {tr("lokal.ctaCash")}
          </a>
        </div>
      </section>

      <div className="border-t border-border/40 px-6 py-8 text-center">
        <a
          href={loginHref}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {tr("lokal.ctaLogin")}
        </a>
      </div>

      <SiteFooter />
    </main>
  );
}
