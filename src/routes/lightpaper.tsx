import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { SiteFooter } from "@/components/aura/site-footer";
import { OG_IMAGE, SITE_URL, TOKEN_LAUNCH_DISPLAY, url } from "@/lib/site";
import { LIGHTPAPER, TOKEN_DISCLAIMER, TOKENOMICS } from "@/lib/tokenomics";

const TITLE = "Aura OS Lightpaper — own a company, AI executes";
const DESCRIPTION =
  "Short form: autonomous companies, subscriptions as the business, AURA as ecosystem layer, fair launch controls.";

export const Route = createFileRoute("/lightpaper")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url("/lightpaper") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url("/lightpaper") }],
  }),
  component: LightpaperPage,
});

function LightpaperPage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 80% -5%, oklch(0.55 0.1 200 / 0.25), transparent 55%), radial-gradient(ellipse 45% 35% at 0% 30%, oklch(0.75 0.11 85 / 0.12), transparent 50%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3 px-6 py-4">
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
            <Link to="/whitepaper" className="text-muted-foreground hover:text-foreground">
              Whitepaper
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative mx-auto max-w-2xl px-6 py-14 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Lightpaper · {TOKEN_LAUNCH_DISPLAY}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,3.5rem)] font-semibold leading-[0.98] tracking-tight">
          {LIGHTPAPER.title}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
          {LIGHTPAPER.subtitle}
        </p>

        <div className="mt-10 space-y-6">
          {LIGHTPAPER.bullets.map((b) => (
            <section key={b.h} className="border-t border-border/40 pt-6">
              <h2 className="font-display text-lg font-semibold tracking-tight">{b.h}</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{b.p}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
          {TOKEN_DISCLAIMER}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/whitepaper"
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Full whitepaper →
          </Link>
          <Link
            to="/tokenomics"
            className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Tokenomics
          </Link>
          <a
            href={TOKENOMICS.decks.investor}
            download
            className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Investor deck
          </a>
        </div>
      </div>

      <SiteFooter
        share={{
          url: `${SITE_URL}/lightpaper`,
          text: "Aura OS lightpaper — own a company, AI employees execute.",
          placement: "lightpaper",
        }}
      />
    </main>
  );
}
