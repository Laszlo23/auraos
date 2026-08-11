import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { SiteFooter } from "@/components/aura/site-footer";
import { OG_IMAGE, SITE_URL, TOKEN_LAUNCH_DISPLAY, url } from "@/lib/site";
import { TOKENOMICS, WHITEPAPER_SECTIONS } from "@/lib/tokenomics";

const TITLE = "Aura OS Whitepaper — operating system for autonomous companies";
const DESCRIPTION =
  "Full narrative: problem, AI workforce, proof-of-work, subscriptions, token ecosystem layer, fair launch, trading/yield desks, and roadmap.";

export const Route = createFileRoute("/whitepaper")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url("/whitepaper") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url("/whitepaper") }],
  }),
  component: WhitepaperPage,
});

function WhitepaperPage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 45% at 10% 0%, oklch(0.55 0.1 200 / 0.2), transparent 55%), radial-gradient(ellipse 50% 35% at 100% 20%, oklch(0.7 0.1 85 / 0.1), transparent 50%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Home
          </Link>
          <nav className="ml-auto flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
            <Link to="/lightpaper" className="text-muted-foreground hover:text-foreground">
              Lightpaper
            </Link>
            <Link to="/roadmap" className="text-muted-foreground hover:text-foreground">
              Roadmap
            </Link>
            <Link to="/tokenomics" className="text-muted-foreground hover:text-foreground">
              Tokenomics
            </Link>
            <Link to="/pitch" className="text-muted-foreground hover:text-foreground">
              Decks
            </Link>
          </nav>
        </div>
      </header>

      <article className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Whitepaper · {TOKEN_LAUNCH_DISPLAY}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.3rem,7vw,3.6rem)] font-semibold leading-[1.02] tracking-tight">
          The operating system for autonomous companies
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          Create a company. Give it a mission. AI employees do the work. You own the upside.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={TOKENOMICS.decks.investor}
            download
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Download investor PPTX
          </a>
          <Link
            to="/lightpaper"
            className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Prefer the lightpaper →
          </Link>
        </div>

        <nav
          aria-label="Contents"
          className="mt-12 rounded-3xl border border-border/40 bg-foreground/[0.02] px-5 py-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Contents
          </p>
          <ol className="mt-3 columns-1 gap-x-8 text-[13px] sm:columns-2">
            {WHITEPAPER_SECTIONS.map((s) => (
              <li key={s.id} className="mb-1.5 break-inside-avoid">
                <a href={`#${s.id}`} className="text-muted-foreground hover:text-primary">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-12">
          {WHITEPAPER_SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {s.title}
              </h2>
              <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-16 text-[12px] text-muted-foreground">
          Source: Investor Presentation + Product / Subscriptions / Token Strategy decks ·{" "}
          <a href={SITE_URL} className="text-primary hover:underline">
            aibusiness.fun
          </a>
        </p>
      </article>

      <SiteFooter
        share={{
          url: `${SITE_URL}/whitepaper`,
          text: "Aura OS whitepaper — own a company, AI workforce executes.",
          placement: "whitepaper",
        }}
      />
    </main>
  );
}
