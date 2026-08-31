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
import { HOOD, HOOD_AGENTS, HOOD_COPY, HOOD_COURT, HOOD_VALUE } from "@/lib/hood";
import { HOOD_EARLY_COPY, HOOD_EARLY_SUPPORTER_CAP } from "@/lib/hood-early";
import { FIRST_THOUSAND } from "@/lib/roadmap";
import { hoodMintIsOpen } from "@/lib/hood-mint";
import { resolveHoodTraits } from "@/lib/hood-traits";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { SITE_URL, url } from "@/lib/site";

const TITLE = "The Hood — first 1,000 extras + hold-to-earn";
const DESCRIPTION =
  "Only the first 1,000 members get Hood extras: hold-to-earn from real desk fees while you hold, 7,777 AURA in your wallet at T-0, 70% mint to launch liquidity.";

const TICKER = [
  "NOT LAUNCHED YET",
  "STILL DEBUGGING",
  "THE HOOD",
  "1 / 1000",
  "NOBODY IS CHARGING YOU",
  "ATLAS WOULD YELL",
] as const;

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
    }, 3200);
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
            "radial-gradient(ellipse 80% 60% at 50% -8%, oklch(0.78 0.16 85 / 0.34), transparent 58%), radial-gradient(ellipse 45% 40% at 88% 18%, oklch(0.48 0.12 155 / 0.28), transparent 55%), radial-gradient(ellipse 50% 36% at 8% 88%, oklch(0.42 0.08 25 / 0.22), transparent 50%)",
        }}
      />

      <header className="relative z-20 border-b border-gold/15 bg-background/20 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:px-6">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            ◎ Aura OS
          </Link>
          <nav className="ml-auto hidden items-center gap-4 lg:flex">
            <Link
              to="/access"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              {price}
            </Link>
            <Link
              to="/tokenomics"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              Tokenomics
            </Link>
          </nav>
          <Link
            to="/access"
            className="ml-auto rounded-2xl bg-gold px-4 py-2 text-xs font-semibold text-background lg:ml-0"
          >
            {de ? `Seat ${price}` : `Seat ${price}`}
          </Link>
          <PublicMobileMenu items={publicPrimaryNav(t)} hideFrom="lg" />
        </div>
      </header>

      <div className="relative z-10 overflow-hidden border-b border-gold/10">
        <div className="ticker-track flex w-max gap-10 py-2.5 pl-6 text-[10px] font-semibold uppercase tracking-[0.32em] text-gold/70">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((word, i) => (
            <span key={`${word}-${i}`}>{word}</span>
          ))}
        </div>
      </div>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="hood-frame relative mx-auto w-full max-w-lg"
        >
          <div
            aria-hidden
            className="hood-glow pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,oklch(0.82_0.16_85/0.45),transparent_68%)]"
          />
          <HoodPortrait tokenId={previewId} size="hero" className="relative w-full" />
          <p className="relative mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/85">
            {HOOD.collection} · #{preview.tokenId} / {HOOD.maxSupply} · {preview.character.name}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-gold">
            {de ? HOOD_COPY.kickerDe : HOOD_COPY.kicker}
          </p>
          <div className="mt-4 rounded-[1.4rem] border border-gold/35 bg-[#07090e]/70 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              {de ? HOOD_COPY.wipDe : HOOD_COPY.wip}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/85">
              {de ? HOOD_COPY.smileDe : HOOD_COPY.smile}
            </p>
          </div>
          <h1 className="mt-4 font-display text-[clamp(2.6rem,8vw,4.6rem)] font-semibold leading-[0.94] tracking-tight">
            {de ? HOOD_COPY.titleDe : HOOD_COPY.title}
            <span className="mt-2 block text-gold">
              {de ? HOOD_COPY.title2De : HOOD_COPY.title2}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-foreground/80">
            {de ? HOOD_COPY.leadDe : HOOD_COPY.lead}
          </p>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            {de ? HOOD_COPY.robinhoodDe : HOOD_COPY.robinhood}
          </p>

          <div className="mt-8">
            <HoodMintCountdown locale={de ? "de" : "en"} />
          </div>
          <div className="mt-6 space-y-4">
            <HoodEarlyPassGate locale={de ? "de" : "en"} onUnlocked={setEarlyUnlocked} />
            {(hoodMintIsOpen() || earlyUnlocked) && (
              <HoodWalletMint locale={de ? "de" : "en"} earlyUnlocked={earlyUnlocked} />
            )}
            <HoodAuraClaim locale={de ? "de" : "en"} />
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            {de ? HOOD_EARLY_COPY.leadDe : HOOD_EARLY_COPY.lead} Cap {HOOD_EARLY_SUPPORTER_CAP}.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/access"
              className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-foreground/[0.04] px-5 py-3 text-sm font-semibold"
            >
              {de ? `Founding Seat ${price}` : `Founding seat ${price}`}{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {hoodMintIsOpen() || earlyUnlocked ? (
              <a
                href="#hood-early"
                className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-foreground/[0.04] px-5 py-3 text-sm font-semibold"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {de ? `Early Mint · ${price}` : `Early mint · ${price}`}
              </a>
            ) : (
              <Link
                to="/tokenomics"
                className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-foreground/[0.04] px-5 py-3 text-sm font-semibold"
              >
                {de ? "Tokenomics lesen" : "Read tokenomics"}
              </Link>
            )}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            {de
              ? "Wallet-Mint mit Early Pass oder am Drop-Tag. Seat weckt die Firma. Utility — kein Equity, kein AURA-CA."
              : "Wallet mint with early pass or on drop day. Seat wakes the company. Utility — not equity, not an AURA CA."}
          </p>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-10 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] border border-gold/25 bg-[linear-gradient(135deg,oklch(0.78_0.16_85/0.16),oklch(0.22_0.04_150/0.28)_55%,transparent)] px-6 py-7 sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">
            {de ? "Der Eid" : "The oath"}
          </p>
          <p className="mt-3 max-w-3xl font-display text-[clamp(1.4rem,3.4vw,2.1rem)] font-semibold leading-tight">
            {de
              ? "70% jedes 299-$-Mints gehen in die Launch-Liquidität. 30% an Developer-Ops — Server, Infra, Desk."
              : "70% of each $299 mint goes to launch liquidity. 30% to developer ops — servers, infra, the desk."}
          </p>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {de
              ? "Das steht im Contract, nicht nur in der Policy. 209,30 $ bleiben im Escrow und kaufen bei T-0 AURA in die Hood-Sperre. 89,70 $ halten die Lichter an. Kein LP-Share-Token, keine Rendite-Garantie."
              : "That's in the contract, not just a policy. $209.30 stays in escrow and buys AURA into the Hood lock at T-0. $89.70 keeps the lights on. Not an LP-share token, not a return promise."}
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-14 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
          {de ? "Der Hof" : "The court"}
        </p>
        <h2 className="mt-2 font-display text-[clamp(1.6rem,4vw,2.4rem)] font-semibold tracking-tight">
          {de ? "Könige, Queen, Chaos." : "Kings, queen, chaos."}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {HOOD_COURT.map((row) => (
            <figure key={row.id} className="overflow-hidden rounded-[1.4rem] border border-gold/20">
              <HoodStillFrame src={row.art} alt={`${row.en} — Hood court portrait.`} />
              <figcaption className="px-3 py-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold">
                  {de ? row.de : row.en}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {de ? row.deRole : row.enRole}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-14 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
          {de ? "Die Firma" : "The company"}
        </p>
        <h2 className="mt-2 font-display text-[clamp(1.6rem,4vw,2.4rem)] font-semibold tracking-tight">
          {de ? "Das ganze AI-Team. Im Kreis." : "The whole AI team. In the circle."}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {HOOD_AGENTS.map((row) => (
            <figure key={row.id} className="overflow-hidden rounded-[1.4rem] border border-gold/20">
              <HoodStillFrame
                src={row.art}
                alt={`${row.name} — ${row.enRole}. Hood court portrait.`}
              />
              <figcaption className="px-3 py-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold">
                  {row.name}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {de ? row.deRole : row.enRole}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-12 sm:px-6">
        <div className="rounded-[1.8rem] border border-gold/30 bg-gold/[0.06] px-6 py-7 sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
            {de ? FIRST_THOUSAND.eyebrowDe : FIRST_THOUSAND.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.6rem,4vw,2.4rem)] font-semibold tracking-tight">
            {de ? FIRST_THOUSAND.titleDe : FIRST_THOUSAND.title}
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {de ? FIRST_THOUSAND.leadDe : FIRST_THOUSAND.lead}
          </p>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-foreground/90">
            <span className="font-semibold text-gold">
              {de ? FIRST_THOUSAND.holdTitleDe : FIRST_THOUSAND.holdTitle}.{" "}
            </span>
            {de ? FIRST_THOUSAND.holdLeadDe : FIRST_THOUSAND.holdLead}
          </p>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            {de ? FIRST_THOUSAND.disclaimerDe : FIRST_THOUSAND.disclaimer}
          </p>
          <Link
            to="/roadmap"
            className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-gold"
          >
            {de ? "Ganzer Fahrplan" : "The whole roadmap"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mt-10 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {de ? "Was du bekommst" : "What the first 1,000 get"}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {HOOD_VALUE.map((row) => (
            <div
              key={row.id}
              className="rounded-[1.6rem] border border-gold/20 bg-foreground/[0.035] px-5 py-5"
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold">
                {de ? row.de : row.en}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {de ? row.deBody : row.enBody}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <div className="rounded-[1.8rem] border border-emerald-400/20 bg-emerald-500/[0.06] px-6 py-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/90">
            Robinhood Chain
          </p>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-foreground/85">
            {de
              ? "The Hood geht auch auf Robinhood Chain. Bis der Contract dort live ist, mintest du auf Base. Offizielle CA nur auf aibusiness.fun — nie per DM."
              : "The Hood is going to Robinhood Chain too. Until that contract is live, you mint on Base. Official CA only on aibusiness.fun — never in a DM."}
          </p>
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
