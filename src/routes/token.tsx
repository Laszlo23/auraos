import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { lazy, Suspense } from "react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { NftDeskPlaybookPanel } from "@/components/aura/nft-desk-playbook";
import {
  PublicMobileMenu,
  publicNavMore,
  publicNavPrimary,
} from "@/components/aura/public-site-header";
import { RobinhoodMomentumStrip } from "@/components/aura/robinhood-momentum-strip";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { visibleRefetchInterval } from "@/hooks/use-aura";
import {
  HOOD_GIFT_AURA,
  HOOD_MAX_SUPPLY,
  LAUNCH_PROOF,
} from "@/lib/aura-launch";
import {
  AURA_OFFICIAL_CA_SOURCES,
  AURA_PAIR_URL,
  auraCaLive,
} from "@/lib/aura-token";
import { auraPairAddress, auraTokenAddress } from "@/lib/aura-self-launch";
import { num } from "@/lib/format";
import { OG_CAMPAIGN, ogCampaignUrl } from "@/lib/og-campaign";
import { PRIVATE_SALE_BONUS_BPS, privateSaleBasescan } from "@/lib/private-sale";
import { getPrivateSaleLive } from "@/lib/private-sale.functions";
import {
  loc,
  REFERENCE_PEG_DISCLAIMER,
  TREASURY_REFERENCE_BASKET,
} from "@/lib/robinhood-momentum";
import { pageHead } from "@/lib/seo";
import { SITE_URL, TOKEN_LAUNCH_DISPLAY } from "@/lib/site";

const TITLE = "AURA token — buy pAURA, early giveback, hold path";
const DESCRIPTION =
  "Own the token — OS optional. Buy pAURA on Base, Hood 7,777 gift, 1.11× at T-0, honest TSLA reference peg. No fake share ownership.";

export const Route = createFileRoute("/token")({
  loader: async () => {
    const { withTimeout } = await import("@/lib/timeout-helper");
    return withTimeout(getPrivateSaleLive(), 8000, {
      configured: false,
      address: null,
      sold: 0,
      remaining: 0,
      cap: 0,
      usdcRaised: 0,
      saleClosed: false,
      paused: false,
    });
  },
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/token",
      image: ogCampaignUrl("token"),
      imageAlt: OG_CAMPAIGN.token.alt,
      jsonLd: {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/token`,
      },
    }),
  component: TokenInvestorRoute,
});

const TokenWalletStrip = lazy(() =>
  import("@/components/aura/token-investor-wallet-lazy").then((m) => ({
    default: m.TokenInvestorWalletLazy,
  })),
);

function TokenInvestorRoute() {
  return <TokenInvestorPage />;
}

function TokenInvestorPage() {
  const { t, locale } = useLocale();
  const de = locale === "de";
  const live = Route.useLoaderData();
  const liveQ = useQuery({
    queryKey: ["private-sale-live", "token-hub"],
    queryFn: () => getPrivateSaleLive(),
    initialData: live,
    refetchInterval: visibleRefetchInterval(20_000),
  });
  const stats = liveQ.data ?? live;
  const ca = auraTokenAddress();
  const pair = auraPairAddress();
  const caLive = auraCaLive();
  const launchMultiple = 1 + PRIVATE_SALE_BONUS_BPS / 10_000;

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% -10%, oklch(0.72 0.12 85 / 0.16), transparent 55%), radial-gradient(ellipse 55% 40% at 92% 8%, oklch(0.55 0.1 200 / 0.2), transparent 50%)",
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
            <Link to="/sale" className="text-muted-foreground hover:text-foreground">
              {de ? "Kaufen" : "Buy"}
            </Link>
            <Link to="/hood" className="text-gold hover:text-gold/90">
              Hood
            </Link>
            <Link to="/tokenomics" className="text-muted-foreground hover:text-foreground">
              {t("landing.navTokenomics")}
            </Link>
          </nav>
          <LanguageToggle className="md:ml-0" />
          <PublicMobileMenu
            className="md:hidden"
            hideFrom="md"
            primary={publicNavPrimary(t)}
            more={publicNavMore(t)}
          />
        </div>
      </header>

      <div className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
        {/* Hero — one composition */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          AURA
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.6rem,9vw,4rem)] font-semibold leading-[0.96] tracking-tight">
          AURA
        </h1>
        <p className="mt-4 max-w-md text-[17px] leading-relaxed text-foreground/85">
          {de
            ? "Den Token besitzen — OS optional."
            : "Own the token — OS optional."}
        </p>
        <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
          {de
            ? "Kauf → Claim → Hold. Kein Fake-Aktienanspruch. TSLA ist Referenz-Peg, kein RWA."
            : "Buy → claim → hold. No fake share claim. TSLA is a reference peg, not RWA."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            to="/sale"
            className="cta-liquid flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            {de ? "pAURA kaufen" : "Buy pAURA"} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/hood"
            className="flex items-center justify-center gap-2 rounded-2xl border border-gold/35 bg-gold/10 px-7 py-4 text-sm font-semibold text-gold"
          >
            {de ? "Hood holen" : "Get Hood"}
          </Link>
          <a
            href="#rules"
            className="inline-flex items-center justify-center gap-1.5 text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {de ? "Regeln lesen" : "Read rules"}
          </a>
          <a
            href="#nft-desk"
            className="inline-flex items-center justify-center gap-1.5 text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {de ? "NFT-Desk" : "NFT desk"}
          </a>
        </div>

        {/* 1. How to get AURA now */}
        <section className="mt-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {de ? "Jetzt" : "Now"}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {de ? "So holst du AURA jetzt" : "How to get AURA now"}
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            {de
              ? "pAURA läuft live auf Base. Kein Firmen-Onboarding nötig."
              : "pAURA is live on Base. No company onboarding required."}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Stat label={de ? "Verkauft" : "Sold"} value={num(Math.floor(stats.sold))} />
            <Stat
              label={de ? "Übrig" : "Left"}
              value={num(Math.floor(stats.remaining || stats.cap))}
            />
            <Stat
              label={de ? "Raised" : "Raised"}
              value={`$${num(Math.floor(stats.usdcRaised))}`}
            />
          </div>
          <Link
            to="/sale"
            className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:underline"
          >
            {de ? "Zur Private Sale →" : "Open private sale →"}
          </Link>
        </section>

        {/* Wallet strip */}
        <div className="mt-10">
          <Suspense
            fallback={
              <p className="text-[13px] text-muted-foreground">
                {de ? "Wallet wird geladen…" : "Loading wallet…"}
              </p>
            }
          >
            <TokenWalletStrip locale={de ? "de" : "en"} />
          </Suspense>
        </div>

        {/* 2. Early circle giveback */}
        <section className="mt-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
            {de ? "Early Circle" : "Early circle"}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {de ? "Giveback für Early Investors" : "Early circle giveback"}
          </h2>
          <ul className="mt-5 space-y-3">
            <GiveRow
              title={de ? `pAURA → ×${launchMultiple} bei T-0` : `pAURA → ×${launchMultiple} at T-0`}
              body={
                de
                  ? `1 pAURA wird ${launchMultiple} AURA. Bonus ist on-chain, nicht Marketing.`
                  : `1 pAURA becomes ${launchMultiple} AURA. On-chain bonus, not marketing fluff.`
              }
            />
            <GiveRow
              title={
                de
                  ? `Hood: ${num(HOOD_MAX_SUPPLY)} Cap → ${num(HOOD_GIFT_AURA)} AURA Gift`
                  : `Hood: ${num(HOOD_MAX_SUPPLY)} cap → ${num(HOOD_GIFT_AURA)} AURA gift`
              }
              body={loc(locale, {
                en: LAUNCH_PROOF.bullets.find((b) => b.id === "gift")!.en,
                de: LAUNCH_PROOF.bullets.find((b) => b.id === "gift")!.de,
              })}
            />
            <GiveRow
              title={de ? "70% Mint-USDC → LP Escrow" : "70% mint USDC → LP escrow"}
              body={loc(locale, {
                en: LAUNCH_PROOF.bullets.find((b) => b.id === "escrow")!.en,
                de: LAUNCH_PROOF.bullets.find((b) => b.id === "escrow")!.de,
              })}
            />
            <GiveRow
              title={de ? "Genesis 777 Profil-Tier" : "Genesis 777 profile tier"}
              body={
                de
                  ? "TokenIds 1–777 + Early Contributors — Profil-Tier, ändert die Hood-Cap von 1.000 nicht."
                  : "TokenIds 1–777 + early contributors — profile tier; does not raise the 1,000 Hood cap."
              }
            />
          </ul>
        </section>

        {/* 3. Trust strip */}
        <section id="rules" className="mt-16 scroll-mt-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {de ? "Trust" : "Trust"}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {de ? "Offizielle Quellen" : "Official sources only"}
          </h2>
          {caLive && ca ? (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">
                AURA CA
              </p>
              <a
                href={privateSaleBasescan(`/token/${ca}`)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block break-all font-mono text-[13px] text-foreground hover:text-primary"
              >
                {ca}
              </a>
              {pair || AURA_PAIR_URL ? (
                <a
                  href={
                    AURA_PAIR_URL ??
                    (pair ? privateSaleBasescan(`/address/${pair}`) : "#")
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[13px] font-semibold text-primary hover:underline"
                >
                  {de ? "Pair / Basescan →" : "Pair / Basescan →"}
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed">
              {de
                ? `CA veröffentlicht bei T-0 (${TOKEN_LAUNCH_DISPLAY}). Nie Screenshots oder DMs vertrauen.`
                : `CA publishes at T-0 (${TOKEN_LAUNCH_DISPLAY}). Never trust screenshots or DMs.`}
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {AURA_OFFICIAL_CA_SOURCES.map((s) => (
              <li key={s}>
                <a
                  href={s}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[14px] font-semibold text-primary hover:underline"
                >
                  {s.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Robinhood + peg tape */}
        <section className="mt-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Robinhood · Peg
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {de ? "Referenz-Tape, kein Aktienclaim" : "Reference tape, not a share claim"}
          </h2>
          <div className="mt-4">
            <RobinhoodMomentumStrip />
          </div>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border/40">
            <table className="w-full min-w-[20rem] text-left text-[13px]">
              <thead className="bg-foreground/[0.03] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">
                    {de ? "Symbol" : "Symbol"}
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">%</th>
                  <th className="px-4 py-2.5 font-semibold">{de ? "Rolle" : "Role"}</th>
                </tr>
              </thead>
              <tbody>
                {TREASURY_REFERENCE_BASKET.map((row) => (
                  <tr key={row.id} className="border-t border-border/30">
                    <td className="px-4 py-2.5 font-semibold">{row.symbol}</td>
                    <td className="num px-4 py-2.5 text-right">{row.weightPct}%</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {loc(locale, row.role)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            {loc(locale, REFERENCE_PEG_DISCLAIMER)}
          </p>
          <Link
            to="/tokenomics"
            hash="robinhood"
            className="mt-3 inline-flex text-[14px] font-semibold text-primary hover:underline"
          >
            {de ? "Vollständige Peg-Story →" : "Full peg story →"}
          </Link>
        </section>

        {/* 5. Hold-to-earn honest */}
        <section className="mt-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Hold-to-earn
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {de ? "Nach Audit — noch nicht live" : "After audit — not live yet"}
          </h2>
          <p className="mt-3 max-w-xl rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3 text-[14px] leading-relaxed text-muted-foreground">
            {de
              ? "Founding-Circle-Anteil an echten Desk-, Katalog- und x402-Fees, solange der Hood in der Wallet liegt. Kommt bei T-0 nach externem Audit. Kein fixer APY. Kein Equity."
              : "Founding-circle cut of real desk, catalog, and x402 fees while the Hood sits in your wallet. Ships at T-0 after external audit. Not a fixed APY. Not equity."}
          </p>
          <ul className="mt-4 space-y-2 text-[13px] text-muted-foreground">
            <li>· {de ? "Desk- / Quant-Fees" : "Desk / Quant fees"}</li>
            <li>· {de ? "Katalog-Umsatz" : "Catalog revenue"}</li>
            <li>· {de ? "x402 bezahlte Calls" : "x402 paid calls"}</li>
          </ul>
          <p className="mt-4 text-[12px] text-muted-foreground">
            {de
              ? "Fair Launch bleibt auf Base, bis Robinhood-Contracts da sind."
              : "Fair launch stays on Base until Robinhood contracts ship."}
          </p>
        </section>

        {/* 6. NFT desk playbook + OpenSea compat */}
        <div className="mt-16">
          <NftDeskPlaybookPanel />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 px-3 py-3">
      <p className="num text-lg font-semibold">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
  );
}

function GiveRow({ title, body }: { title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-border/40 bg-foreground/[0.02] px-4 py-4">
      <p className="text-[13px] font-semibold tracking-tight">{title}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}
