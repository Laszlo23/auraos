import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import { PublicMobileMenu } from "@/components/aura/public-mobile-menu";
import { SiteFooter } from "@/components/aura/site-footer";
import {
  AURA_ALLOCATIONS,
  AURA_BUY_PLAN,
  AURA_LAUNCH_OPS,
  AURA_LOCKS,
  AURA_MAX_SUPPLY_DISPLAY,
  AURA_OFFICIAL_CA_SOURCES,
  AURA_TEAM_VESTING,
  AURA_TOKEN_CA,
  auraCaLive,
  auraLaunchTreasuryAddress,
  formatAuraAmount,
} from "@/lib/aura-token";
import { PRIVATE_SALE_TREASURY, privateSaleBasescan } from "@/lib/private-sale";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { SITE_URL, TOKEN_LAUNCH_DISPLAY, url } from "@/lib/site";
import { BCC_TOKEN_DISCLAIMER } from "@/lib/legal-entity";
import { TOKEN_DISCLAIMER, TOKENOMICS } from "@/lib/tokenomics";

const TITLE = "AURA tokenomics — 777,777,777 supply, product first";
const DESCRIPTION =
  "Fixed maximum supply 777,777,777 AURA. Subscriptions are the Aura OS business. Fair launch plan, allocation table, and how to buy only after the official Base CA is published.";

export const Route = createFileRoute("/tokenomics")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url("/tokenomics") },
      ...ogCampaignMeta("token"),
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
          <nav className="ml-auto hidden flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] md:flex">
            <Link to="/wien" className="text-muted-foreground hover:text-foreground">
              Wien
            </Link>
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
          <PublicMobileMenu
            className="ml-auto md:ml-0"
            hideFrom="md"
            items={[
              { to: "/wien", label: "Wien" },
              { to: "/lightpaper", label: "Lightpaper" },
              { to: "/roadmap", label: "Roadmap" },
              { to: "/whitepaper", label: "Whitepaper" },
              { to: "/pitch", label: "Decks" },
              { to: "/sale", label: "Private sale" },
            ]}
          />
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
        <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12.5px] leading-relaxed text-foreground">
          {BCC_TOKEN_DISCLAIMER}{" "}
          <Link to="/team" className="font-semibold text-primary hover:underline">
            Team & trust →
          </Link>
        </p>
        <p className="mt-3 rounded-2xl border border-[color:var(--austria-red)]/40 bg-[color:var(--austria-red)]/10 px-4 py-3 text-[12.5px] leading-relaxed">
          {auraCaLive() ? (
            <>
              Official CA: <span className="num break-all">{AURA_TOKEN_CA}</span>
            </>
          ) : (
            <>
              No official contract address yet. Fair launch is {TOKEN_LAUNCH_DISPLAY}. Any CA in a
              DM is a scam. Official sources:{" "}
              {AURA_OFFICIAL_CA_SOURCES.map((s) => (
                <a key={s} href={s} className="mr-2 font-semibold text-primary hover:underline">
                  {s.replace("https://", "")}
                </a>
              ))}
            </>
          )}
        </p>

        <section className="mt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Supply
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {AURA_MAX_SUPPLY_DISPLAY} AURA
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            Fixed maximum supply. Proposed allocation — not a finalized legal offering. Team:{" "}
            {AURA_TEAM_VESTING.note}
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border/40">
            <table className="w-full min-w-[28rem] text-left text-[13px]">
              <thead className="bg-foreground/[0.03] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Allocation</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Share</th>
                  <th className="px-4 py-2.5 text-right font-semibold">AURA</th>
                </tr>
              </thead>
              <tbody>
                {AURA_ALLOCATIONS.map((a) => (
                  <tr key={a.id} className="border-t border-border/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{a.label}</td>
                    <td className="num px-4 py-2.5 text-right">{a.pct}%</td>
                    <td className="num px-4 py-2.5 text-right">{formatAuraAmount(a.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border/50">
                  <td className="px-4 py-2.5 font-semibold">Total</td>
                  <td className="num px-4 py-2.5 text-right font-semibold">100%</td>
                  <td className="num px-4 py-2.5 text-right font-semibold">
                    {AURA_MAX_SUPPLY_DISPLAY}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Private sale is a hard cap of 33% including the +11% launch bonus: 30% open{" "}
            <a href="/sale" className="text-primary underline-offset-2 hover:underline">
              pAURA
            </a>{" "}
            buyers, 3% project take bought through the same sale after 48 hours and locked for 90
            days after T-0. Unsold pAURA is never minted. Building Culture products that used BCC
            move to AURA at T-0 — Aura OS stays subscription software and does not require BCC
            today.
          </p>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Locks
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            Nothing free to dump
          </h2>
          <ul className="mt-5 space-y-3">
            {AURA_LOCKS.map((row) => (
              <li key={row.id} className="rounded-2xl border border-border/40 bg-card/20 px-5 py-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">{row.label}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{row.lock}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Launch wallets
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            New deployer. New treasury.
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Panel label="Token create">
              <p className="text-[14px] leading-relaxed">{AURA_LAUNCH_OPS.deployer}</p>
            </Panel>
            <Panel label="Launch treasury">
              <p className="text-[14px] leading-relaxed">{AURA_LAUNCH_OPS.treasury}</p>
              {auraLaunchTreasuryAddress() ? (
                <a
                  href={privateSaleBasescan(`/address/${auraLaunchTreasuryAddress()}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block break-all font-mono text-[12px] text-primary"
                >
                  {auraLaunchTreasuryAddress()}
                </a>
              ) : (
                <p className="mt-3 font-mono text-[12px] text-muted-foreground">
                  Not published yet — set AURA_LAUNCH_TREASURY on the VPS.
                </p>
              )}
            </Panel>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
            Today&apos;s pAURA USDC still forwards to the live sale contract treasury{" "}
            <a
              href={privateSaleBasescan(`/address/${PRIVATE_SALE_TREASURY}`)}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-primary"
            >
              {PRIVATE_SALE_TREASURY}
            </a>
            . That address is immutable on the current sale contract.
          </p>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            How to buy
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {AURA_BUY_PLAN.headline}
          </h2>
          <ol className="mt-5 space-y-3">
            {AURA_BUY_PLAN.steps.map((step, i) => (
              <li key={step.t} className="flex items-start gap-3 text-[14px]">
                <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5">
                  <span className="font-semibold text-foreground">{step.t}.</span>{" "}
                  <span className="text-muted-foreground">{step.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
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
            Founding seats ($299 one-time) unlock the cohort. The Hood mint is separate — 70% to
            launch liquidity, 30% to developer ops (servers). Seats ≠ equity and ≠ the market token.
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
            Supply and allocation are published above. The contract address is published only at T-0
            on aibusiness.fun and X @buildingcultu3. Listings are not promised.
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
            to="/whitepaper"
            className="inline-flex items-center rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Whitepaper →
          </Link>
          <Link
            to="/whitepaper"
            search={{ lang: "de" }}
            className="inline-flex items-center rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Whitepaper DE →
          </Link>
          <Link
            to="/wien"
            className="inline-flex items-center rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Wien hub →
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
