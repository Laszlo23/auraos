import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { OG_IMAGE, SITE_URL, TOKEN_LAUNCH_DISPLAY, url } from "@/lib/site";
import { TOKEN_DISCLAIMER, TOKENOMICS } from "@/lib/tokenomics";

const TITLE = "AURA tokenomics — ecosystem layer, product first";
const DESCRIPTION =
  "Subscriptions are the Aura OS business. AURA is the ecosystem utility and incentive layer. Fair launch plan, utility, risk controls — no invented supply tables.";

export const Route = createFileRoute("/tokenomics")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url("/tokenomics") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url("/tokenomics") }],
  }),
  component: TokenomicsPage,
});

function TokenomicsPage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 20% -10%, oklch(0.72 0.12 85 / 0.18), transparent 55%), radial-gradient(ellipse 55% 40% at 90% 10%, oklch(0.55 0.1 200 / 0.22), transparent 50%)",
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
            <Link to="/whitepaper" className="text-muted-foreground hover:text-foreground">
              Whitepaper
            </Link>
            <Link to="/pitch" className="text-muted-foreground hover:text-foreground">
              Decks
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Tokenomics · Fair launch {TOKEN_LAUNCH_DISPLAY}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,3.8rem)] font-semibold leading-[0.98] tracking-tight">
          Product first.
          <span className="block text-gold">Token second.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {TOKENOMICS.oneLine}
        </p>
        <p className="mt-4 rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
          {TOKEN_DISCLAIMER}
        </p>

        <section className="mt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Core revenue
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Subscriptions</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {TOKENOMICS.subscriptions.map((s) => (
              <div
                key={s.id}
                className={`rounded-3xl border px-5 py-5 ${
                  "recommended" in s && s.recommended
                    ? "border-primary/40 bg-primary/8"
                    : "border-border/50 bg-card/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">{s.name}</p>
                  {"recommended" in s && s.recommended ? <Chip tone="primary">Rec</Chip> : null}
                </div>
                <p className="num mt-3 text-2xl font-semibold text-gold">{s.price}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.blurb}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-muted-foreground">
            Founding seats ($99 one-time) unlock the cohort. Seats ≠ equity and ≠ the market token.
          </p>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Fair launch ops
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            €6,000 market plan
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Panel label="Strategic buy">
              <p className="text-[14px] leading-relaxed">{TOKENOMICS.fairLaunch.buy}</p>
            </Panel>
            <Panel label="30 agents">
              <p className="text-[14px] leading-relaxed">{TOKENOMICS.fairLaunch.agents}</p>
            </Panel>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
            {TOKENOMICS.fairLaunch.volumeTarget}
          </p>
          <ul className="mt-4 space-y-2 text-[13px] text-muted-foreground">
            {TOKENOMICS.riskControls.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Utility
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            What AURA is for
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {TOKENOMICS.utility.map((u) => (
              <span
                key={u}
                className="rounded-full border border-border/50 bg-foreground/[0.03] px-3 py-1.5 text-[12px] text-muted-foreground"
              >
                {u}
              </span>
            ))}
          </div>
          <p className="mt-6 text-[13px] font-semibold text-foreground">Not sold as the business</p>
          <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
            {TOKENOMICS.notToken.map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Flywheel
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            Adoption drives utility
          </h2>
          <ol className="mt-5 space-y-3">
            {TOKENOMICS.flywheel.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[14px]">
                <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] text-muted-foreground">
            Total supply, vesting cliffs, and exchange listings are{" "}
            <span className="text-foreground">not published yet</span> — we will not invent a pie
            chart. When CA and supply are live, this page updates from the same source of truth.
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <a
            href={TOKENOMICS.decks.investor}
            download
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Investor deck
          </a>
          <a
            href={TOKENOMICS.decks.tokenStrategy}
            download
            className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Token strategy deck
          </a>
          <Link
            to="/lightpaper"
            className="inline-flex items-center rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Lightpaper →
          </Link>
        </div>
      </div>

      <SiteFooter
        className="mt-8"
        share={{
          url: `${SITE_URL}/tokenomics`,
          text: "Aura OS tokenomics — product first, ecosystem token second.",
          placement: "tokenomics",
        }}
      />
    </main>
  );
}
