import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Palette,
  Play,
  Rocket,
  Sparkles,
  Store,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { WordReveal } from "@/components/aura/word-reveal";
import { Panel } from "@/components/aura/primitives";
import { FoundingCohort } from "@/components/aura/scarcity";
import { HeroFilm } from "@/components/aura/hero-film";
import { BootCurtain } from "@/components/aura/boot";
import { TeaserLightbox } from "@/components/aura/teaser";
import { Greeter } from "@/components/aura/greeter";
import { OnboardingTour } from "@/components/aura/tour";
import { LaunchCountdown } from "@/components/aura/launch-countdown";
import { ShareMoment } from "@/components/aura/share";
import { RobinhoodMomentumStrip } from "@/components/aura/robinhood-momentum-strip";
import { PublicSiteHeader } from "@/components/aura/public-site-header";
import { WienStoryStrip } from "@/components/aura/wien-story-strip";
import { trackTeaser } from "@/lib/teaser-track";
import { captureAttribution } from "@/lib/attribution";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { LAUNCH_SHARE_TEXT, SITE_URL, TOKEN_LAUNCH_DISPLAY, mediaPath } from "@/lib/site";
import { SAVINGS } from "@/lib/savings-story";
import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/hooks/use-locale";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura OS — Own a company. Let AI make money." },
      {
        name: "talentapp:project_verification",
        content:
          "f116f1bcc3ba1f28132de8e1abbdfb6f2a4137d5b47c3bc5defeb05210925724972babd19c676aa341d3a383b2718006e65d8f8a3de9d3ace8007660346f6d9d",
      },
      {
        name: "description",
        content: `AI company operating system. Fair launch ${TOKEN_LAUNCH_DISPLAY}. You're the owner. AI employees execute real work — strategy, sales, growth, operations. Aura OS $29 / month or $299 / year.`,
      },
      {
        name: "keywords",
        content:
          "AI company, autonomous AI, AI employees, company OS, AI operating system, AI agents, business automation, founding seats, fair launch",
      },
      { property: "og:title", content: "Aura OS — Own a company. Let AI make money." },
      {
        property: "og:description",
        content: `Fair launch ${TOKEN_LAUNCH_DISPLAY}. You're the owner. The staff just happen to be AI — and you keep the upside.`,
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Aura OS" },
      { property: "og:url", content: SITE_URL },
      ...ogCampaignMeta("home"),
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "de_DE" },
      { property: "og:locale:alternate", content: "de_AT" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@auraos" },
      { name: "twitter:title", content: "Aura OS — Own a company. Let AI make money." },
      {
        name: "twitter:description",
        content: `Fair launch ${TOKEN_LAUNCH_DISPLAY}. AI executes the work. You control the company — and own the upside.`,
      },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/` },
      { rel: "alternate", hreflang: "de", href: `${SITE_URL}/?lang=de` },
      { rel: "alternate", hreflang: "en", href: `${SITE_URL}/?lang=en` },
      { rel: "alternate", hreflang: "x-default", href: `${SITE_URL}/` },
      { rel: "preload", as: "image", href: "/aura-teaser-poster.jpg", fetchPriority: "high" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Aura OS",
          description:
            "AI company operating system. Own a company, let AI employees handle the work.",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "299",
            priceCurrency: "USD",
            name: "Founding Seat",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "127",
            bestRating: "5",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: "Aura OS — 15 second teaser",
          description:
            "Own a company. AI employees execute real work — create, execute, earn, grow. You keep the upside.",
          thumbnailUrl: [`${SITE_URL}/aura-teaser-poster.jpg`],
          contentUrl: `${SITE_URL}${mediaPath("/aura-teaser.mp4")}`,
          uploadDate: "2026-08-06",
          duration: "PT15S",
        }),
      },
    ],
  }),
  component: Landing,
});

const LOOP: { step: string; body: string; icon: LucideIcon }[] = [
  { step: "landing.loopCreate", body: "landing.loopCreateBody", icon: Building2 },
  { step: "landing.loopExecute", body: "landing.loopExecuteBody", icon: Workflow },
  { step: "landing.loopEarn", body: "landing.loopEarnBody", icon: CircleDollarSign },
  { step: "landing.loopGrow", body: "landing.loopGrowBody", icon: ChartNoAxesCombined },
];

function Landing() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const [teaserOpen, setTeaserOpen] = useState(false);

  // First-touch attribution: stamp the source before any event fires.
  useEffect(() => {
    captureAttribution();
    trackTeaser("landing_view", { placement: "landing" });
  }, []);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) || value.length > 255) {
      toast.error(t("landing.emailBad"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("waitlist_signups").insert({ email: value });
    setBusy(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error(t("landing.emailFail"));
      return;
    }
    trackTeaser("cta_click", { placement: "waitlist_join" });
    setJoined(true);
    toast.success(t("landing.emailOk"));
  };

  return (
    <main className="stage-atmosphere relative min-h-screen overflow-x-hidden">
      <BootCurtain />
      <PublicSiteHeader
        fixed
        onCtaClick={() => trackTeaser("cta_click", { placement: "landing_header_start" })}
      />

      {/* ACT 01 / THE HOOK — one composition: brand · headline · line · CTAs · crew · film */}
      <section className="relative z-10 flex min-h-[100svh] items-end overflow-hidden sm:items-center">
        <HeroFilm />
        <div
          data-tour="hero"
          className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-28 sm:pb-24 sm:pt-24"
        >
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-neon-lime"
          >
            {t("landing.act1")}
          </motion.p>

          <h1 className="display-hero luxury-reveal max-w-4xl text-[clamp(3.1rem,11.5vw,7rem)] drop-shadow-[0_12px_48px_oklch(0_0_0_/_0.75)]">
            <WordReveal text={t("landing.hero1")} delay={0.06} />
            <br />
            <motion.span
              initial={{ y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="text-money inline-block"
              style={{
                textShadow: "0 0 60px rgba(207, 255, 4, 0.5)",
              }}
            >
              {t("landing.hero2")}
            </motion.span>
          </h1>

          <motion.p
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.55 }}
            className="mt-7 max-w-md text-[17px] font-semibold leading-relaxed text-foreground/90 sm:text-[18px]"
          >
            {t("landing.act1Promise")}
          </motion.p>

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.75, delay: 0.66 }}
            className="mt-5 max-w-xl"
          >
            <RobinhoodMomentumStrip />
          </motion.div>

          <motion.div
            initial={{ y: 18 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.85, delay: 0.68 }}
            className="mt-10 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/access"
                onClick={() => trackTeaser("cta_click", { placement: "landing_hero_buy_seat" })}
                className="boss-cta flex items-center justify-center gap-3 px-10 py-5 text-base"
              >
                <Sparkles className="h-5 w-5" />
                {t("landing.buy")}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  trackTeaser("open", { placement: "hero" });
                  setTeaserOpen(true);
                }}
                className="group flex items-center justify-center gap-3 rounded-2xl border-2 border-street-teal/50 bg-charcoal/80 px-8 py-4 text-base font-bold uppercase tracking-wide text-street-teal backdrop-blur-md transition-all hover:border-street-teal hover:bg-charcoal hover:shadow-[0_0_32px_rgba(114,223,221,0.4)]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-street-teal/20 text-street-teal shadow-[0_0_24px_-6px_var(--street-teal)] transition-transform group-hover:scale-110">
                  <Play className="h-4 w-4 fill-current" />
                </span>
                {t("landing.watch")}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                to="/try"
                onClick={() => trackTeaser("cta_click", { placement: "landing_hero_try" })}
                className="inline-flex items-center gap-2 text-[15px] font-bold text-neon-lime underline-offset-4 transition-all hover:text-neon-lime/80 hover:underline hover:drop-shadow-[0_0_8px_rgba(207,255,4,0.6)]"
              >
                {t("landing.tryCta")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/token"
                onClick={() => trackTeaser("cta_click", { placement: "landing_hero_token" })}
                className="inline-flex items-center gap-2 text-[15px] font-bold text-street-teal underline-offset-4 transition-all hover:underline hover:drop-shadow-[0_0_8px_rgba(114,223,221,0.6)]"
              >
                {t("landing.tokenOnlyCta")}
              </Link>
              <Link
                to="/hood"
                onClick={() => trackTeaser("cta_click", { placement: "landing_hero_hood" })}
                className="inline-flex items-center gap-2 rounded-full border-2 border-neon-lime/60 bg-neon-lime/15 px-4 py-2 text-[14px] font-black uppercase tracking-wide text-neon-lime shadow-[0_0_20px_rgba(207,255,4,0.28)] transition-all hover:border-neon-lime hover:bg-neon-lime/25 hover:shadow-[0_0_32px_rgba(207,255,4,0.45)]"
              >
                {t("landing.navHood")} · {t("landing.hoodCue")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="mt-16 flex items-center gap-2 text-[10px] uppercase tracking-[0.34em] text-muted-foreground/70"
          >
            <ChevronDown className="h-3.5 w-3.5" /> {t("landing.howCue")}
          </motion.div>

          {/* The Crew - BAYC-style mascot strip */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.75 }}
            className="mt-16"
          >
            <p className="mb-6 text-center text-[11px] font-black uppercase tracking-[0.28em] text-neon-lime">
              {t("landing.crew")}
            </p>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 sm:justify-center">
              {[
                {
                  src: "/brand/apes/boss-magma.png",
                  alt: "Mascot: Magma fur ape in black suit with gold jewelry",
                },
                {
                  src: "/brand/apes/beanie-gold.png",
                  alt: "Mascot: Blue ape with black beanie and hoodie",
                },
                {
                  src: "/brand/apes/nvg-lava.png",
                  alt: "Mascot: Lava pattern ape with night vision goggles",
                },
                {
                  src: "/brand/apes/xeyes-lime.png",
                  alt: "Mascot: Neon lime fur ape with X eyes",
                },
                {
                  src: "/brand/apes/straitjacket-lime.png",
                  alt: "Mascot: Blue ape with gold glasses in straitjacket",
                },
                {
                  src: "/brand/apes/varsity-teal.png",
                  alt: "Mascot: Brown ape in lime varsity jacket and trucker cap",
                },
              ].map((ape, i) => (
                <motion.div
                  key={ape.src}
                  initial={{ opacity: 0, scale: 0.9, rotate: -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + i * 0.08 }}
                  className="group relative shrink-0"
                >
                  <div className="relative h-32 w-32 overflow-hidden rounded-2xl border-2 border-neon-lime/40 bg-charcoal shadow-[0_0_24px_rgba(207,255,4,0.2)] transition-all hover:border-neon-lime hover:shadow-[0_0_40px_rgba(207,255,4,0.5)] sm:h-36 sm:w-36">
                    <picture>
                      <source type="image/webp" srcSet={ape.src.replace(/\.png$/, ".webp")} />
                      <img
                        src={ape.src}
                        alt={ape.alt}
                        width={144}
                        height={144}
                        decoding="async"
                        loading={i === 0 ? "eager" : "lazy"}
                        fetchPriority={i === 0 ? "high" : "low"}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    </picture>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ACT 02 / THE PROBLEM — Tools don't run companies */}
      <section
        id="problem"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 py-20 sm:py-28"
      >
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-burgundy">
          {t("landing.act2")}
        </p>
        <h2 className="display-hero max-w-3xl text-[clamp(2rem,5.5vw,3.4rem)] drop-shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          {t("landing.act2Title")}
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {t("landing.act2Body")}
        </p>
      </section>

      {/* ACT 03 / THE TWIST — You own an AI company */}
      <section
        id="twist"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 py-20 sm:py-28"
      >
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-street-teal">
          {t("landing.act3")}
        </p>
        <h2 className="display-hero max-w-3xl text-[clamp(2rem,5.5vw,3.4rem)] drop-shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          {t("landing.act3Title")}
          <br />
          <span className="text-money" style={{ textShadow: "0 0 60px rgba(207, 255, 4, 0.5)" }}>
            {t("landing.act3Subtitle")}
          </span>
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {t("landing.act3Body")}
        </p>
      </section>

      {/* ACT 04 / THE MACHINE — How it works */}
      <section
        id="how"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-6 py-24 sm:py-32"
      >
        <div className="mb-10 max-w-2xl">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-street-teal">
            {t("landing.act4")}
          </p>
          <h2 className="display-hero text-[clamp(1.9rem,5.2vw,3.2rem)] drop-shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            {t("landing.act4Title")}
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { step: "landing.act4Step1", body: "landing.act4Step1Body", icon: Sparkles },
            { step: "landing.act4Step2", body: "landing.act4Step2Body", icon: Rocket },
            { step: "landing.act4Step3", body: "landing.act4Step3Body", icon: Workflow },
            { step: "landing.act4Step4", body: "landing.act4Step4Body", icon: CircleDollarSign },
          ].map((l, i) => (
            <motion.div
              key={l.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.07, duration: 0.55 }}
              className="street-panel relative px-4 py-5 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(207,255,4,0.3)]"
            >
              {i < 3 ? (
                <span
                  aria-hidden
                  className="absolute -right-2 top-1/2 z-[1] hidden -translate-y-1/2 text-[24px] font-black text-neon-lime/70 sm:block"
                >
                  →
                </span>
              ) : null}
              <span className={i % 2 === 0 ? "icon-well-neon" : "icon-well"} aria-hidden>
                <l.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-neon-lime">
                {String(i + 1).padStart(2, "0")} · {t(l.step)}
              </p>
              <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{t(l.body)}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            to="/access"
            onClick={() => trackTeaser("cta_click", { placement: "landing_how_earn" })}
            className="boss-cta inline-flex items-center justify-center gap-3 px-8 py-4"
          >
            <Rocket className="h-5 w-5" />
            {t("landing.buy")}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ACT 05 / WORLDS INSIDE AURA — Deeply integrated app previews */}
      <section
        id="worlds"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 py-24 sm:py-32"
      >
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-neon-lime">
          {t("landing.act5")}
        </p>
        <h2 className="display-hero mb-10 max-w-3xl text-[clamp(2rem,5.5vw,3.4rem)] drop-shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          {t("landing.act5Title")}
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* The Hood — Founding membership */}
          <Link
            to="/hood"
            onClick={() => trackTeaser("cta_click", { placement: "landing_worlds_hood" })}
            className="street-panel group relative overflow-hidden p-6 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(207,255,4,0.4)]"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <span className="icon-well-neon" aria-hidden>
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-neon-lime/40 bg-neon-lime/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-neon-lime">
                  Collection
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {t("landing.chapterHood")}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t("landing.chapterHoodLore")}
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  t("landing.chapterHoodFeature1"),
                  t("landing.chapterHoodFeature2"),
                  t("landing.chapterHoodFeature3"),
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] text-foreground/80">
                    <span className="h-1 w-1 rounded-full bg-neon-lime" />
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-neon-lime transition-transform group-hover:translate-x-1">
                {t("landing.chapterHoodCta")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Token & Ecosystem — Fair launch */}
          <Link
            to="/token"
            onClick={() => trackTeaser("cta_click", { placement: "landing_worlds_token" })}
            className="street-panel group relative overflow-hidden p-6 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(114,223,221,0.4)]"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <span className="icon-well" aria-hidden>
                  <CircleDollarSign className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-street-teal/40 bg-street-teal/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-street-teal">
                  Fair Launch
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {t("landing.chapterToken")}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t("landing.chapterTokenLore")}
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  t("landing.chapterTokenFeature1"),
                  t("landing.chapterTokenFeature2"),
                  t("landing.chapterTokenFeature3"),
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] text-foreground/80">
                    <span className="h-1 w-1 rounded-full bg-street-teal" />
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-street-teal transition-transform group-hover:translate-x-1">
                {t("landing.chapterTokenCta")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Aura Local — Local businesses */}
          <Link
            to="/lokal"
            onClick={() => trackTeaser("cta_click", { placement: "landing_worlds_lokal" })}
            className="street-panel group relative overflow-hidden p-6 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(114,223,221,0.4)]"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <span className="icon-well-neon" aria-hidden>
                  <Store className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-street-teal/40 bg-street-teal/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-street-teal">
                  Local
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {t("landing.chapterLokal")}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t("landing.chapterLokalLore")}
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  t("landing.chapterLokalFeature1"),
                  t("landing.chapterLokalFeature2"),
                  t("landing.chapterLokalFeature3"),
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] text-foreground/80">
                    <span className="h-1 w-1 rounded-full bg-street-teal" />
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-street-teal transition-transform group-hover:translate-x-1">
                {t("landing.chapterLokalCta")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Try — Interactive demo */}
          <Link
            to="/try"
            onClick={() => trackTeaser("cta_click", { placement: "landing_worlds_try" })}
            className="street-panel group relative overflow-hidden p-6 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(207,255,4,0.4)]"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <span className="icon-well-neon" aria-hidden>
                  <Play className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-neon-lime/40 bg-neon-lime/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-neon-lime">
                  Interactive
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {t("landing.chapterTry")}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t("landing.chapterTryLore")}
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  t("landing.chapterTryFeature1"),
                  t("landing.chapterTryFeature2"),
                  t("landing.chapterTryFeature3"),
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] text-foreground/80">
                    <span className="h-1 w-1 rounded-full bg-neon-lime" />
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-neon-lime transition-transform group-hover:translate-x-1">
                {t("landing.chapterTryCta")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Social Proof — Results */}
          <Link
            to="/proof"
            onClick={() => trackTeaser("cta_click", { placement: "landing_worlds_proof" })}
            className="street-panel group relative overflow-hidden p-6 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(114,223,221,0.35)]"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <span className="icon-well" aria-hidden>
                  <ChartNoAxesCombined className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-street-teal/40 bg-street-teal/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-street-teal">
                  Real Results
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {t("landing.chapterProof")}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t("landing.chapterProofLore")}
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  t("landing.chapterProofFeature1"),
                  t("landing.chapterProofFeature2"),
                  t("landing.chapterProofFeature3"),
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] text-foreground/80">
                    <span className="h-1 w-1 rounded-full bg-street-teal" />
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-street-teal transition-transform group-hover:translate-x-1">
                {t("landing.chapterProofCta")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Founding Seats — Access */}
          <Link
            to="/access"
            onClick={() => trackTeaser("cta_click", { placement: "landing_worlds_access" })}
            className="street-panel group relative overflow-hidden p-6 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(207,255,4,0.5)] lg:col-span-2"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <span className="icon-well-neon" aria-hidden>
                  <Rocket className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-neon-lime/40 bg-neon-lime/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-neon-lime">
                  $299 / year
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {t("landing.chapterAccess")}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {t("landing.chapterAccessLore")}
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  t("landing.chapterAccessFeature1"),
                  t("landing.chapterAccessFeature2"),
                  t("landing.chapterAccessFeature3"),
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] text-foreground/80">
                    <span className="h-1 w-1 rounded-full bg-neon-lime" />
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-neon-lime transition-transform group-hover:translate-x-1">
                {t("landing.chapterAccessCta")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      <div className="austria-bar opacity-80" aria-hidden />
      <WienStoryStrip compact />

      {/* ACT 06 / FAIR LAUNCH — Launching soon */}
      <section
        id="fair-launch"
        className="relative z-10 border-y border-primary/12 bg-gradient-to-b from-primary/[0.08] via-transparent to-street-teal/[0.05]"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-neon-lime">
            {t("landing.act6")}
          </p>
          <h2 className="display-hero text-[clamp(2rem,6vw,3.2rem)] drop-shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            {t("landing.act6Title")}
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {t("landing.act6Body")}
          </p>
          <div className="mt-8">
            <LaunchCountdown variant="hero" placement="landing_launch" />
          </div>
        </div>
      </section>

      {/* ACT 07 / CLAIM YOUR SEAT — Final CTA */}
      <section
        id="claim"
        data-tour="claim"
        className="relative z-10 mx-auto grid max-w-6xl scroll-mt-20 gap-6 px-6 pb-24 pt-8 lg:grid-cols-[1.05fr_1fr]"
      >
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-neon-lime">
            {t("landing.act7")}
          </p>
          <h2 className="display-hero text-[clamp(2rem,7vw,3.4rem)] drop-shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            {t("landing.act7Title")}
          </h2>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            {t("landing.act7Body")}
          </p>
          <div className="mt-8">
            <FoundingCohort />
          </div>
          <div className="mt-6">
            <ShareMoment
              url={`${SITE_URL}/access`}
              text={LAUNCH_SHARE_TEXT}
              title="Aura OS"
              placement="landing_claim_share"
              label={t("landing.claimShare")}
              showKit
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-[12px]">
            <Link to="/whitepaper" className="text-primary underline-offset-2 hover:underline">
              Whitepaper
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/tokenomics" className="text-primary underline-offset-2 hover:underline">
              Tokenomics
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/wien" className="text-primary underline-offset-2 hover:underline">
              {t("landing.wienHub")}
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/pitch" className="text-primary underline-offset-2 hover:underline">
              Pitch &amp; roadmap decks
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link
              to="/blog/$slug"
              params={{ slug: "nfts-as-keys" }}
              className="text-primary underline-offset-2 hover:underline"
            >
              {t("landing.nftsFunny")}
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <Panel label={t("landing.seatPanel")} glow>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              {t("landing.seatPanelBody")}
            </p>
            <Link
              to="/access"
              onClick={() => trackTeaser("cta_click", { placement: "landing_claim_buy" })}
              className="boss-cta mt-4 flex w-full items-center justify-center gap-3 px-6 py-4 text-sm"
            >
              <Sparkles className="h-4 w-4" />
              {t("landing.unlockCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Panel>

          <Panel label={t("landing.updatesPanel")} delay={0.08}>
            {joined ? (
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-neon-lime" />
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {t("landing.waitlistJoinedShort", { email: email.trim().toLowerCase() })}
                </p>
              </div>
            ) : (
              <form id="community" onSubmit={join} className="space-y-3">
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {t("landing.updatesHint")}
                </p>
                <input
                  id="landing-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  required
                  placeholder={t("landing.waitlistPh")}
                  aria-label={t("landing.waitlistPh")}
                  autoComplete="email"
                  className="w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/45"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold transition-colors hover:border-primary/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {busy ? t("landing.updatesSaving") : t("landing.updatesCta")}
                </button>
              </form>
            )}
          </Panel>
        </div>
      </section>

      <SiteFooter
        share={{
          url: SITE_URL,
          text: LAUNCH_SHARE_TEXT,
          placement: "landing_launch_footer",
        }}
      />

      <TeaserLightbox open={teaserOpen} onClose={() => setTeaserOpen(false)} placement="hero" />
      <Greeter />
      <OnboardingTour />
    </main>
  );
}
