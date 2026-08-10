import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { Chip } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { FoundingCohort, MarketingWaveScarcity } from "@/components/aura/scarcity";
import { OG_IMAGE, SITE_URL, TOKEN_LAUNCH_DISPLAY } from "@/lib/site";

export const Route = createFileRoute("/pitch")({
  head: () => ({
    meta: [
      { title: "Pitch — Aura OS pre-launch review" },
      {
        name: "description",
        content:
          "Own a company. Let AI make money. Founding cohort, private-sale Genesis keys, and the road to fair launch.",
      },
      { property: "og:title", content: "Aura OS — Pre-Launch Pitch" },
      { property: "og:url", content: `${SITE_URL}/pitch` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/pitch` }],
  }),
  component: PitchPage,
});

const SECTIONS = [
  {
    kicker: "01 · Snapshot",
    title: "Aura OS at a glance",
    body: "Wake autonomous AI employees. Give one mission. They execute — research, outreach, product, trading — while you own the upside. Live product: aibusiness.fun.",
  },
  {
    kicker: "02 · Access",
    title: "Community first, then the door",
    body: "Waitlist builds the room. Paid founding seats (hard cap 1000) open in waves — invite unlocks $99 checkout. Free multi-use codes are closed. Token launch stays separate.",
  },
  {
    kicker: "03 · Genesis key",
    title: "Private sale: NFT as a hotel key",
    body: "Genesis Passport is a utility membership NFT — buy with Stripe or USDC after you are seated. It gates perks and proves access to your smart wallet room. Not an investment product.",
  },
  {
    kicker: "04 · Next 90 days",
    title: "Fill the cohort · prove work · stay reliable",
    body: "Scale founding companies, settle real tasks with proof-of-work, keep founder approvals on spend, and ship reliability — including shared memory and public live metrics.",
  },
] as const;

function PitchPage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 15% -10%, oklch(0.55 0.1 200 / 0.2), transparent 55%), radial-gradient(ellipse 50% 40% at 95% 15%, oklch(0.75 0.12 85 / 0.12), transparent 50%)",
        }}
      />
      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Home
          </Link>
          <Chip className="ml-auto">Pre-launch · {TOKEN_LAUNCH_DISPLAY}</Chip>
        </div>
      </header>

      <div className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Aura OS · Confidential-friendly public cut
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,4rem)] font-semibold leading-[0.98] tracking-tight">
          Own a company.
          <span className="block text-primary">Let AI make money.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Pre-launch business review turned into a page you can share. Numbers below match the live
          product (1000 founding seats, paid invite graph, Genesis as keys) — not the old free-code
          deck slides.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            hash="community"
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Join waitlist
          </Link>
          <a
            href="/presentation.pptx"
            download
            className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Download deck (.pptx)
          </a>
        </div>

        <div className="mt-10 space-y-6">
          <MarketingWaveScarcity />
          <FoundingCohort />
        </div>

        <div className="mt-14 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.kicker} className="rounded-3xl border border-border/40 bg-foreground/[0.03] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                {s.kicker}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-12 text-[13px] text-muted-foreground">
          Prefer jokes with a lesson?{" "}
          <Link
            to="/blog/$slug"
            params={{ slug: "nfts-as-keys" }}
            className="text-primary underline-offset-2 hover:underline"
          >
            Read “Your NFT is a hotel key”
          </Link>
          . Need receipts?{" "}
          <Link to="/proof" className="text-primary underline-offset-2 hover:underline">
            Proof &amp; memory
          </Link>
          .
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
