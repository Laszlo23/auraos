import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Link2,
  MemoryStick,
  Share2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LiveProof } from "@/components/aura/live-proof";
import { Chip, Panel } from "@/components/aura/primitives";
import { FoundingCohort, MarketingWaveScarcity } from "@/components/aura/scarcity";
import { ShareBar, ShareMoment } from "@/components/aura/share";
import { SiteFooter } from "@/components/aura/site-footer";
import { useNetworkTotals, usePublicFeed } from "@/hooks/use-public";
import { num } from "@/lib/format";
import {
  FOUNDING_SEATS_TOTAL,
  PROOF_PAGE_URL,
  PROOF_SHARE_TEXT,
  WAVE1_CLOSES_DISPLAY,
} from "@/lib/marketing-scarcity";
import { OG_IMAGE, SITE_URL, url } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/proof")({
  head: () => ({
    meta: [
      { title: "Proof & memory — how Aura OS shows finished work | Aura OS" },
      {
        name: "description",
        content:
          "Finished tasks leave a timestamp and a written result. Agents keep dated memory. Founding seats capped at 1000 — share this proof card.",
      },
      { property: "og:title", content: "Aura OS — Proof & memory" },
      {
        property: "og:description",
        content:
          "Not a chat window. Completed work, company memory, and a shareable week report your boss can open without logging in.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url("/proof") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aura OS — Proof & memory" },
      {
        name: "twitter:description",
        content: "Timestamp. Written result. Dated memory. Share the week report.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url("/proof") }],
  }),
  component: ProofPage,
});

const MEMORY_LAYERS = [
  {
    title: "Agent memory",
    body: "After each job, the agent appends a dated lesson — newest first. Open Agents and read the lines.",
    icon: MemoryStick,
  },
  {
    title: "Company knowledge",
    body: "Facts, product notes, and channel context live in company memory. Tomorrow’s work starts informed.",
    icon: Brain,
  },
  {
    title: "Recent results",
    body: "Prior completed task results feed the next prompt. The company does not pretend amnesia.",
    icon: FileText,
  },
] as const;

function ProofShareCard() {
  const [copied, setCopied] = useState(false);
  const totals = useNetworkTotals();
  const feed = usePublicFeed(3);

  const copyCard = async () => {
    const lines = [
      PROOF_SHARE_TEXT,
      "",
      `Network now: ${num(totals.data?.companies ?? 0)} companies · ${num(totals.data?.agents ?? 0)} AI employees · ${num(totals.data?.actions_24h ?? 0)} actions / 24h`,
      PROOF_PAGE_URL,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      toast.success("Proof card copied");
      trackTeaser("share", { placement: "proof_card_copy" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the text manually");
    }
  };

  const recent = (feed.data ?? []).slice(0, 3);

  return (
    <div className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <Chip>Shareable proof card</Chip>
        <Chip className="text-gold">Founding seats · {num(FOUNDING_SEATS_TOTAL)}</Chip>
      </div>
      <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        One card. Copy. Post.
      </h2>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        Screenshot this block or copy the caption. Live numbers refresh from the network ledger —
        not a pitch deck fakeout.
      </p>

      <div
        className={cn(
          "mt-6 rounded-2xl border border-primary/25 bg-background/80 p-5",
          "shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_12%,transparent)]",
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Aura OS · Proof
        </p>
        <p className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight">
          Finished work leaves evidence. Memory leaves a trail.
        </p>
        <ul className="mt-4 space-y-2 text-[13px] text-muted-foreground">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Task → <span className="text-foreground">completed_at</span> + written result
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Agent memory dated like a lab notebook
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Week report share link — boss opens without login
          </li>
        </ul>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/40 pt-4 text-center">
          <div>
            <p className="num text-lg font-semibold text-foreground">
              {num(totals.data?.companies ?? 0)}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Companies
            </p>
          </div>
          <div>
            <p className="num text-lg font-semibold text-foreground">
              {num(totals.data?.agents ?? 0)}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Agents</p>
          </div>
          <div>
            <p className="num text-lg font-semibold text-foreground">
              {num(totals.data?.actions_24h ?? 0)}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              24h actions
            </p>
          </div>
        </div>
        {recent.length ? (
          <div className="mt-4 space-y-1.5 border-t border-border/40 pt-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Live feed sample
            </p>
            {recent.map((row) => (
              <p key={row.id} className="truncate text-[12px] text-muted-foreground">
                <span className="text-foreground/90">{row.handle ? `@${row.handle}` : "Aura"}</span>
                {" — "}
                {row.title || row.detail || row.kind || "Activity"}
              </p>
            ))}
          </div>
        ) : null}
        <p className="mt-4 text-[11px] text-muted-foreground">
          Wave 1 closes {WAVE1_CLOSES_DISPLAY} · {PROOF_PAGE_URL}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void copyCard()}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy proof card"}
        </button>
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(PROOF_SHARE_TEXT)}&url=${encodeURIComponent(PROOF_PAGE_URL)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackTeaser("share", { placement: "proof_card_x" })}
          className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
        >
          <Share2 className="h-3.5 w-3.5" /> Post on X
        </a>
      </div>

      <div className="mt-6">
        <ShareMoment
          url={PROOF_PAGE_URL}
          text={PROOF_SHARE_TEXT}
          title="Aura OS · Proof"
          placement="proof_page"
          label="Share proof"
          showKit={false}
        />
        <div className="mt-3">
          <ShareBar url={PROOF_PAGE_URL} text={PROOF_SHARE_TEXT} placement="proof_page_bar" compact />
        </div>
      </div>
    </div>
  );
}

function ProofPage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 10% -10%, oklch(0.55 0.1 200 / 0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 95% 5%, oklch(0.75 0.12 85 / 0.12), transparent 50%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Aura OS
          </Link>
          <Link
            to="/access"
            onClick={() => trackTeaser("cta_click", { placement: "proof_header_buy" })}
            className="ml-auto rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Buy seat — $99
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
            Marketing proof · not vibes
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.4rem,7vw,4.2rem)] font-semibold leading-[0.98] tracking-tight">
            How do you know the work finished?
            <span className="block text-primary">How do you know it remembers?</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Aura OS does not ask you to trust a chat transcript. Completed tasks leave a timestamp
            and a written result. Agents keep dated memory. You can freeze a week and share it —
            login not required for the recipient.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/"
              hash="community"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              Get on Wave 1 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/live"
              className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
            >
              Watch live network
            </Link>
            <Link
              to="/access"
              className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
            >
              Founding seats
            </Link>
          </div>
        </motion.div>

        <div className="mt-12 max-w-xl">
          <MarketingWaveScarcity />
        </div>

        <div className="mt-10">
          <LiveProof />
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <Panel label="Finished work" glow>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight">
                    Timestamp + result
                  </h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                    When a task completes, Aura stores <span className="text-foreground">status</span>
                    , <span className="text-foreground">completed_at</span>, and a written{" "}
                    <span className="text-foreground">result</span> — what was delivered, not a
                    shrug emoji.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/50 p-4 font-mono text-[12px] leading-relaxed text-muted-foreground">
                <p>
                  status: <span className="text-primary">completed</span>
                </p>
                <p>
                  completed_at: <span className="text-foreground">2026-08-09T16:42:11Z</span>
                </p>
                <p className="mt-2 text-foreground/90">
                  result: “Vela published 3 posts, filed reply drafts, updated campaign ROAS note.”
                </p>
              </div>
              <p className="text-[13px] text-muted-foreground">
                Inside the app: Missions, Console activity, and{" "}
                <Link to="/faq" className="text-primary underline-offset-2 hover:underline">
                  Week in review
                </Link>{" "}
                → Share → public <span className="font-mono text-[12px]">/w/$slug</span>.
              </p>
            </div>
          </Panel>

          <Panel label="Memory you can inspect" glow>
            <div className="space-y-5">
              {MEMORY_LAYERS.map((layer) => {
                const Icon = layer.icon;
                return (
                  <div key={layer.title} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <h3 className="font-display text-lg font-semibold tracking-tight">
                        {layer.title}
                      </h3>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                        {layer.body}
                      </p>
                    </div>
                  </div>
                );
              })}
              <p className="rounded-2xl border border-border/40 bg-background/50 p-4 text-[13px] leading-relaxed text-muted-foreground">
                Demo line: ask the same company a follow-up tomorrow — it should cite what it
                learned, not start from zero.
              </p>
            </div>
          </Panel>
        </div>

        <div className="mt-16">
          <ProofShareCard />
        </div>

        <div className="mt-16 grid gap-8 rounded-3xl border border-border/40 bg-foreground/[0.03] p-6 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
              Scarcity · honest
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Founding seats are capped on purpose
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
              Hard cap: {num(FOUNDING_SEATS_TOTAL)} paid founding companies. Wave 1 closes at fair
              launch ({WAVE1_CLOSES_DISPLAY}). Founding seats are open for purchase — numbers come
              from the seats ledger, not a fake invite counter.
            </p>
            <div className="mt-6 max-w-sm">
              <FoundingCohort />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <Link
              to="/access"
              onClick={() => trackTeaser("cta_click", { placement: "proof_finale_buy" })}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-semibold text-primary-foreground"
            >
              Buy founding seat — $99 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={`${SITE_URL}/proof`}
              className="inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground"
            >
              <Link2 className="h-3.5 w-3.5" /> aibusiness.fun/proof
            </a>
          </div>
        </div>
      </div>

      <SiteFooter
        share={{
          url: PROOF_PAGE_URL,
          text: PROOF_SHARE_TEXT,
          placement: "proof_footer",
        }}
      />
    </main>
  );
}
