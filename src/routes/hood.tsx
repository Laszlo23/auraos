import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { HoodEarlyPassGate } from "@/components/aura/hood-early-pass";
import { HoodMintCountdown } from "@/components/aura/hood-mint-countdown";
import { HoodPortrait, HoodStillFrame } from "@/components/aura/hood-portrait";
import { HoodAuraClaim } from "@/components/aura/hood-aura-claim";
import { HoodWalletMint } from "@/components/aura/hood-wallet-mint";
import { PublicMobileMenu, publicPrimaryNav } from "@/components/aura/public-mobile-menu";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { FOUNDING_SEAT_DISPLAY, FOUNDING_SEAT_DISPLAY_DE } from "@/lib/founding-price";
import { HOOD, HOOD_COPY, HOOD_COURT, HOOD_LEGENDS, HOOD_VALUE } from "@/lib/hood";
import { HOOD_EARLY_COPY, HOOD_EARLY_SUPPORTER_CAP } from "@/lib/hood-early";
import { FIRST_THOUSAND } from "@/lib/roadmap";
import { hoodMintIsOpen } from "@/lib/hood-mint";
import { resolveHoodTraits } from "@/lib/hood-traits";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { SITE_URL, url } from "@/lib/site";

const TITLE = "The Hood — first 1,000 extras + hold-to-earn";
const DESCRIPTION =
  "Only the first 1,000 members get Hood extras: hold-to-earn from real desk fees while you hold, 7,777 AURA in your wallet at T-0, 70% mint to launch liquidity.";

/** Mix core court with legends so the page shows real visual variety. */
const FEATURED_COURT = [
  HOOD_COURT[0],
  HOOD_COURT[1],
  ...HOOD_LEGENDS.filter((r) => ["phantom", "courier", "raider", "muse"].includes(r.id)),
]
  .filter(Boolean)
  .slice(0, 6);

/** Core value props in the first scroll — skip desk/robinhood clutter. */
const FEATURED_VALUE = HOOD_VALUE.filter((row) =>
  ["hold-to-earn", "circle", "lp", "gift"].includes(row.id),
);

export const Route = createFileRoute("/hood")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url(HOOD.path) },
      ...ogCampaignMeta("hood"),
    ],
    links: [{ rel: "canonical", href: url(HOOD.path) }],
  }),
  component: HoodPage,
});

function HoodPage() {
  const { t, locale } = useLocale();
  const de = locale === "de";
  const price = de ? FOUNDING_SEAT_DISPLAY_DE : FOUNDING_SEAT_DISPLAY;
  const [previewId, setPreviewId] = useState(1);
  const [earlyUnlocked, setEarlyUnlocked] = useState(false);
  useEffect(() => {
    const tick = window.setInterval(() => {
      setPreviewId((n) => (n % 12) + 1);
    }, 4200);
    return () => window.clearInterval(tick);
  }, []);
  const preview = resolveHoodTraits(previewId);

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-[#07090e] text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -5%, oklch(0.78 0.16 85 / 0.28), transparent 55%), radial-gradient(ellipse 40% 35% at 90% 20%, oklch(0.48 0.12 155 / 0.18), transparent 50%)",
        }}
      />

      <header className="relative z-20 border-b border-gold/10 bg-[#07090e]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-2.5 sm:px-6">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            ◎ Aura OS
          </Link>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/80 sm:inline">
            {HOOD.collection}
          </span>
          <nav className="ml-auto hidden items-center gap-4 lg:flex">
            <Link
              to="/tokenomics"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              Tokenomics
            </Link>
          </nav>
          <a
            href="#mint"
            className="ml-auto rounded-2xl bg-gold px-4 py-2 text-xs font-semibold text-background lg:ml-0"
          >
            {de ? `Mint · ${price}` : `Mint · ${price}`}
          </a>
          <PublicMobileMenu items={publicPrimaryNav(t)} hideFrom="lg" />
        </div>
      </header>

      {/* First viewport: brand + one headline + one line + CTA + dominant portrait */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100svh-3.25rem)] max-w-6xl items-center gap-6 px-5 py-4 sm:gap-8 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 lg:py-6">
        <motion.div
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md lg:max-w-none lg:order-none order-first"
        >
          <div
            aria-hidden
            className="hood-glow pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(circle,oklch(0.82_0.16_85/0.4),transparent_68%)]"
          />
          <HoodPortrait tokenId={previewId} size="hero" className="relative w-full" />
          <p className="relative mt-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/85">
            #{preview.tokenId} / {HOOD.maxSupply} · {preview.character.name}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-gold">
            {de ? HOOD_COPY.kickerDe : HOOD_COPY.kicker}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,7vw,4.2rem)] font-semibold leading-[0.94] tracking-tight">
            {de ? HOOD_COPY.titleDe : HOOD_COPY.title}
            <span className="mt-1.5 block text-gold">
              {de ? HOOD_COPY.title2De : HOOD_COPY.title2}
            </span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-foreground/80">
            {de
              ? "1.000 Sitze. 7.777 AURA in deine Wallet ab T-0. 70% Mint kauft nur das offizielle Paar."
              : "1,000 seats. 7,777 AURA in your wallet at T-0. 70% of each mint only buys the official pair."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#mint"
              className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-background"
            >
              {de ? `Mint · ${price}` : `Mint · ${price}`} <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/tokenomics"
              className="inline-flex items-center gap-2 rounded-2xl border border-gold/35 px-5 py-3 text-sm font-semibold text-foreground/90"
            >
              {de ? "Tokenomics" : "Tokenomics"}
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {de ? HOOD_COPY.wipDe : HOOD_COPY.wip}
          </p>
        </motion.div>
      </section>

      <section
        id="mint"
        className="relative z-10 scroll-mt-20 border-t border-gold/10 bg-[#07090e]/60"
      >
        <div className="mx-auto max-w-6xl space-y-5 px-5 py-10 sm:px-6">
          <HoodMintCountdown locale={de ? "de" : "en"} />
          <HoodEarlyPassGate locale={de ? "de" : "en"} onUnlocked={setEarlyUnlocked} />
          {(hoodMintIsOpen() || earlyUnlocked) && (
            <HoodWalletMint locale={de ? "de" : "en"} earlyUnlocked={earlyUnlocked} />
          )}
          <HoodAuraClaim locale={de ? "de" : "en"} />
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {de ? HOOD_EARLY_COPY.leadDe : HOOD_EARLY_COPY.lead} Cap {HOOD_EARLY_SUPPORTER_CAP}.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-10 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">
          {de ? "Der Eid" : "The oath"}
        </p>
        <p className="mt-3 max-w-3xl font-display text-[clamp(1.35rem,3.2vw,2rem)] font-semibold leading-tight">
          {de
            ? "70% jedes 299-$-Mints → Launch-Liquidität. 30% → Ops. AURA claimbar ab T-0."
            : "70% of each $299 mint → launch liquidity. 30% → ops. AURA claimable at T-0."}
        </p>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          {de
            ? "209,30 $ bleiben im Escrow und können nur AURA auf dem festgelegten Paar kaufen. 89,70 $ halten den Desk. Kein LP-Share, keine Rendite-Garantie."
            : "$209.30 stays in escrow and can only buy AURA on the committed pair. $89.70 keeps the desk on. Not an LP-share token, not a return promise."}
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-12 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
              {de ? "Der Hof" : "The court"}
            </p>
            <h2 className="mt-2 font-display text-[clamp(1.5rem,3.5vw,2.1rem)] font-semibold tracking-tight">
              {de ? "Vier Gesichter. Tausend Sitze." : "Four faces. A thousand seats."}
            </h2>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FEATURED_COURT.map((row) => (
            <figure key={row.id} className="overflow-hidden rounded-[1.2rem] border border-gold/20">
              <HoodStillFrame src={row.art} alt={`${row.en} — Hood court portrait.`} />
              <figcaption className="px-2.5 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
                  {de ? row.de : row.en}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {de ? row.deRole : row.enRole}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-14 sm:px-6">
        <div className="rounded-[1.6rem] border border-gold/25 bg-gold/[0.05] px-5 py-6 sm:px-7 sm:py-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
            {de ? FIRST_THOUSAND.eyebrowDe : FIRST_THOUSAND.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.5rem,3.5vw,2.2rem)] font-semibold tracking-tight">
            {de ? FIRST_THOUSAND.titleDe : FIRST_THOUSAND.title}
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            {de ? FIRST_THOUSAND.holdLeadDe : FIRST_THOUSAND.holdLead}
          </p>
          <Link
            to="/roadmap"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-gold"
          >
            {de ? "Fahrplan" : "Roadmap"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {FEATURED_VALUE.map((row) => (
            <div
              key={row.id}
              className="rounded-[1.4rem] border border-gold/15 bg-foreground/[0.03] px-4 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
                {de ? row.de : row.en}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {de ? row.deBody : row.enBody}
              </p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter
        share={{
          url: `${SITE_URL}${HOOD.path}`,
          text: de
            ? "The Hood — Founding Circle. 70% Mint in die Liquidität, 30% Ops."
            : "The Hood — founding circle. 70% mint to liquidity, 30% to ops.",
          placement: "hood",
        }}
      />
    </main>
  );
}
