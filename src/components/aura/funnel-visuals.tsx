import { motion, useScroll, useTransform } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import {
  Bot,
  Building2,
  Check,
  ChevronDown,
  Clock,
  Handshake,
  Heart,
  KeyRound,
  Megaphone,
  Rocket,
  Search,
  ShieldCheck,
  Star,
  Store,
  Target,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { mediaPath } from "@/lib/site";
import type { FunnelId } from "@/lib/funnels";

export type FunnelConcept = {
  icon: LucideIcon;
  title: string;
  hint: string;
};

export type StoryBeat = {
  no: string;
  kicker: string;
  line: string;
  body: string;
  icon: LucideIcon;
  tone: "primary" | "gold" | "muted";
};

export type WiifmItem = {
  icon: LucideIcon;
  title: string;
  payoff: string;
};

export type FunnelStory = {
  image: string;
  imageAlt: string;
  accentLabel: string;
  wash: string;
  /** One-line promise under brand — keep short. */
  hook: string;
  scrollCue: string;
  painTitle: string;
  painBody: string;
  painItems: { bad: string; good: string }[];
  wiifmTitle: string;
  wiifmSub: string;
  wiifm: WiifmItem[];
  beats: StoryBeat[];
  conceptsTitle: string;
  concepts: FunnelConcept[];
  trustTitle: string;
  trustItems: string[];
  closeTitle: string;
  closeBody: string;
};

const LOCAL_IMAGE = "/funnels/lokal-hero.jpg";
const REALTY_IMAGE = "/funnels/realty-hero.jpg";
const AGENTS_IMAGE = "/funnels/agents-hero.jpg";

export function funnelHeroSrc(path: string) {
  return mediaPath(path);
}

export function FunnelHeroBleed({
  src,
  alt,
  children,
  wash,
  minHeightClass = "min-h-[92svh]",
  showScrollCue,
}: {
  src: string;
  alt: string;
  children: ReactNode;
  wash?: string;
  minHeightClass?: string;
  showScrollCue?: string;
}) {
  return (
    <section className={`relative ${minHeightClass} overflow-hidden`}>
      <img
        src={funnelHeroSrc(src)}
        alt={alt}
        className="absolute inset-0 h-full w-full scale-105 object-cover motion-safe:animate-[funnel-ken_28s_ease-in-out_infinite_alternate]"
        fetchPriority="high"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            wash ??
            "linear-gradient(105deg, oklch(0.16 0.02 240 / 0.92) 0%, oklch(0.16 0.02 240 / 0.72) 42%, oklch(0.18 0.03 200 / 0.45) 100%), linear-gradient(0deg, oklch(0.14 0.02 240 / 0.75) 0%, transparent 45%)",
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-5xl flex-col justify-end px-6 pb-20 pt-28 sm:justify-center sm:pb-28 sm:pt-24">
        {children}
      </div>
      {showScrollCue ? (
        <a
          href="#story"
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-white/55 transition-colors hover:text-white/85"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">
            {showScrollCue}
          </span>
          <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden />
        </a>
      ) : null}
    </section>
  );
}

export function StoryProgress({ steps }: { steps: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
      <div className="sticky top-24 z-10 mx-auto max-w-5xl px-6">
        <div className="ml-auto w-44">
          <div className="h-0.5 overflow-hidden rounded-full bg-border/60">
            <motion.div className="h-full bg-primary" style={{ width }} />
          </div>
          <p className="mt-2 text-right text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {steps.join(" · ")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FunnelPainSection({
  title,
  body,
  items,
  eyebrow = "What’s in it for you",
}: {
  title: string;
  body: string;
  items: { bad: string; good: string }[];
  eyebrow?: string;
}) {
  return (
    <section id="story" className="relative border-t border-border/40 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary"
        >
          {eyebrow}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: 0.05 }}
          className="mt-3 max-w-2xl font-display text-[clamp(1.9rem,5vw,3.2rem)] font-semibold leading-[1.05] tracking-tight"
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
        >
          {body}
        </motion.p>
        <div className="mt-12 space-y-4">
          {items.map((item, i) => (
            <motion.div
              key={item.bad}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: i * 0.06 }}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="flex gap-3 rounded-2xl border border-border/40 bg-foreground/[0.03] px-4 py-4">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
                <p className="text-sm leading-snug text-muted-foreground">{item.bad}</p>
              </div>
              <div className="flex gap-3 rounded-2xl border border-primary/25 bg-primary/8 px-4 py-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="text-sm leading-snug text-foreground">{item.good}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FunnelWiifmStrip({
  title,
  sub,
  items,
  eyebrow = "Your payoff",
}: {
  title: string;
  sub: string;
  items: WiifmItem[];
  eyebrow?: string;
}) {
  return (
    <section className="relative border-t border-border/40 py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.55 0.1 200 / 0.1), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
        <h2 className="mt-3 max-w-2xl font-display text-[clamp(1.9rem,5vw,3rem)] font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">{sub}</p>
        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="group"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-gold/20 text-primary ring-1 ring-primary/30 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-8 w-8" strokeWidth={1.6} aria-hidden />
                </div>
                <p className="mt-5 font-display text-2xl font-semibold tracking-tight">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.payoff}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FunnelStoryBeats({ beats }: { beats: StoryBeat[] }) {
  return (
    <div className="relative border-t border-border/40">
      {beats.map((beat, index) => {
        const Icon = beat.icon;
        const flip = index % 2 === 1;
        return (
          <motion.section
            key={beat.no}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto flex min-h-[72svh] max-w-5xl flex-col justify-center px-6 py-16 sm:min-h-[68svh]"
          >
            <div className={flip ? "ml-auto max-w-xl sm:text-right" : "max-w-xl"}>
              <div className={`flex items-center gap-3 ${flip ? "sm:justify-end" : ""}`}>
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl ${
                    beat.tone === "gold"
                      ? "bg-gold/15 text-gold"
                      : beat.tone === "primary"
                        ? "bg-primary/15 text-primary"
                        : "bg-foreground/8 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden />
                </span>
                <span className="text-[11px] font-semibold tracking-[0.3em] text-primary">
                  {beat.no}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {beat.kicker}
                </span>
              </div>
              <h2
                className={`mt-6 font-display text-[clamp(2rem,6vw,3.4rem)] font-semibold leading-[1.02] tracking-tight ${
                  beat.tone === "gold"
                    ? "text-gold"
                    : beat.tone === "primary"
                      ? "text-primary"
                      : "text-foreground"
                }`}
              >
                {beat.line}
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                {beat.body}
              </p>
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}

export function FunnelConceptStrip({
  eyebrow,
  title,
  concepts,
}: {
  eyebrow: string;
  title: string;
  concepts: FunnelConcept[];
}) {
  return (
    <section className="relative border-t border-border/40 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {concepts.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="group"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-gold/15 text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                </div>
                <p className="mt-5 font-display text-xl font-semibold tracking-tight">{c.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.hint}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FunnelTrustStrip({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="relative border-t border-border/40 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.7} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {items.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3 text-sm text-muted-foreground"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FunnelCloseBand({
  title,
  body,
  cta,
  href,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="relative overflow-hidden border-t border-border/40 py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 20% 40%, oklch(0.55 0.1 200 / 0.16), transparent 60%), radial-gradient(ellipse 40% 50% at 90% 60%, oklch(0.78 0.11 82 / 0.12), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Ready
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-[clamp(1.9rem,5vw,3.2rem)] font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-4 max-w-lg text-[15px] text-muted-foreground">{body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={href}
              className="rounded-2xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_16px_48px_-20px_oklch(0.55_0.12_200)] transition-transform hover:scale-[1.02]"
            >
              {cta}
            </a>
            {secondaryHref && secondaryLabel ? (
              <a
                href={secondaryHref}
                className="rounded-2xl border border-border/50 px-7 py-3.5 text-sm font-semibold"
              >
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function FunnelIconRow({
  items,
}: {
  items: { icon: LucideIcon; label: string; hint: string }[];
}) {
  return (
    <div className="grid gap-8 sm:grid-cols-3">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">{item.label}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.hint}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Full narrative + atmosphere for /for/* and local cohort landings. */
export function storyForFunnel(id: FunnelId): FunnelStory {
  switch (id) {
    case "realty":
      return {
        image: REALTY_IMAGE,
        imageAlt: "City apartments at dusk with keys in the foreground",
        accentLabel: "Real estate",
        wash: "linear-gradient(105deg, oklch(0.15 0.03 250 / 0.94) 0%, oklch(0.16 0.03 230 / 0.78) 48%, oklch(0.22 0.04 80 / 0.4) 100%), linear-gradient(0deg, oklch(0.12 0.02 250 / 0.8) 0%, transparent 42%)",
        hook: "More listings. Less cold-call grind.",
        scrollCue: "Scroll the story",
        painTitle: "You’re paid to close — not to dig for leads.",
        painBody:
          "Every hour on random portals is an hour you’re not showing apartments. Aura flips that.",
        painItems: [
          {
            bad: "Manual scrapes & stale phone lists",
            good: "Owners & investors matched to your brief",
          },
          {
            bad: "Generic copy-paste outreach",
            good: "Drafts that sound like you — you hit send",
          },
        ],
        wiifmTitle: "What’s in it for you",
        wiifmSub: "Pipeline while you show flats.",
        wiifm: [
          {
            icon: Clock,
            title: "Time back",
            payoff: "Research runs overnight. You wake up to shortlists.",
          },
          {
            icon: KeyRound,
            title: "More keys",
            payoff: "Seller & investor conversations that fit your mandate.",
          },
          {
            icon: Handshake,
            title: "You close",
            payoff: "Aura never replaces the handshake — it fills the calendar.",
          },
        ],
        beats: [
          {
            no: "01",
            kicker: "Morning",
            line: "You set the brief.",
            body: "Buyers, sellers, area, ticket size. One clear mission — not ten tools.",
            icon: Target,
            tone: "primary",
          },
          {
            no: "02",
            kicker: "While you show",
            line: "Aura hunts.",
            body: "Agents research and score matches. Outreach drafts wait in your queue.",
            icon: Search,
            tone: "muted",
          },
          {
            no: "03",
            kicker: "Evening",
            line: "You approve & send.",
            body: "From your mailbox. Your brand. Your deal. Aura just did the digging.",
            icon: Handshake,
            tone: "gold",
          },
        ],
        conceptsTitle: "Three pictures. Whole job.",
        concepts: [
          {
            icon: Search,
            title: "Find",
            hint: "Owners & investors that match your brief.",
          },
          {
            icon: KeyRound,
            title: "Draft",
            hint: "Warm messages ready — you send.",
          },
          {
            icon: Handshake,
            title: "Close",
            hint: "You take the viewing and the fee.",
          },
        ],
        trustTitle: "You stay in control",
        trustItems: [
          "No invented contacts",
          "You approve every outbound",
          "Sent from your own mailbox",
          "Built for mandates, not spam blasts",
        ],
        closeTitle: "Start prospecting tonight.",
        closeBody: "Tell Aura what you’re hunting. Wake up to a shorter list that actually fits.",
      };
    case "start":
      return {
        image: AGENTS_IMAGE,
        imageAlt: "AI workforce collaborating around a founder desk",
        accentLabel: "Business-in-a-Box",
        wash: "linear-gradient(110deg, oklch(0.14 0.03 210 / 0.94) 0%, oklch(0.16 0.04 200 / 0.75) 50%, oklch(0.2 0.05 85 / 0.35) 100%), linear-gradient(0deg, oklch(0.12 0.02 220 / 0.82) 0%, transparent 44%)",
        hook: "You bring the offer. Aura builds the company around it.",
        scrollCue: "See your first week",
        painTitle: "Ideas don’t fail from lack of slides — they stall without a machine.",
        painBody: "Brand, site, list, outreach, follow-up. Aura stands that up so you can sell.",
        painItems: [
          { bad: "Weeks wiring tools alone", good: "Company skeleton in days" },
          { bad: "Empty pipeline after launch", good: "First prospects + drafts ready" },
        ],
        wiifmTitle: "What’s in it for you",
        wiifmSub: "A running company — not another AI chat.",
        wiifm: [
          {
            icon: Rocket,
            title: "Ship faster",
            payoff: "Offer, brand, and storefront without a six-month build.",
          },
          {
            icon: Bot,
            title: "A workforce",
            payoff: "Agents research, draft, and keep work moving — you approve.",
          },
          {
            icon: Target,
            title: "First customers",
            payoff: "Lead list and outreach while you stay the founder.",
          },
        ],
        beats: [
          {
            no: "01",
            kicker: "Day 1",
            line: "Name what you sell.",
            body: "One offer. Aura spins brand, site, and mission around it.",
            icon: Rocket,
            tone: "primary",
          },
          {
            no: "02",
            kicker: "Day 2–3",
            line: "Wake the team.",
            body: "AI staff fill research, pages, and pipeline tasks. You stay CEO.",
            icon: Bot,
            tone: "muted",
          },
          {
            no: "03",
            kicker: "Week 1",
            line: "Talk to humans.",
            body: "Prospects and drafts in your queue. You approve the send and close.",
            icon: Users,
            tone: "gold",
          },
        ],
        conceptsTitle: "How the box opens",
        concepts: [
          { icon: Rocket, title: "Offer", hint: "Tell Aura what you sell." },
          { icon: Bot, title: "Team", hint: "Agents stand up the work." },
          { icon: Target, title: "Pipeline", hint: "First customers, your approvals." },
        ],
        trustTitle: "Founder stays in charge",
        trustItems: [
          "You approve publish & outreach",
          "No silent sends",
          "Outcome plans — not credit meters",
          "You own the brand and the upside",
        ],
        closeTitle: "Build the company around your offer.",
        closeBody: "Stop wiring tools. Start with one product and a workforce that ships.",
      };
    case "sales":
      return {
        image: AGENTS_IMAGE,
        imageAlt: "Sales agents collaborating on a glowing pipeline board",
        accentLabel: "Sales department",
        wash: "linear-gradient(110deg, oklch(0.14 0.03 210 / 0.94) 0%, oklch(0.16 0.04 200 / 0.75) 50%, oklch(0.2 0.05 85 / 0.35) 100%), linear-gradient(0deg, oklch(0.12 0.02 220 / 0.82) 0%, transparent 44%)",
        hook: "Meetings on the calendar — without hiring an SDR team.",
        scrollCue: "Scroll how it fills",
        painTitle: "Growth dies when prospecting is “when I have time.”",
        painBody: "Aura is the department that keeps hunting while you deliver the work.",
        painItems: [
          { bad: "Feast / famine pipeline", good: "Steady outreach every week" },
          { bad: "Paying for chat tokens", good: "Paying for meetings & outcomes" },
        ],
        wiifmTitle: "What’s in it for you",
        wiifmSub: "A sales desk that doesn’t sleep.",
        wiifm: [
          {
            icon: Users,
            title: "Prospects",
            payoff: "Companies that fit your offer — researched, not random.",
          },
          {
            icon: Workflow,
            title: "Drafts ready",
            payoff: "Outreach in your voice. You hit send.",
          },
          {
            icon: Target,
            title: "Outcomes",
            payoff: "Plans tied to meetings — not endless AI credits.",
          },
        ],
        beats: [
          {
            no: "01",
            kicker: "Brief",
            line: "Say who you want.",
            body: "Ideal customer, offer, geography. One mission for the desk.",
            icon: Target,
            tone: "primary",
          },
          {
            no: "02",
            kicker: "Hunt",
            line: "Agents fill the board.",
            body: "Prospect, score, draft. You review like a sales manager.",
            icon: Workflow,
            tone: "muted",
          },
          {
            no: "03",
            kicker: "Close",
            line: "You take the call.",
            body: "Aura never steals the relationship — it books the next one.",
            icon: Handshake,
            tone: "gold",
          },
        ],
        conceptsTitle: "Department in three icons",
        concepts: [
          { icon: Users, title: "Prospect", hint: "Fit companies, not noise." },
          { icon: Workflow, title: "Qualify", hint: "Drafts & follow-ups for you." },
          { icon: Target, title: "Book", hint: "Pay for outcomes, not tokens." },
        ],
        trustTitle: "Human sends. Always.",
        trustItems: [
          "You approve every outbound",
          "No fake personas posing as you",
          "Pipeline you can see",
          "Outcome billing — not credit anxiety",
        ],
        closeTitle: "Hire the desk. Keep the deals.",
        closeBody: "Tell Aura how many meetings you need. Watch the board fill.",
      };
    case "agencies":
      return {
        image: AGENTS_IMAGE,
        imageAlt: "Agency sales team powered by AI silhouettes",
        accentLabel: "For agencies",
        wash: "linear-gradient(110deg, oklch(0.14 0.03 210 / 0.94) 0%, oklch(0.16 0.04 200 / 0.75) 50%, oklch(0.2 0.05 85 / 0.35) 100%), linear-gradient(0deg, oklch(0.12 0.02 220 / 0.82) 0%, transparent 44%)",
        hook: "You build the sites. Aura finds the next clients.",
        scrollCue: "See the handoff",
        painTitle: "Delivery is full. The pipeline is empty.",
        painBody: "Classic agency trap. Aura runs the SDR layer so you stay in the craft.",
        painItems: [
          { bad: "Referrals only", good: "Outbound that finds website buyers" },
          {
            bad: "Founder doing sales at midnight",
            good: "Drafts waiting when you finish a sprint",
          },
        ],
        wiifmTitle: "What’s in it for you",
        wiifmSub: "More builds booked. Same team size.",
        wiifm: [
          {
            icon: Building2,
            title: "Keep building",
            payoff: "Delivery stays yours — the thing clients hire you for.",
          },
          {
            icon: Bot,
            title: "AI SDR desk",
            payoff: "Prospects SMEs that need sites — scored and drafted.",
          },
          {
            icon: Handshake,
            title: "You close",
            payoff: "Warm intros. Your proposal. Your margin.",
          },
        ],
        beats: [
          {
            no: "01",
            kicker: "Setup",
            line: "Package the offer.",
            body: "Website packages, ticket size, niches. Aura knows who to hunt.",
            icon: Building2,
            tone: "primary",
          },
          {
            no: "02",
            kicker: "While you ship",
            line: "The desk prospects.",
            body: "Leads and outreach drafts stack up. You don’t leave Figma.",
            icon: Bot,
            tone: "muted",
          },
          {
            no: "03",
            kicker: "Close",
            line: "You take the call.",
            body: "Approve the send, hop on the Zoom, book the build.",
            icon: Handshake,
            tone: "gold",
          },
        ],
        conceptsTitle: "Agency math",
        concepts: [
          { icon: Building2, title: "You build", hint: "Craft stays yours." },
          { icon: Bot, title: "Aura finds", hint: "SDR without a hire." },
          { icon: Handshake, title: "You close", hint: "Relationship = yours." },
        ],
        trustTitle: "Your clients. Your voice.",
        trustItems: [
          "You approve every outreach",
          "No spam blasts in your name",
          "Built for website-package sales",
          "Outcome plans for agencies",
        ],
        closeTitle: "Fill next month’s builds.",
        closeBody: "Keep shipping. Let Aura hunt the next €1.5k website clients.",
      };
    case "local":
      return {
        image: LOCAL_IMAGE,
        imageAlt: "Neighborhood shop with a glowing five-star review on a phone",
        accentLabel: "Local",
        wash: "linear-gradient(105deg, oklch(0.16 0.03 200 / 0.92) 0%, oklch(0.17 0.03 190 / 0.7) 46%, oklch(0.25 0.06 85 / 0.38) 100%), linear-gradient(0deg, oklch(0.14 0.02 210 / 0.78) 0%, transparent 44%)",
        hook: "More real stars. Guests who come back. Without living on your phone.",
        scrollCue: "Scroll your week",
        painTitle: "Great work. Quiet Google page.",
        painBody: "Happy customers leave — and forget to review. Aura turns that into a habit.",
        painItems: [
          { bad: "Hoping for reviews", good: "Asking every real guest — you approve" },
          { bad: "Posting when you remember", good: "Social drafts waiting in one desk" },
        ],
        wiifmTitle: "What’s in it for you",
        wiifmSub: "Reputation that fills the chair.",
        wiifm: [
          {
            icon: Star,
            title: "More stars",
            payoff: "Real Google invites after real visits — never fake.",
          },
          {
            icon: Heart,
            title: "Guests return",
            payoff: "Check-in + follow-up so people feel remembered.",
          },
          {
            icon: Megaphone,
            title: "Stay visible",
            payoff: "Approve posts in minutes. Stay on the map.",
          },
        ],
        beats: [
          {
            no: "01",
            kicker: "After the visit",
            line: "Ask while it’s warm.",
            body: "Aura queues a polite review invite. You tap approve. Done.",
            icon: Star,
            tone: "gold",
          },
          {
            no: "02",
            kicker: "At the desk",
            line: "Guests check in.",
            body: "QR or code. You confirm. Relationships stay local and real.",
            icon: Users,
            tone: "primary",
          },
          {
            no: "03",
            kicker: "This week",
            line: "Stay visible.",
            body: "Social drafts ready. Your site stays yours — we don’t force a rebuild.",
            icon: Store,
            tone: "muted",
          },
        ],
        conceptsTitle: "Site. Stars. Social.",
        concepts: [
          { icon: Store, title: "Your site", hint: "Bring the homepage you already run." },
          { icon: Star, title: "Stars", hint: "Real customers. Your approval." },
          { icon: Megaphone, title: "Social", hint: "One desk to schedule & approve." },
        ],
        trustTitle: "No fake stars. Ever.",
        trustItems: [
          "Never invent Google reviews",
          "Never post as customers",
          "You approve every invite",
          "Built for salons, gastro, trades, beauty",
        ],
        closeTitle: "Open your local hub.",
        closeBody: "Join Review Boost. Start asking for the stars you already earned.",
      };
    case "os":
      return {
        image: AGENTS_IMAGE,
        imageAlt: "AI company workforce at a founder desk",
        accentLabel: "Aura OS",
        wash: "linear-gradient(110deg, oklch(0.14 0.03 210 / 0.94) 0%, oklch(0.16 0.04 200 / 0.75) 50%, oklch(0.2 0.05 85 / 0.35) 100%), linear-gradient(0deg, oklch(0.12 0.02 220 / 0.82) 0%, transparent 44%)",
        hook: "Own a company. Let AI make money.",
        scrollCue: "Scroll the loop",
        painTitle: "You want upside — not another chatbot.",
        painBody: "Aura is a company you own. Agents execute. You keep the upside.",
        painItems: [
          { bad: "Paying for chat credits", good: "Owning a working company" },
          { bad: "Solo grind forever", good: "A workforce that ships" },
        ],
        wiifmTitle: "What’s in it for you",
        wiifmSub: "Create. Execute. Earn. Grow.",
        wiifm: [
          { icon: Rocket, title: "Own it", payoff: "You’re the founder. Agents are staff." },
          { icon: Bot, title: "Ship work", payoff: "Missions become real output." },
          { icon: Target, title: "Keep upside", payoff: "Results compound under you." },
        ],
        beats: [
          {
            no: "01",
            kicker: "Create",
            line: "Name the company.",
            body: "Wake AI employees ready to work.",
            icon: Building2,
            tone: "primary",
          },
          {
            no: "02",
            kicker: "Execute",
            line: "One goal in plain words.",
            body: "They split the work and do it.",
            icon: Workflow,
            tone: "muted",
          },
          {
            no: "03",
            kicker: "Earn",
            line: "See proof — not fluff.",
            body: "Cost, output, money in. Then grow.",
            icon: Target,
            tone: "gold",
          },
        ],
        conceptsTitle: "The loop",
        concepts: [
          { icon: Rocket, title: "Own", hint: "You set the mission." },
          { icon: Bot, title: "Wake", hint: "Agents execute." },
          { icon: Target, title: "Keep", hint: "Upside stays yours." },
        ],
        trustTitle: "You’re the owner",
        trustItems: [
          "Human approvals where it matters",
          "Real work, not chat theater",
          "Founding cohort economics",
          "You keep the upside",
        ],
        closeTitle: "Join the founding cohort.",
        closeBody: "Own the company. Let the staff happen to be AI.",
      };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/** @deprecated use storyForFunnel — kept for older imports */
export function visualThemeForFunnel(
  id: FunnelId,
  _icons?: unknown,
): {
  image: string;
  imageAlt: string;
  accentLabel: string;
  wash: string;
  concepts: FunnelConcept[];
} {
  const s = storyForFunnel(id);
  return {
    image: s.image,
    imageAlt: s.imageAlt,
    accentLabel: s.accentLabel,
    wash: s.wash,
    concepts: s.concepts,
  };
}

export const FUNNEL_IMAGE = {
  local: LOCAL_IMAGE,
  realty: REALTY_IMAGE,
  agents: AGENTS_IMAGE,
} as const;
