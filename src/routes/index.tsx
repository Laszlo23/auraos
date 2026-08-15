import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Bot,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  Disc3,
  Play,
  Rocket,
  Sparkles,
  Timer,
  Trophy,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { PulseOrbit } from "@/components/aura/pulse-orbit";
import { AuraLens } from "@/components/aura/aura-lens";
import { WordReveal } from "@/components/aura/word-reveal";
import { Chip, Panel } from "@/components/aura/primitives";
import { FoundingCohort, MarketingWaveScarcity } from "@/components/aura/scarcity";
import { HeroFilm } from "@/components/aura/hero-film";
import { ActFilm } from "@/components/aura/act-film";
import { BootCurtain } from "@/components/aura/boot";
import { Typewriter } from "@/components/aura/typewriter";
import { TeaserCard, TeaserLightbox } from "@/components/aura/teaser";
import { Greeter } from "@/components/aura/greeter";
import { Explainer } from "@/components/aura/explainer";
import { LiveProof } from "@/components/aura/live-proof";
import { OnboardingTour } from "@/components/aura/tour";
import { LaunchCountdown } from "@/components/aura/launch-countdown";
import { ShareKitTeaser } from "@/components/aura/share-kit";
import { ShareMoment } from "@/components/aura/share";
import { CompanyOrg } from "@/components/aura/company-org";
import { LanguageToggle } from "@/components/aura/language-toggle";
import { WienStoryStrip } from "@/components/aura/wien-story-strip";
import { trackTeaser } from "@/lib/teaser-track";
import { captureAttribution } from "@/lib/attribution";
import { LAUNCH_SHARE_TEXT, OG_IMAGE, SITE_URL, TOKEN_LAUNCH_DISPLAY, mediaPath } from "@/lib/site";
import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/hooks/use-locale";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura OS — Own a company. Let AI make money." },
      {
        name: "description",
        content: `Fair launch ${TOKEN_LAUNCH_DISPLAY}. AI executes the work. You control the company. Founding seats open at $99.`,
      },
      { property: "og:title", content: "Aura OS — Own a company. Let AI make money." },
      {
        property: "og:description",
        content: `Fair launch ${TOKEN_LAUNCH_DISPLAY}. You're the owner. The staff just happen to be AI — and you keep the upside.`,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Aura OS — a glowing cyan orbit mark on deep charcoal",
      },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aura OS — Own a company. Let AI make money." },
      {
        name: "twitter:description",
        content: `Fair launch ${TOKEN_LAUNCH_DISPLAY}. AI executes the work. You control the company — and own the upside.`,
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/` },
      { rel: "preload", as: "image", href: "/aura-teaser-poster.jpg", fetchPriority: "high" },
    ],
    scripts: [
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
  {
    step: "CREATE",
    body: "You name the company. AI employees wake up ready to work.",
    icon: Building2,
  },
  {
    step: "EXECUTE",
    body: "You give one goal in plain words. They split the work and do it.",
    icon: Workflow,
  },
  {
    step: "EARN",
    body: "You see real results — cost, proof, and money in — after you approve the work.",
    icon: CircleDollarSign,
  },
  {
    step: "GROW",
    body: "You reinvest. Hire better agents. The company compounds.",
    icon: ChartNoAxesCombined,
  },
];

/** How founding seats work — buy first; invite is post-purchase share. */
function UnlockAccessBand() {
  return (
    <section
      id="unlock"
      className="relative z-10 border-y border-primary/10 bg-gradient-to-b from-primary/[0.05] to-transparent"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mb-8 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
            How to get in
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
            Buy a founding seat.
            <span className="block text-primary">$99 · 1000 companies · open now.</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            No invite required. Pay once, wake your AI company, then share one invite if you want —
            friends still pay $99. Token fair launch is a separate event.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { n: "01", t: "Pay $99", d: "One-time founding seat via Stripe." },
            { n: "02", t: "Wake the company", d: "Atlas and your staff go live." },
            { n: "03", t: "Share one invite", d: "Optional — earn in-app AURA on paid referrals." },
          ].map((s) => (
            <div key={s.n} className="glass rounded-2xl px-4 py-4">
              <p className="num text-[10px] font-semibold tracking-[0.2em] text-primary/70">
                {s.n}
              </p>
              <p className="mt-2 text-[13px] font-semibold">{s.t}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>

        <Link
          to="/access"
          onClick={() => trackTeaser("cta_click", { placement: "landing_unlock_start" })}
          className="cta-liquid cta-magnetic mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          Buy founding seat — $99 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

const PILLARS = [
  {
    icon: Trophy,
    title: "You own the company",
    body: "Not a chat window — a digital company with employees, memory, and economic upside.",
  },
  {
    icon: Sparkles,
    title: "AI employees execute",
    body: "They don't just answer questions. They take missions, file proof of work, and report results.",
  },
  {
    icon: Disc3,
    title: "Earn, then grow",
    body: "Progress and AURA come from real activity — tasks, settlements, milestones — not vanity points.",
  },
];

/** The story. Four acts, one screen each — reads like a scroll on phone, like film on desktop. */
const ACTS: {
  no: string;
  kicker: string;
  line: string;
  body: string;
  tone: "muted" | "primary" | "gold";
  film: string | null;
  icon: LucideIcon;
}[] = [
  {
    no: "01",
    kicker: "The problem",
    line: "You are currently the whole company.",
    body: "Ops, growth, support, research, the books. Twelve tabs and one human. The ceiling is your calendar.",
    tone: "muted",
    film: null,
    icon: Timer,
  },
  {
    no: "02",
    kicker: "The switch",
    line: "Wake the team.",
    body: "CEO, growth, sales, product, engineering, customers, finance, social. You give one mission. They split it, execute it, report back.",
    tone: "primary",
    film: mediaPath("/act-agents.mp4"),
    icon: Bot,
  },
  {
    no: "03",
    kicker: "The work",
    line: "They execute. You own the upside.",
    body: "Every meaningful action shows who, what, when, cost, and result. Real business activity — not chat fluff. Optional specialists (like Quant) come later.",
    tone: "gold",
    film: mediaPath("/act-quant.mp4"),
    icon: CircleDollarSign,
  },
  {
    no: "04",
    kicker: "The loop",
    line: "Create. Execute. Earn. Grow.",
    body: "Completed work levels the company. Reinvest in better agents. Compete on the board. Build an economy of autonomous companies.",
    tone: "primary",
    film: mediaPath("/act-rewards.mp4"),
    icon: Rocket,
  },
];

const TICKER_EN = [
  "OWN A COMPANY",
  "VIENNA FIRST",
  "NO FAKE STARS",
  "FAIR LAUNCH · 17 AUG 13:11 CEST",
  "CREATE → EXECUTE → EARN → GROW",
  "777,777,777 AURA",
  "FOUNDING COMPANIES",
];

const TICKER_DE = [
  "BESITZ EINE FIRMA",
  "WIEN ZUERST",
  "NED FAKE-STERNE",
  "FAIR LAUNCH · 17 AUG 13:11 CEST",
  "ANLEGEN → AUSFÜHREN → VERDIENEN",
  "777.777.777 AURA",
  "23 BEZIRKE",
];

function Ticker() {
  const { locale } = useLocale();
  const base = locale === "de" ? TICKER_DE : TICKER_EN;
  const row = [...base, ...base];
  return (
    <div className="relative z-10 overflow-hidden border-y border-primary/12 bg-gradient-to-r from-background via-primary/[0.06] to-background py-3.5">
      <motion.div
        className="flex w-max gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {row.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="flex items-center gap-10 text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground"
          >
            {t}
            <span className="h-1 w-1 rotate-45 bg-primary/70" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function Act({ act, index }: { act: (typeof ACTS)[number]; index: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 mx-auto flex min-h-[78svh] max-w-6xl snap-start flex-col justify-center overflow-hidden px-6 py-16 sm:min-h-[70svh]"
    >
      {act.film ? <ActFilm src={act.film} className="-z-10" /> : null}
      <div className={index % 2 === 1 ? "ml-auto max-w-2xl text-left sm:text-right" : "max-w-2xl"}>
        <div className={`flex items-center gap-3 ${index % 2 === 1 ? "sm:justify-end" : ""}`}>
          <span
            className={`grid h-9 w-9 place-items-center rounded-xl ${
              act.tone === "gold"
                ? "bg-gold/15 text-gold"
                : act.tone === "primary"
                  ? "bg-primary/15 text-primary"
                  : "bg-foreground/8 text-muted-foreground"
            }`}
          >
            <act.icon className="h-4 w-4" />
          </span>
          <span className="num text-[11px] font-semibold tracking-[0.3em] text-primary">
            {act.no}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {act.kicker}
          </span>
        </div>
        <h2
          className={`mt-5 font-display text-[clamp(2.2rem,8vw,4.4rem)] leading-[0.95] tracking-tight ${
            act.tone === "primary"
              ? "text-primary"
              : act.tone === "gold"
                ? "text-gold"
                : "text-muted-foreground"
          }`}
        >
          <Typewriter text={act.line} speed={38} />
        </h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-5 text-[15px] leading-relaxed text-muted-foreground sm:text-base"
        >
          {act.body}
        </motion.p>
      </div>
    </motion.section>
  );
}

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
      toast.error("That email doesn't look right.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("waitlist_signups").insert({ email: value });
    setBusy(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error("Couldn't save that — try again.");
      return;
    }
    trackTeaser("cta_click", { placement: "waitlist_join" });
    setJoined(true);
    toast.success("You're on the list — seats are open to buy anytime.");
  };

  return (
    <main className="relative min-h-screen snap-y snap-proximity overflow-x-hidden">
      <BootCurtain />
      <AuraLens />
      <header className="fixed inset-x-0 top-0 z-30 bg-background/28 backdrop-blur-2xl">
        <div className="austria-bar" aria-hidden />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:px-6">
          <PulseOrbit size="sm" className="min-w-0" />
          <Chip className="ml-auto hidden sm:flex">
            <LaunchCountdown variant="compact" showSocials={false} placement="header" />
          </Chip>
          <Link
            to="/wien"
            className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:inline"
          >
            {t("landing.wien")}
          </Link>
          <Link
            to="/story"
            className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:inline"
          >
            {t("landing.story")}
          </Link>
          <LanguageToggle className="hidden border-white/15 bg-black/20 sm:inline-flex" />
          <Link
            to="/access"
            onClick={() => trackTeaser("cta_click", { placement: "landing_header_buy" })}
            className="cta-liquid cta-magnetic shrink-0 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_28px_-10px_var(--glow)]"
          >
            {t("landing.buy")}
          </Link>
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
            className="shrink-0 rounded-2xl border border-white/10 bg-foreground/[0.05] px-4 py-2 text-xs font-semibold backdrop-blur-md transition-colors hover:border-primary/35 hover:bg-foreground/10"
          >
            {t("landing.signIn")}
          </button>
        </div>
        <div
          className="h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
          aria-hidden
        />
      </header>

      {/* ACT 00 — one composition: brand · headline · line · CTAs · film */}
      <section className="relative flex min-h-[100svh] snap-start items-end overflow-hidden sm:items-center">
        <HeroFilm />
        <div
          data-tour="hero"
          className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-28 sm:pb-24 sm:pt-24"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mb-9"
          >
            <PulseOrbit size="hero" />
          </motion.div>

          <h1 className="display-hero max-w-4xl text-[clamp(3rem,11vw,6.6rem)]">
            <WordReveal text={t("landing.hero1")} delay={0.06} />
            <br />
            <motion.span
              initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="text-money inline-block"
            >
              {t("landing.hero2")}
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55 }}
            className="mt-7 max-w-md text-[16px] leading-relaxed text-foreground/78 sm:text-[17px]"
          >
            {t("landing.blurb")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.68 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              to="/access"
              onClick={() => trackTeaser("cta_click", { placement: "landing_hero_buy_seat" })}
              className="cta-liquid cta-magnetic flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              {t("landing.buy")} <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                trackTeaser("open", { placement: "hero" });
                setTeaserOpen(true);
              }}
              className="group flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-background/25 px-7 py-4 text-sm font-semibold backdrop-blur-md transition-all hover:border-primary/35 hover:bg-foreground/[0.07]"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary transition-transform group-hover:scale-110">
                <Play className="h-3 w-3 fill-current" />
              </span>
              {t("landing.watch")}
            </button>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="mt-16 flex items-center gap-2 text-[10px] uppercase tracking-[0.34em] text-muted-foreground/75"
          >
            <ChevronDown className="h-3.5 w-3.5" /> {t("landing.howCue")}
          </motion.div>
        </div>
      </section>

      {/* Meme beat — ownership joke before documentation */}
      <section className="relative z-10 flex min-h-[70svh] snap-start items-center overflow-hidden border-y border-primary/10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_55%),linear-gradient(180deg,transparent,rgba(0,0,0,0.4))]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 scale-[2.4] opacity-[0.12] sm:right-[8%] sm:scale-[2.8]"
        >
          <PulseOrbit size="hero" label={false} />
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary"
          >
            {t("landing.jokeKicker")}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.75, delay: 0.05 }}
            className="display-hero mt-4 max-w-3xl text-[clamp(2.4rem,7.5vw,4.6rem)]"
          >
            {t("landing.joke1")}
            <br />
            <span className="text-money">{t("landing.joke2")}</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-5 max-w-lg text-[16px] leading-relaxed text-foreground/75"
          >
            {t("landing.jokeBody")}
          </motion.p>
          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, delay: 0.18 }}
            className="mt-8 max-w-md space-y-2.5 text-[15px] text-muted-foreground"
          >
            {[
              "Find customers",
              "Build products",
              "Run marketing",
              "Research markets",
              "Handle operations",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-1 w-1 shrink-0 rotate-45 bg-primary" aria-hidden />
                {item}
              </li>
            ))}
          </motion.ul>
          <motion.a
            href="#how"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-10 inline-flex items-center gap-2 text-[13px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            See how it works <ArrowRight className="h-3.5 w-3.5" />
          </motion.a>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <form
          id="community"
          onSubmit={join}
          className="glass flex max-w-xl scroll-mt-28 flex-col gap-2 rounded-3xl p-3 sm:flex-row sm:items-center"
        >
          {joined ? (
            <p className="px-2 py-2 text-[13px] text-muted-foreground">
              You&apos;re on the list — we&apos;ll email{" "}
              <span className="text-foreground">{email.trim().toLowerCase()}</span> launch notes.
              Seats are open to buy anytime.
            </p>
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
                placeholder={t("landing.waitlistPh")}
                aria-label={t("landing.waitlistPh")}
                autoComplete="email"
                className="min-w-0 flex-1 rounded-2xl bg-foreground/6 px-4 py-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/45"
              />
              <button
                type="submit"
                disabled={busy}
                className="cta-liquid shrink-0 rounded-2xl bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {busy ? t("common.loading") : t("landing.waitlistCta")}
              </button>
            </>
          )}
        </form>
        <p className="mt-3 max-w-xl text-[12px] text-muted-foreground">
          {t("landing.waitlistHint")}
        </p>
      </section>

      {/* How it works — early, plain language */}
      <section
        id="how"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-6 py-16 sm:py-20"
      >
        <div className="mb-10 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
            {t("landing.howCue")}
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
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
              className="glass relative rounded-3xl px-4 py-5"
            >
              {i < LOOP.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute -right-2 top-1/2 z-[1] hidden -translate-y-1/2 text-primary/50 sm:block"
                >
                  →
                </span>
              ) : null}
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/12 text-primary">
                <l.icon className="h-4 w-4" />
              </span>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                {String(i + 1).padStart(2, "0")} · {l.step}
              </p>
              <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{l.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12">
          <CompanyOrg />
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            to="/access"
            onClick={() => trackTeaser("cta_click", { placement: "landing_how_earn" })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Founding seats <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#unlock"
            className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            How founding seats work
          </a>
        </div>
      </section>

      <div className="austria-bar opacity-80" aria-hidden />
      <WienStoryStrip compact />

      <LiveProof />

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-6">
        <div className="flex flex-col gap-6 rounded-3xl border border-border/40 bg-foreground/[0.03] p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="max-w-xl flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
              Proof &amp; memory
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              Finished work leaves evidence
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Timestamps, written results, dated agent memory — and founding seats capped at 1000
              (paid inventory only). Steal the shareable proof card.
            </p>
            <div className="mt-5 max-w-sm">
              <MarketingWaveScarcity />
            </div>
          </div>
          <Link
            to="/proof"
            onClick={() => trackTeaser("cta_click", { placement: "landing_proof" })}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Open proof page <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <UnlockAccessBand />

      {/* Fair launch — one countdown + socials (no duplicate rally column) */}
      <section
        id="fair-launch"
        className="relative z-10 border-y border-primary/10 bg-gradient-to-b from-primary/[0.06] to-transparent"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(2rem,6vw,3.2rem)] leading-[0.98] tracking-tight">
            Fair launch.
            <span className="mt-1 flex items-center gap-3 text-primary">
              <Rocket className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" aria-hidden />
              Same clock for everyone.
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Fair launch. No team-dump narrative — the countdown ends {TOKEN_LAUNCH_DISPLAY}. Join
            the Ninty channels so you are in the room when it opens.
          </p>
          <div className="mt-8">
            <LaunchCountdown variant="hero" placement="landing_launch" />
          </div>
        </div>
      </section>

      <Ticker />

      <div id="story">
        {ACTS.map((act, i) => (
          <Act key={act.no} act={act} index={i} />
        ))}
      </div>

      <Explainer />

      <ShareKitTeaser />

      {/* Pillars */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <TeaserCard className="mb-3 sm:max-w-md" />
        <div className="grid gap-3 sm:grid-cols-3">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="glass rounded-3xl p-5"
            >
              <p.icon className="h-4 w-4 text-gold" />
              <p className="mt-3 text-[13px] font-semibold">{p.title}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Finale — buy seat first */}
      <section
        id="claim"
        data-tour="claim"
        className="relative z-10 mx-auto grid max-w-6xl scroll-mt-20 gap-6 px-6 pb-24 pt-8 lg:grid-cols-[1.05fr_1fr]"
      >
        <div className="flex flex-col justify-center">
          <h2 className="font-display text-[clamp(2rem,7vw,3.4rem)] leading-[0.98] tracking-tight">
            Buy the seat.
            <br />
            <span className="text-gold">Wake the company.</span>
          </h2>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            $99 one-time · hard-capped at 1000. No invite required. After you&apos;re in, share one
            invite if you want — friends still pay. Genesis Passport NFT is a separate wallet key.
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
              label="Share Aura OS"
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
              Wien hub
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
              Why NFTs as keys (funny edition)
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <Panel label="Founding seat — $99" glow>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Open Stripe checkout after a quick signup. Seat unlocks when payment clears.
            </p>
            <Link
              to="/access"
              onClick={() => trackTeaser("cta_click", { placement: "landing_claim_buy" })}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90"
            >
              Buy founding seat — $99 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Panel>

          <Panel label="Just want updates" delay={0.08}>
            {joined ? (
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  You&apos;re on the list — we&apos;ll email{" "}
                  <span className="text-foreground">{email.trim().toLowerCase()}</span>. Seats are
                  already open to buy above.
                </p>
              </div>
            ) : (
              <form onSubmit={join} className="space-y-3">
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Optional email list. Buying does not require this.
                </p>
                <input
                  id="landing-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  required
                  placeholder="you@company.com"
                  aria-label="Work email for Aura OS waitlist"
                  autoComplete="email"
                  className="w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/45"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold transition-colors hover:border-primary/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {busy ? "Saving…" : "Join the waitlist"}
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
