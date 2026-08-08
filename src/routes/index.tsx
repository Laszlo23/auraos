import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  Disc3,
  KeyRound,
  Play,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Chip, Panel, Pulse } from "@/components/aura/primitives";
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
import { trackTeaser } from "@/lib/teaser-track";
import { captureAttribution } from "@/lib/attribution";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura OS — Own a company. Let AI make money." },
      {
        name: "description",
        content:
          "Wake autonomous AI employees, give one mission, and own the upside. Create → Execute → Earn → Grow. Invite-only founding cohort.",
      },
      { property: "og:title", content: "Aura OS — Own a company. Let AI make money." },
      {
        property: "og:description",
        content:
          "Not a chat window — a company you own. AI employees execute real work while you keep the upside.",
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
      { property: "og:video", content: `${SITE_URL}/aura-teaser.mp4` },
      { property: "og:video:secure_url", content: `${SITE_URL}/aura-teaser.mp4` },
      { property: "og:video:type", content: "video/mp4" },
      { property: "og:video:width", content: "1080" },
      { property: "og:video:height", content: "1920" },
      { name: "twitter:card", content: "player" },
      { name: "twitter:title", content: "Aura OS — Own a company. Let AI make money." },
      {
        name: "twitter:description",
        content:
          "Wake AI employees. Give one mission. Own the upside.",
      },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:player", content: `${SITE_URL}/aura-teaser.mp4` },
      { name: "twitter:player:width", content: "1080" },
      { name: "twitter:player:height", content: "1920" },
      { name: "twitter:player:stream", content: `${SITE_URL}/aura-teaser.mp4` },
      { name: "twitter:player:stream:content_type", content: "video/mp4" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: "Aura OS — 15 second teaser",
          description:
            "Own a company staffed by AI employees that execute real work — create, execute, earn, grow.",
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

const LOOP = [
  { step: "CREATE", body: "Wake a company staffed by AI employees." },
  { step: "EXECUTE", body: "Give one mission — they do the work." },
  { step: "EARN", body: "Real output. Real settlements. Transparent." },
  { step: "GROW", body: "Reinvest. Hire better. Compound the upside." },
];

function MissionDemoCta() {
  const navigate = useNavigate();
  const [demoGoal, setDemoGoal] = useState("");
  return (
    <div className="mt-2 max-w-xl">
      <label className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        What if your company ran while you slept?
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={demoGoal}
          onChange={(e) => setDemoGoal(e.target.value)}
          placeholder='e.g. "Make €1,000 selling audits"'
          className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-background/40 px-4 py-3.5 text-sm outline-none backdrop-blur-md focus:border-primary/50"
          aria-label="Demo mission goal"
        />
        <button
          type="button"
          onClick={() => {
            const goal = demoGoal.trim();
            if (goal) {
              try {
                sessionStorage.setItem("aura_mission_draft", goal.slice(0, 500));
              } catch {
                /* ignore */
              }
            }
            trackTeaser("cta_click", { placement: "mission_demo" });
            navigate({ to: "/auth", search: { mode: "signin", next: "/missions" } });
          }}
          className="shrink-0 rounded-2xl bg-gold px-5 py-3.5 text-sm font-semibold text-gold-foreground shadow-[0_0_40px_-12px_oklch(0.83_0.15_78_/_0.55)] transition-opacity hover:opacity-90"
        >
          Start earning
        </button>
      </div>
    </div>
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
const ACTS = [
  {
    no: "01",
    kicker: "The problem",
    line: "You are currently the whole company.",
    body: "Ops, growth, support, research, the books. Twelve tabs and one human. The ceiling is your calendar.",
    tone: "muted" as const,
    film: null as string | null,
  },
  {
    no: "02",
    kicker: "The switch",
    line: "Wake the team.",
    body: "CEO, growth, social, product, engineering, customers, finance, quant. You give one mission. They split it, execute it, report back.",
    tone: "primary" as const,
    film: "/act-agents.mp4",
  },
  {
    no: "03",
    kicker: "The work",
    line: "They execute. You own the upside.",
    body: "Every meaningful action shows who, what, when, cost, and result. Quant can trade with caps — as one employee, not the whole product.",
    tone: "gold" as const,
    film: "/act-quant.mp4",
  },
  {
    no: "04",
    kicker: "The loop",
    line: "Create. Execute. Earn. Grow.",
    body: "Completed work levels the company. Reinvest in better agents. Compete on the board. Build an economy of autonomous companies.",
    tone: "primary" as const,
    film: "/act-rewards.mp4",
  },
];

const TICKER = [
  "OWN A COMPANY",
  "AI MAKES MONEY",
  "CREATE → EXECUTE → EARN → GROW",
  "PROOF OF WORK",
  "FOUNDING COHORT",
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
    navigate({ to: "/auth", search: { code: value } });
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
            <Pulse /> Founding cohort
          </Chip>
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
            className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground"
          >
            <Pulse /> Invite-only · seats opening now
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
            Wake autonomous AI employees. Give one mission. They execute — research, outreach,
            product, trading — while you own the upside.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.38 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <a
              href="#claim"
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:opacity-90 hover:shadow-[0_0_60px_-12px_var(--glow)]"
            >
              Claim a founding seat <ArrowRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => {
                trackTeaser("open", { placement: "hero" });
                setTeaserOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-background/30 px-7 py-4 text-sm font-semibold backdrop-blur-md transition-colors hover:border-primary/30 hover:bg-foreground/8"
            >
              <Play className="h-3.5 w-3.5 fill-current text-primary" /> 15s teaser
            </button>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="mt-16 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/80"
          >
            <ChevronDown className="h-3.5 w-3.5" /> The operating system
          </motion.div>
        </div>
      </section>

      <Ticker />

      {/* Second beat — mission + loop (kept out of first viewport) */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
            The money loop
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
            Create. Execute. Earn. Grow.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Not another chat window. A company you own — with AI employees that ship work and
            compound results.
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
              className="glass rounded-3xl px-4 py-5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                {l.step}
              </p>
              <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{l.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-10">
          <MissionDemoCta />
        </div>
      </section>

      <div id="story">
        {ACTS.map((act, i) => (
          <Act key={act.no} act={act} index={i} />
        ))}
      </div>

      <Explainer />

      <LiveProof />

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

      {/* Finale — claim */}
      <section
        id="claim"
        data-tour="claim"
        className="relative z-10 mx-auto grid max-w-6xl scroll-mt-20 gap-6 px-6 pb-24 pt-8 lg:grid-cols-[1.05fr_1fr]"
      >
        <div className="flex flex-col justify-center">
          <h2 className="font-display text-[clamp(2rem,7vw,3.4rem)] leading-[0.98] tracking-tight">
            Don&apos;t miss the wave.
            <br />
            <span className="text-gold">Own the upside.</span>
          </h2>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            Founding seats open in waves. Bring a code — or leave your email — then wake a company
            that works while you sleep.
          </p>
          <div className="mt-8">
            <FoundingCohort />
          </div>
        </div>

        <div className="space-y-4">
          <Panel label="Claim a seat" glow>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Founding seats open by invite. Have a code from a founder or from Atlas? Use it now.
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
                className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Enter <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </Panel>

          <Panel label="No code yet" delay={0.08}>
            {joined ? (
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  You're on the list. Seats release in small waves — we'll send your code to{" "}
                  <span className="text-foreground">{email.trim().toLowerCase()}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={join} className="space-y-3">
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Leave your email and we'll send a code as the cohort opens.
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

          <Panel label="The loop" delay={0.16}>
            <ul className="space-y-2.5 text-[12px] leading-relaxed text-muted-foreground">
              <li>◎ Create your company and wake the team.</li>
              <li>❖ Give one mission — watch employees activate.</li>
              <li>▲ See proof of work: cost, result, verified.</li>
              <li>▲ Reinvest earnings. Level up. Grow.</li>
            </ul>
          </Panel>
        </div>
      </section>

      <SiteFooter
        share={{
          url: SITE_URL,
          text: "Aura OS — own a company. Let AI make money. Founding cohort is open.",
          placement: "landing_footer",
        }}
      />

      <TeaserLightbox open={teaserOpen} onClose={() => setTeaserOpen(false)} placement="hero" />
      <Greeter />
      <OnboardingTour />
    </main>
  );
}
