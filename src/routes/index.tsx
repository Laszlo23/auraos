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
  Heart,
  KeyRound,
  MessageSquare,
  Play,
  Quote,
  Rocket,
  Share2,
  Sparkles,
  Timer,
  Trophy,
  UserPlus,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import { FoundingCohort } from "@/components/aura/scarcity";
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
import { CompanyOrg } from "@/components/aura/company-org";
import { trackTeaser } from "@/lib/teaser-track";
import { captureAttribution } from "@/lib/attribution";
import {
  LAUNCH_SHARE_TEXT,
  OG_IMAGE,
  SITE_URL,
  TOKEN_LAUNCH_DISPLAY,
  TOKEN_LAUNCH_LABEL,
  WHITELIST_REQUIRED_COUNT,
  WHITELIST_TASKS,
  type WhitelistTaskId,
} from "@/lib/site";
import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura OS — Own a company. Let AI make money." },
      {
        name: "description",
        content: `Fair launch ${TOKEN_LAUNCH_DISPLAY}. AI executes the work. You control the company. Invite-only founding companies.`,
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
          contentUrl: `${SITE_URL}/aura-teaser.mp4`,
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
    body: "You see real results — cost, proof, and money in — not chat fluff.",
    icon: CircleDollarSign,
  },
  {
    step: "GROW",
    body: "You reinvest. Hire better agents. The company compounds.",
    icon: ChartNoAxesCombined,
  },
];

const TASK_ICONS: Record<WhitelistTaskId, LucideIcon> = {
  follow_x: UserPlus,
  follow_farcaster: Users,
  like_post: Heart,
  comment_post: MessageSquare,
  share_post: Quote,
  discord: MessageSquare,
  telegram: Share2,
};

/** Read-only preview of whitelist tasks — progress lives on /access. */
function UnlockAccessBand() {
  const required = WHITELIST_TASKS.filter((t) => t.group === "required");
  const chat = WHITELIST_TASKS.filter((t) => t.group === "chat_or");

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
            Do these once.
            <span className="block text-primary">Get your invite. Enter the app.</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {WHITELIST_REQUIRED_COUNT} community tasks — follow, engage, join a chat. That unlocks
            Aura OS and grows the room before fair launch.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {required.map((t, i) => {
            const Icon = TASK_ICONS[t.id];
            return (
              <div key={t.id} className="glass flex items-start gap-3 rounded-2xl px-4 py-3.5">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="num text-[10px] font-semibold tracking-[0.2em] text-primary/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[13px] font-semibold">{t.label}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t.hint}</p>
                </div>
              </div>
            );
          })}
          <div className="glass flex items-start gap-3 rounded-2xl px-4 py-3.5 sm:col-span-2 lg:col-span-1">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="num text-[10px] font-semibold tracking-[0.2em] text-gold/80">
                  {String(required.length + 1).padStart(2, "0")}
                </span>
                <p className="text-[13px] font-semibold">Join Discord or Telegram</p>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Pick one: {chat.map((c) => c.label).join(" · ")}
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/access"
          onClick={() => trackTeaser("cta_click", { placement: "landing_unlock_start" })}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90"
        >
          Start tasks <ArrowRight className="h-4 w-4" />
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
    film: "/act-agents.mp4",
    icon: Bot,
  },
  {
    no: "03",
    kicker: "The work",
    line: "They execute. You own the upside.",
    body: "Every meaningful action shows who, what, when, cost, and result. Real business activity — not chat fluff. Optional specialists (like Quant) come later.",
    tone: "gold",
    film: "/act-quant.mp4",
    icon: CircleDollarSign,
  },
  {
    no: "04",
    kicker: "The loop",
    line: "Create. Execute. Earn. Grow.",
    body: "Completed work levels the company. Reinvest in better agents. Compete on the board. Build an economy of autonomous companies.",
    tone: "primary",
    film: "/act-rewards.mp4",
    icon: Rocket,
  },
];

const TICKER = [
  "OWN A COMPANY",
  "YOU OWN THE COMPANY",
  "STAFF HAPPEN TO BE AI",
  "FAIR LAUNCH · 14 AUG 14:14 CEST",
  "CREATE → EXECUTE → EARN → GROW",
  "PROOF OF WORK",
  "FOUNDING COMPANIES",
  "AUTONOMOUS EMPLOYEES",
];

function Ticker() {
  const row = [...TICKER, ...TICKER];
  return (
    <div className="relative z-10 overflow-hidden border-y border-primary/10 bg-gradient-to-r from-background via-primary/[0.04] to-background py-3.5">
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
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const [teaserOpen, setTeaserOpen] = useState(false);

  // First-touch attribution: stamp the source before any event fires.
  useEffect(() => {
    const attr = captureAttribution();
    if (attr.ref_code) setCode(attr.ref_code);
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
    toast.success("You're on the list. We open seats in small waves.");
  };

  const enter = () => {
    const value = code.trim().toUpperCase();
    if (!value) {
      toast.error("Enter your invite code to claim a seat.");
      return;
    }
    trackTeaser("cta_click", { placement: "invite_code" });
    navigate({ to: "/auth", search: { invite: value } });
  };

  return (
    <main className="relative min-h-screen snap-y snap-proximity overflow-x-hidden">
      <BootCurtain />
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/5 bg-background/40 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:px-6">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-lg text-primary shadow-[0_0_28px_-6px_var(--glow)]">
            ◎
          </span>
          <span className="truncate font-display text-[15px] font-semibold tracking-[0.08em]">
            Aura OS
          </span>
          <Chip className="ml-auto hidden sm:flex">
            <LaunchCountdown variant="compact" showSocials={false} placement="header" />
          </Chip>
          <Link
            to="/access"
            onClick={() => trackTeaser("cta_click", { placement: "landing_header_earn" })}
            className="shrink-0 rounded-2xl bg-primary/14 px-4 py-2 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            Earn access
          </Link>
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
            className="shrink-0 rounded-2xl bg-foreground/8 px-4 py-2 text-xs font-semibold transition-colors hover:bg-foreground/14"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* ACT 00 — full-bleed title card (brand + one line + one CTA) */}
      <section className="relative flex min-h-[100svh] snap-start items-end overflow-hidden sm:items-center">
        <HeroFilm />
        <div
          data-tour="hero"
          className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-28 sm:pb-24 sm:pt-24"
        >
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-5 font-display text-[11px] font-semibold uppercase tracking-[0.42em] text-primary"
          >
            Aura OS
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground"
          >
            <LaunchCountdown variant="compact" showSocials={false} placement="hero" />
            <span className="text-muted-foreground/50">·</span>
            <span>
              {TOKEN_LAUNCH_LABEL} · {TOKEN_LAUNCH_DISPLAY}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mt-5 max-w-4xl font-display text-[clamp(2.8rem,10.5vw,6.2rem)] leading-[0.92] tracking-tight"
          >
            Own a company.
            <br />
            <span className="text-primary">Let AI make money.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25 }}
            className="mt-6 max-w-lg text-[16px] leading-relaxed text-foreground/75 sm:text-[17px]"
          >
            AI executes the work. You control the company. Give one mission — employees handle
            research, outreach, sales, product, and operations — while you own the upside.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-3 max-w-lg text-[13px] text-muted-foreground"
          >
            No invite yet? Finish a few community tasks and unlock yours.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.38 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              to="/access"
              onClick={() => trackTeaser("cta_click", { placement: "landing_hero_earn" })}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:opacity-90 hover:shadow-[0_0_60px_-12px_var(--glow)]"
            >
              Earn your invite <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-background/30 px-7 py-4 text-sm font-semibold backdrop-blur-md transition-colors hover:border-primary/30 hover:bg-foreground/8"
            >
              How it works
            </a>
          </motion.div>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            onClick={() => {
              trackTeaser("open", { placement: "hero" });
              setTeaserOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Play className="h-3 w-3 fill-current text-primary" /> Watch the 15s teaser
          </motion.button>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="mt-12 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/80"
          >
            <ChevronDown className="h-3.5 w-3.5" /> How it works
          </motion.div>
        </div>
      </section>

      {/* Meme beat — ownership joke before documentation */}
      <section className="relative z-10 flex min-h-[70svh] snap-start items-center overflow-hidden border-y border-primary/10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(34,211,238,0.08),transparent_50%),linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary"
          >
            The joke
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.75, delay: 0.05 }}
            className="mt-4 max-w-3xl font-display text-[clamp(2.2rem,7vw,4.2rem)] leading-[0.98] tracking-tight"
          >
            You sleep.
            <br />
            <span className="text-primary">Your company doesn&apos;t.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-5 max-w-lg text-[16px] leading-relaxed text-foreground/75"
          >
            You&apos;re the owner. The staff just happen to be AI.
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

      {/* How it works — early, plain language */}
      <section
        id="how"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-6 py-16 sm:py-20"
      >
        <div className="mb-10 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
            Create. Execute. Earn. Grow.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            You&apos;re the owner. The staff just happen to be AI — you give the goal, they do the
            work, you keep the upside.
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
            Earn your invite <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#unlock"
            className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            See the {WHITELIST_REQUIRED_COUNT} tasks
          </a>
        </div>
      </section>

      <LiveProof />

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
            the Building Culture channels so you are in the room when it opens.
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

      {/* Finale — earn first, code second, waitlist last */}
      <section
        id="claim"
        data-tour="claim"
        className="relative z-10 mx-auto grid max-w-6xl scroll-mt-20 gap-6 px-6 pb-24 pt-8 lg:grid-cols-[1.05fr_1fr]"
      >
        <div className="flex flex-col justify-center">
          <h2 className="font-display text-[clamp(2rem,7vw,3.4rem)] leading-[0.98] tracking-tight">
            Earn your invite.
            <br />
            <span className="text-gold">Then own the upside.</span>
          </h2>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            Founding company seats open before the fair launch ({TOKEN_LAUNCH_DISPLAY}). Complete
            the community tasks, unlock your invite, and wake a company that works while you sleep.
          </p>
          <div className="mt-8">
            <FoundingCohort />
          </div>
        </div>

        <div className="space-y-4">
          <Panel label="Earn your invite" glow>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Follow, engage, join Discord or Telegram — {WHITELIST_REQUIRED_COUNT} steps, then
              claim a personal invite and enter Aura OS.
            </p>
            <Link
              to="/access"
              onClick={() => trackTeaser("cta_click", { placement: "landing_claim_earn" })}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start the task board <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Panel>

          <Panel label="Already have a code?" delay={0.08}>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Paste an invite from a founder or from completing the board.
            </p>
            <div className="mt-4 flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-foreground/6 px-3.5 py-2.5">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  id="landing-invite"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={32}
                  placeholder="INVITE CODE"
                  aria-label="Invite code"
                  autoComplete="one-time-code"
                  className="w-full bg-transparent text-[13px] uppercase tracking-[0.16em] outline-none placeholder:tracking-[0.16em] placeholder:text-muted-foreground/60"
                />
              </div>
              <button
                onClick={enter}
                className="flex items-center gap-2 rounded-2xl bg-foreground/10 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-foreground/16"
              >
                Enter <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </Panel>

          <Panel label="Prefer to wait for a wave" delay={0.16}>
            {joined ? (
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  You&apos;re on the waitlist — we&apos;ll email{" "}
                  <span className="text-foreground">{email.trim().toLowerCase()}</span> if seats
                  open in waves. Or{" "}
                  <Link
                    to="/access"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    earn an invite now
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={join} className="space-y-3">
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Leave your email and we&apos;ll send a code as founding seats open — or skip the
                  wait and earn access above.
                </p>
                <input
                  id="landing-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  required
                  placeholder="you@company.com"
                  aria-label="Email"
                  autoComplete="email"
                  className="w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl bg-foreground/10 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-foreground/16 disabled:opacity-40"
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
