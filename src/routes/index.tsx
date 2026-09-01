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
  Coins,
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
        content: `AI company operating system. Fair launch ${TOKEN_LAUNCH_DISPLAY}. You're the owner. AI employees execute real work — strategy, sales, growth, operations. Founding seats $299.`,
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

      {/* ACT 00 — one composition: brand · headline · line · CTAs · film */}
      <section className="relative z-10 flex min-h-[100svh] items-end overflow-hidden sm:items-center">
        <HeroFilm />
        <div
          data-tour="hero"
          className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-28 sm:pb-24 sm:pt-24"
        >
          <h1 className="display-hero luxury-reveal max-w-4xl text-[clamp(3.1rem,11.5vw,7rem)] drop-shadow-[0_8px_40px_oklch(0_0_0_/_0.55)]">
            <WordReveal text={t("landing.hero1")} delay={0.06} />
            <br />
            <motion.span
              initial={{ y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="text-money inline-block"
            >
              {t("landing.hero2")}
            </motion.span>
          </h1>

          <motion.p
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.55 }}
            className="mt-7 max-w-md text-[16px] leading-relaxed text-foreground/82 sm:text-[17px]"
          >
            {t("landing.blurb")}
          </motion.p>
          <motion.p
            initial={{ y: 10 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.62 }}
            className="mt-3 max-w-lg text-[13px] font-semibold uppercase tracking-[0.14em] text-gold"
          >
            {t("landing.categoryLine")}
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
                className="cta-liquid cta-magnetic flex items-center justify-center gap-2 rounded-2xl bg-primary px-9 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
              >
                {t("landing.buy")} <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  trackTeaser("open", { placement: "hero" });
                  setTeaserOpen(true);
                }}
                className="group flex items-center justify-center gap-2.5 rounded-2xl border border-white/12 bg-background/35 px-7 py-4 text-sm font-semibold backdrop-blur-md transition-all hover:border-primary/40 hover:bg-foreground/[0.08]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/18 text-primary shadow-[0_0_20px_-6px_var(--glow)] transition-transform group-hover:scale-110">
                  <Play className="h-3 w-3 fill-current" />
                </span>
                {t("landing.watch")}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                to="/try"
                onClick={() => trackTeaser("cta_click", { placement: "landing_hero_try" })}
                className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {t("landing.tryCta")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/hood"
                onClick={() => trackTeaser("cta_click", { placement: "landing_hero_hood" })}
                className="jewel inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[13px] font-semibold text-gold underline-offset-4 transition-colors hover:bg-gold/15"
              >
                {t("landing.navHood")} · {t("landing.hoodCue")}{" "}
                <ArrowRight className="h-3.5 w-3.5" />
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
        </div>
      </section>

      <section
        id="start"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 py-24 sm:py-32"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          {t("landing.audienceKicker")}
        </p>
        <h2 className="display-hero mt-4 max-w-3xl text-[clamp(2.2rem,6vw,3.8rem)]">
          {t("landing.audienceTitle")}
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            onClick={() => trackTeaser("cta_click", { placement: "landing_audience_os" })}
            className="glass hover-lift group rounded-[1.65rem] p-6"
          >
            <span className="icon-well" aria-hidden>
              <Rocket className="h-4 w-4" />
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">
              {t("landing.audienceOsTitle")}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {t("landing.audienceOsBody")}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              {t("landing.audienceOsCta")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
          <Link
            to="/lokal"
            onClick={() => trackTeaser("cta_click", { placement: "landing_audience_lokal" })}
            className="glass hover-lift group rounded-[1.65rem] p-6"
          >
            <span className="icon-well" aria-hidden>
              <Store className="h-4 w-4" />
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">
              {t("landing.audienceLokalTitle")}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {t("landing.audienceLokalBody")}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              {t("landing.audienceLokalCta")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
          <Link
            to="/for/builders"
            onClick={() => trackTeaser("cta_click", { placement: "landing_audience_builders" })}
            className="glass hover-lift group rounded-[1.65rem] p-6"
          >
            <span className="icon-well" aria-hidden>
              <Palette className="h-4 w-4" />
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">
              {t("landing.audienceBuildersTitle")}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {t("landing.audienceBuildersBody")}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              {t("landing.audienceBuildersCta")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
          <Link
            to="/tokenomics"
            onClick={() => trackTeaser("cta_click", { placement: "landing_audience_aura" })}
            className="glass hover-lift group rounded-[1.65rem] p-6"
          >
            <span className="icon-well-gold" aria-hidden>
              <Coins className="h-4 w-4" />
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">
              {t("landing.audienceAuraTitle")}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {t("landing.audienceAuraBody")}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold transition-transform group-hover:translate-x-0.5">
              {t("landing.audienceAuraCta")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
        <Link
          to="/nachbar"
          onClick={() => trackTeaser("cta_click", { placement: "landing_audience_nachbar" })}
          className="glass-soft mt-4 flex items-center justify-between rounded-[1.4rem] px-5 py-4 transition-colors hover:border-primary/30"
        >
          <span>
            <span className="block text-sm font-semibold">Aura Nachbar</span>
            <span className="block text-[13px] text-muted-foreground">{t("nachbar.hero")}</span>
          </span>
          <span className="text-sm font-semibold text-primary">{t("nachbar.ctaApp")} →</span>
        </Link>
      </section>

      {/* How it works — early, plain language */}
      <section
        id="how"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-6 py-24 sm:py-32"
      >
        <div className="mb-10 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
            {t("landing.howCue")}
          </p>
          <h2 className="display-hero mt-3 text-[clamp(1.9rem,5.2vw,3.2rem)]">
            {t("landing.howTitle")}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t("landing.howBody")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {LOOP.map((l, i) => (
            <motion.div
              key={l.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.07, duration: 0.55 }}
              className="glass hover-lift relative rounded-3xl px-4 py-5"
            >
              {i < LOOP.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute -right-2 top-1/2 z-[1] hidden -translate-y-1/2 text-primary/55 sm:block"
                >
                  →
                </span>
              ) : null}
              <span className="icon-well" aria-hidden>
                <l.icon className="h-4 w-4" />
              </span>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
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
            className="cta-liquid cta-magnetic inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            {t("landing.howSeatsCta")} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/how-it-works"
            className="text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t("landing.seeHow")}
          </Link>
        </div>
      </section>

      <div className="austria-bar opacity-80" aria-hidden />
      <WienStoryStrip compact />

      {/* Fair launch — one countdown + socials (no duplicate rally column) */}
      <section
        id="fair-launch"
        className="relative z-10 border-y border-primary/12 bg-gradient-to-b from-primary/[0.08] via-transparent to-gold/[0.04]"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="display-hero text-[clamp(2rem,6vw,3.2rem)]">
            {t("landing.launchTitle")}
            <span className="mt-2 flex items-center gap-3 text-primary">
              <span className="icon-well shrink-0" aria-hidden>
                <Rocket className="h-4 w-4" />
              </span>
              {t("landing.launchLine")}
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {t("landing.launchBody")}
          </p>
          <div className="mt-8">
            <LaunchCountdown variant="hero" placement="landing_launch" />
          </div>
        </div>
      </section>

      {/* Finale — buy seat first */}
      <section
        id="claim"
        data-tour="claim"
        className="relative z-10 mx-auto grid max-w-6xl scroll-mt-20 gap-6 px-6 pb-24 pt-8 lg:grid-cols-[1.05fr_1fr]"
      >
        <div className="flex flex-col justify-center">
          <h2 className="display-hero text-[clamp(2rem,7vw,3.4rem)]">
            {t("landing.claimTitle")}
            <br />
            <span className="text-money">{t("landing.claimTitle2")}</span>
          </h2>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            {t("landing.claimBody")}
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
              className="cta-liquid cta-magnetic mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              {t("landing.unlockCta")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Panel>

          <Panel label={t("landing.updatesPanel")} delay={0.08}>
            {joined ? (
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
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
