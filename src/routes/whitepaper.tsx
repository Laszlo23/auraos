import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { SiteFooter } from "@/components/aura/site-footer";
import { AURA_MAX_SUPPLY_DISPLAY } from "@/lib/aura-token";
import { AURA_WHITEPAPER, WHITEPAPER_META, type WpBlock } from "@/lib/aura-whitepaper";
import { OG_IMAGE, SITE_URL, TOKEN_LAUNCH_DISPLAY, url } from "@/lib/site";
import { TOKENOMICS, WHITEPAPER_SECTIONS } from "@/lib/tokenomics";

const TITLE = "AURA Token whitepaper — the economic layer of Building Culture";
const DESCRIPTION =
  "AURA OS + AURA Lokal. Fixed supply 777,777,777 AURA. Vienna-first local economy, contributor rewards, and an AI-agent coordination layer. Strategic draft — not investment advice.";

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

function Block({ block }: { block: WpBlock }) {
  switch (block.kind) {
    case "p":
      return <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">{block.text}</p>;
    case "lead":
      return (
        <p className="mt-4 border-l-2 border-primary/50 pl-4 text-[16px] font-medium leading-relaxed text-foreground">
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-muted-foreground">
          {block.items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "notice":
      return (
        <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
          {block.text}
        </p>
      );
    case "table":
      return (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-border/40">
          <table className="w-full min-w-[28rem] text-left text-[13px]">
            <thead className="bg-foreground/[0.03] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                {block.headers.map((h) => (
                  <th key={h} className="px-4 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("-")} className="border-t border-border/30">
                  {row.map((cell, i) => (
                    <td
                      key={`${row[0]}-${i}`}
                      className={`px-4 py-2.5 ${i > 0 ? "num text-right" : ""} ${
                        row[0] === "Total" ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default: {
      const _never: never = block;
      return _never;
    }
  }
}

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
            <Link to="/wien" className="text-muted-foreground hover:text-foreground">
              Wien
            </Link>
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
          {WHITEPAPER_META.version} · {WHITEPAPER_META.date}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.3rem,7vw,3.6rem)] font-semibold leading-[1.02] tracking-tight">
          {WHITEPAPER_META.title}
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          {WHITEPAPER_META.subtitle}. Fixed maximum supply{" "}
          <span className="num text-foreground">{AURA_MAX_SUPPLY_DISPLAY}</span> AURA. Fair launch{" "}
          {TOKEN_LAUNCH_DISPLAY}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/tokenomics"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Tokenomics & how to buy →
          </Link>
          <Link
            to="/wien"
            className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Wien hub
          </Link>
          <a
            href={TOKENOMICS.decks.investor}
            download
            className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Investor PPTX
          </a>
        </div>

        <nav
          aria-label="Contents"
          className="mt-12 rounded-3xl border border-border/40 bg-foreground/[0.02] px-5 py-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Contents
          </p>
          <ol className="mt-3 columns-1 gap-x-8 text-[13px] sm:columns-2">
            {AURA_WHITEPAPER.map((s) => (
              <li key={s.id} className="mb-1.5 break-inside-avoid">
                <a href={`#${s.id}`} className="text-muted-foreground hover:text-primary">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-12">
          {AURA_WHITEPAPER.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {s.title}
              </h2>
              {s.blocks.map((block, i) => (
                <Block key={`${s.id}-${i}`} block={block} />
              ))}
            </section>
          ))}
        </div>

        <div className="mt-20 border-t border-border/40 pt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Product addendum
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            Aura OS — operating system for autonomous companies
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            The token whitepaper above is the economic layer. This addendum is the live product
            narrative: missions, AI employees, proof-of-work, and subscriptions as the core P&amp;L.
          </p>
          <div className="mt-8 space-y-8">
            {WHITEPAPER_SECTIONS.map((s) => (
              <section key={s.id} id={`os-${s.id}`} className="scroll-mt-24">
                <h3 className="font-display text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.7] text-muted-foreground">{s.body}</p>
              </section>
            ))}
          </div>
        </div>

        <p className="mt-16 text-[12px] text-muted-foreground">
          Building Culture · AURA OS · AURA Lokal ·{" "}
          <a href={SITE_URL} className="text-primary hover:underline">
            aibusiness.fun
          </a>
        </p>
      </article>

      <SiteFooter
        share={{
          url: `${SITE_URL}/whitepaper`,
          text: "AURA Token whitepaper — 777,777,777 AURA. Vienna first. Building Culture.",
          placement: "whitepaper",
        }}
      />
    </main>
  );
}
