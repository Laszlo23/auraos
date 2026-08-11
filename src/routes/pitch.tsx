import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Map } from "lucide-react";

import { Chip } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { FoundingCohort, MarketingWaveScarcity } from "@/components/aura/scarcity";
import { FEATURED_DECK_IDS, PITCH_DECKS } from "@/lib/pitch-decks";
import { OG_IMAGE, SITE_URL, TOKEN_LAUNCH_DISPLAY } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";

export const Route = createFileRoute("/pitch")({
  head: () => ({
    meta: [
      { title: "Pitch & roadmap decks — Aura OS" },
      {
        name: "description",
        content:
          "Download Aura decks including the new investor presentation, product & token strategy, unit economics, growth playbook, and Aura Lokal — plus lightpaper, whitepaper, and tokenomics.",
      },
      { property: "og:title", content: "Aura OS — Pitch & roadmap decks" },
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
    title: "Founding seats open",
    body: "Paid founding seats (hard cap 1000) at $99 — no invite required to buy. After purchase you get one invite to share. Token launch stays separate from company compute.",
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

const featured = FEATURED_DECK_IDS.map((id) => PITCH_DECKS.find((d) => d.id === id)!).filter(
  Boolean,
);
const archive = PITCH_DECKS.filter((d) => !(FEATURED_DECK_IDS as readonly string[]).includes(d.id));

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
          Aura OS · Where we are going
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,4rem)] font-semibold leading-[0.98] tracking-tight">
          Own a company.
          <span className="block text-primary">Read the decks.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Vision, growth, product, token, and unit economics — downloadable PowerPoints so anyone
          can see the path from Vienna to world, without waiting for a call.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/access"
            search={{}}
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Buy founding seat — $99
          </Link>
          <a
            href="#decks"
            className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            <Map className="h-3.5 w-3.5" /> Jump to decks
          </a>
        </div>

        <div className="mt-10 space-y-6">
          <MarketingWaveScarcity />
          <FoundingCohort />
        </div>

        <section id="decks" className="mt-16 scroll-mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Deck library
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Investor deck first. Then the library.
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            Start with the new investor presentation, then product &amp; token, then the numbers.
            Lokal sits beside the OS for local businesses in DE/AT. Also read{" "}
            <Link to="/lightpaper" className="text-foreground underline-offset-2 hover:underline">
              lightpaper
            </Link>
            ,{" "}
            <Link to="/whitepaper" className="text-foreground underline-offset-2 hover:underline">
              whitepaper
            </Link>
            , and{" "}
            <Link to="/tokenomics" className="text-foreground underline-offset-2 hover:underline">
              tokenomics
            </Link>
            .
          </p>

          <ul className="mt-8 divide-y divide-border/40 border-y border-border/40">
            {featured.map((deck) => (
              <li
                key={deck.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {deck.tag}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
                      .{deck.lang === "both" ? "EN/DE" : deck.lang.toUpperCase()} · pptx
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight">
                    {deck.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {deck.blurb}
                  </p>
                </div>
                <a
                  href={deck.href}
                  download
                  onClick={() =>
                    trackTeaser("download", { placement: `pitch:${deck.id}`.slice(0, 40) })
                  }
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-foreground/12"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </li>
            ))}
          </ul>

          {archive.length > 0 ? (
            <div className="mt-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Also available
              </p>
              <ul className="mt-3 space-y-2">
                {archive.map((deck) => (
                  <li key={deck.id}>
                    <a
                      href={deck.href}
                      download
                      onClick={() =>
                        trackTeaser("download", { placement: `pitch:${deck.id}`.slice(0, 40) })
                      }
                      className="inline-flex items-center gap-2 text-[13px] text-primary underline-offset-2 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {deck.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="mt-14 space-y-8">
          {SECTIONS.map((s) => (
            <section
              key={s.kicker}
              className="rounded-3xl border border-border/40 bg-foreground/[0.03] p-6"
            >
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
