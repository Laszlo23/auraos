import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Coffee, Heart, Radio, Sparkles } from "lucide-react";

import { SiteFooter } from "@/components/aura/site-footer";
import {
  LOVE_RITUALS,
  NINETY_DAY,
  ROADMAP_INTRO,
  ROADMAP_STOPS,
  VIBES_CHART,
  type RoadmapStatus,
  type RoadmapStop,
} from "@/lib/roadmap";
import { OG_IMAGE, SITE_URL, SOCIAL_LINKS, TOKEN_LAUNCH_DISPLAY, url } from "@/lib/site";
import { cn } from "@/lib/utils";

const TITLE = "Aura OS roadmap — the love way (coffee & Spaces)";
const DESCRIPTION =
  "Funny, honest roadmap: live product, fair launch, 90-day proof mission, plus coffee sessions and Love Spaces. Ninty energy.";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url("/roadmap") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url("/roadmap") }],
  }),
  component: RoadmapPage,
});

const STATUS_LABEL: Record<RoadmapStatus, string> = {
  live: "Live",
  brewing: "Brewing",
  next: "Next up",
  dreaming: "Dreaming",
};

function kindIcon(kind: RoadmapStop["kind"]) {
  switch (kind) {
    case "coffee":
      return Coffee;
    case "space":
      return Radio;
    case "love":
      return Heart;
    case "product":
      return Sparkles;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function SteamCup({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      className={className}
      viewBox="0 0 160 140"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="70" cy="118" rx="48" ry="8" className="fill-foreground/10" />
      <path
        d="M28 48h84c2 0 4 2 4 4v40c0 18-16 32-36 32H60c-20 0-36-14-36-32V52c0-2 2-4 4-4z"
        className="fill-foreground/8 stroke-foreground/40"
        strokeWidth="2"
      />
      <path
        d="M116 58h14c10 0 18 8 18 18s-8 18-18 18h-10"
        className="stroke-foreground/45"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M36 56h68" className="stroke-primary/50" strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M${48 + i * 18} 44c0-10 6-14 0-24`}
          className="stroke-primary/60"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          initial={reduce ? false : { pathLength: 0.2, opacity: 0.35 }}
          animate={
            reduce
              ? undefined
              : {
                  pathLength: [0.25, 1, 0.25],
                  opacity: [0.3, 0.85, 0.3],
                  y: [0, -4, 0],
                }
          }
          transition={{ duration: 2.4 + i * 0.35, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <motion.circle
        cx="70"
        cy="78"
        r="6"
        className="fill-primary/40"
        animate={reduce ? undefined : { scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </svg>
  );
}

function OrbitLove({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="100"
        cy="100"
        r="70"
        className="stroke-border/60"
        strokeWidth="1"
        strokeDasharray="4 6"
      />
      <circle cx="100" cy="100" r="44" className="stroke-primary/25" strokeWidth="1.5" />
      <motion.g
        style={{ originX: "100px", originY: "100px" }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="30" r="7" className="fill-primary/80" />
        <circle cx="170" cy="100" r="5" className="fill-foreground/50" />
        <circle cx="100" cy="170" r="6" className="fill-amber-500/70" />
      </motion.g>
      <motion.path
        d="M100 88c-8-10-24-6-24 8 0 14 24 28 24 28s24-14 24-28c0-14-16-18-24-8z"
        className="fill-primary/30 stroke-primary/70"
        strokeWidth="1.5"
        animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        style={{ originX: "100px", originY: "108px" }}
      />
      <text
        x="100"
        y="196"
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: 9, letterSpacing: "0.18em" }}
      >
        LOVE ORBIT
      </text>
    </svg>
  );
}

function VibesGraph({ className }: { className?: string }) {
  const w = 360;
  const h = 180;
  const pad = 28;
  const maxY = 100;
  const xs = VIBES_CHART.map((_, i) => pad + (i * (w - pad * 2)) / (VIBES_CHART.length - 1));
  const y = (v: number) => h - pad - (v / maxY) * (h - pad * 2);

  const line = (key: "features" | "vibes" | "love") =>
    VIBES_CHART.map((p, i) => `${i === 0 ? "M" : "L"}${xs[i]},${y(p[key])}`).join(" ");

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Vibes versus features chart"
    >
      <title>Illustrative vibes / features / love chart — not forecasts</title>
      {[0, 25, 50, 75, 100].map((tick) => (
        <g key={tick}>
          <line
            x1={pad}
            x2={w - pad}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-border/40"
            strokeWidth="1"
          />
        </g>
      ))}
      <motion.path
        d={line("features")}
        className="stroke-muted-foreground/50"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
      />
      <motion.path
        d={line("vibes")}
        className="stroke-amber-600/80"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, delay: 0.15 }}
      />
      <motion.path
        d={line("love")}
        className="stroke-primary"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, delay: 0.3 }}
      />
      {VIBES_CHART.map((p, i) => (
        <text
          key={p.label}
          x={xs[i]}
          y={h - 8}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 10 }}
        >
          {p.label}
        </text>
      ))}
      <g transform={`translate(${pad}, 12)`}>
        <LegendDot className="fill-muted-foreground/50" label="features" x={0} />
        <LegendDot className="fill-amber-600" label="vibes" x={78} />
        <LegendDot className="fill-primary" label="love" x={140} />
      </g>
    </svg>
  );
}

function LegendDot({ className, label, x }: { className: string; label: string; x: number }) {
  return (
    <g transform={`translate(${x},0)`}>
      <circle cx="4" cy="4" r="4" className={className} />
      <text x="12" y="7" className="fill-muted-foreground" style={{ fontSize: 10 }}>
        {label}
      </text>
    </g>
  );
}

function RoadmapPage() {
  const reduce = useReducedMotion();
  const xLink = SOCIAL_LINKS.find((s) => s.id === "x");
  const discord = SOCIAL_LINKS.find((s) => s.id === "discord");

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 10% -10%, oklch(0.62 0.09 55 / 0.22), transparent 55%), radial-gradient(ellipse 55% 40% at 95% 5%, oklch(0.55 0.1 200 / 0.22), transparent 50%), radial-gradient(ellipse 40% 30% at 50% 100%, oklch(0.7 0.08 30 / 0.08), transparent 60%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Home
          </Link>
          <nav className="ml-auto flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
            <Link to="/tokenomics" className="text-muted-foreground hover:text-foreground">
              Tokenomics
            </Link>
            <Link to="/lightpaper" className="text-muted-foreground hover:text-foreground">
              Lightpaper
            </Link>
            <Link to="/whitepaper" className="text-muted-foreground hover:text-foreground">
              Whitepaper
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — one composition */}
      <section className="relative mx-auto grid max-w-5xl gap-8 px-6 pb-6 pt-14 sm:grid-cols-[1.15fr_0.85fr] sm:items-end sm:pt-20">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
            {ROADMAP_INTRO.eyebrow} · {TOKEN_LAUNCH_DISPLAY}
          </p>
          <motion.h1
            className="mt-4 font-display text-[clamp(2.6rem,9vw,4.4rem)] font-semibold leading-[0.95] tracking-tight"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            {ROADMAP_INTRO.title}
          </motion.h1>
          <motion.p
            className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
          >
            {ROADMAP_INTRO.subtitle}
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
          >
            {discord ? (
              <a
                href={discord.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                Join coffee sessions →
              </a>
            ) : null}
            {xLink ? (
              <a
                href={xLink.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
              >
                Catch Love Spaces
              </a>
            ) : null}
          </motion.div>
        </div>
        <div className="relative flex justify-center sm:justify-end">
          <SteamCup className="h-36 w-44 sm:h-44 sm:w-52" />
          <OrbitLove className="absolute -right-2 -top-6 h-28 w-28 opacity-90 sm:right-4 sm:top-0 sm:h-32 sm:w-32" />
        </div>
      </section>

      {/* Love rituals strip */}
      <section className="relative mx-auto max-w-5xl px-6 py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Community rituals
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Coffee. Spaces. Love notes.
        </h2>
        <ul className="mt-8 grid gap-8 border-t border-border/40 pt-8 sm:grid-cols-3">
          {LOVE_RITUALS.map((r, i) => (
            <motion.li
              key={r.id}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="border-l border-border/50 pl-4"
            >
              <h3 className="font-display text-lg font-semibold tracking-tight">{r.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{r.blurb}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {r.cta}
              </p>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Timeline */}
      <section className="relative mx-auto max-w-5xl px-6 py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          The path
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Stops on the love highway
        </h2>
        <ol className="relative mt-12 space-y-0">
          <div
            aria-hidden
            className="absolute bottom-4 left-[15px] top-4 w-px bg-gradient-to-b from-primary/60 via-border to-transparent sm:left-[19px]"
          />
          {ROADMAP_STOPS.map((stop, i) => {
            const Icon = kindIcon(stop.kind);
            return (
              <motion.li
                key={stop.id}
                className="relative grid gap-3 py-7 pl-12 sm:grid-cols-[7rem_1fr] sm:gap-8 sm:pl-16"
                initial={reduce ? false : { opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: Math.min(i * 0.04, 0.24) }}
              >
                <span
                  className={cn(
                    "absolute left-0 top-8 flex h-8 w-8 items-center justify-center rounded-full border sm:h-10 sm:w-10",
                    stop.status === "live" && "border-primary/50 bg-primary/15 text-primary",
                    stop.status === "brewing" &&
                      "border-amber-500/40 bg-amber-500/10 text-amber-500",
                    stop.status === "next" &&
                      "border-foreground/30 bg-foreground/5 text-foreground",
                    stop.status === "dreaming" &&
                      "border-border bg-background text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <div className="sm:pt-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {stop.when}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                      stop.status === "live" && "text-primary",
                      stop.status === "brewing" && "text-amber-500",
                      stop.status === "next" && "text-foreground",
                      stop.status === "dreaming" && "text-muted-foreground",
                    )}
                  >
                    {STATUS_LABEL[stop.status]}
                  </p>
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-tight">
                    {stop.title}
                  </h3>
                  <p className="mt-1 text-[14px] italic leading-relaxed text-muted-foreground">
                    {stop.joke}
                  </p>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground/90">
                    {stop.body}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </section>

      {/* Graph */}
      <section className="relative mx-auto max-w-5xl px-6 py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Cool graphix™
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Features climb. Love climbs faster.
        </h2>
        <p className="mt-2 max-w-lg text-[14px] text-muted-foreground">
          Illustrative doodle — not a forecast, not a KPI, not your therapist.
        </p>
        <div className="mt-8 overflow-x-auto border-y border-border/40 py-6">
          <VibesGraph className="mx-auto h-auto w-full min-w-[320px] max-w-xl" />
        </div>
      </section>

      {/* 90-day */}
      <section className="relative mx-auto max-w-5xl px-6 py-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Serious mode
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {NINETY_DAY.title}
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {NINETY_DAY.line}
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {NINETY_DAY.beats.map((b) => (
            <div key={b.d} className="border-t border-border/50 pt-4">
              <p className="font-display text-3xl font-semibold tracking-tight">{b.d}</p>
              <p className="mt-2 text-[14px] text-muted-foreground">{b.t}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/whitepaper"
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Whitepaper →
          </Link>
          <Link
            to="/pitch"
            className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Investor deck
          </Link>
          <Link
            to="/access"
            className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Founding seats
          </Link>
        </div>
      </section>

      <SiteFooter
        share={{
          url: `${SITE_URL}/roadmap`,
          text: "Aura OS roadmap — the love way. Coffee sessions, Spaces, and shipping with receipts.",
          placement: "roadmap",
        }}
      />
    </main>
  );
}
