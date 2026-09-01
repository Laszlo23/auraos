import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { HoodShell } from "@/components/aura/hood-shell";
import { HoodMintStage } from "@/components/aura/hood-mint-stage";
import { HoodPortrait, HoodStillFrame } from "@/components/aura/hood-portrait";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { FOUNDING_SEAT_DISPLAY, FOUNDING_SEAT_DISPLAY_DE } from "@/lib/founding-price";
import { HOOD, HOOD_COPY, HOOD_COURT, HOOD_LEGENDS, HOOD_VALUE } from "@/lib/hood";
import { FIRST_THOUSAND } from "@/lib/roadmap";
import { resolveHoodTraits } from "@/lib/hood-traits";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { SITE_URL, url } from "@/lib/site";

const TITLE = "The Hood — first 1,000 extras + hold-to-earn";
const DESCRIPTION =
  "Only the first 1,000 members get Hood extras: hold-to-earn from real desk fees while you hold, 7,777 AURA in your wallet at T-0, 70% mint to launch liquidity.";

const FEATURED_COURT = [
  HOOD_COURT[0],
  HOOD_COURT[1],
  ...HOOD_LEGENDS.filter((r) => ["phantom", "courier", "raider", "muse"].includes(r.id)),
]
  .filter(Boolean)
  .slice(0, 6);

const FEATURED_VALUE = HOOD_VALUE.filter((row) =>
  ["hold-to-earn", "circle", "lp", "gift", "robinhood"].includes(row.id),
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
  const { locale } = useLocale();
  const de = locale === "de";
  const price = de ? FOUNDING_SEAT_DISPLAY_DE : FOUNDING_SEAT_DISPLAY;
  const [previewId, setPreviewId] = useState(1);
  useEffect(() => {
    const tick = window.setInterval(() => {
      setPreviewId((n) => (n % 12) + 1);
    }, 4200);
    return () => window.clearInterval(tick);
  }, []);
  const preview = resolveHoodTraits(previewId);

  return (
    <HoodShell>
      {/* Hero: copy first on mobile, portrait right on desktop */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-12 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="order-1 flex flex-col justify-center lg:order-none"
        >
          <p className="label-luxury-gold">{de ? HOOD_COPY.kickerDe : HOOD_COPY.kicker}</p>
          <h1 className="display-hero mt-4 text-[clamp(2.5rem,7vw,4.5rem)] font-semibold leading-[0.92]">
            {de ? HOOD_COPY.titleDe : HOOD_COPY.title}
            <span className="mt-2 block font-serif text-gold italic">
              {de ? HOOD_COPY.title2De : HOOD_COPY.title2}
            </span>
          </h1>
          <p className="prose-narrow mt-5 text-[15px] text-ink-soft">
            {de
              ? "1.000 Sitze. 7.777 AURA ab T-0. Jeder Mint stärkt nur das offizielle Paar."
              : "1,000 seats. 7,777 AURA at T-0. Every mint strengthens only the official pair."}
          </p>
          <p className="mt-4 rounded-2xl border border-gold/25 bg-gold/5 px-4 py-3 text-[13px] leading-relaxed text-foreground/88">
            {de ? HOOD_COPY.robinhoodDe : HOOD_COPY.robinhood}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#mint"
              className="cta-liquid inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-background shadow-[var(--shadow-gold)]"
            >
              {de ? `Mint · ${price}` : `Mint · ${price}`} <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/tokenomics"
              className="inline-flex items-center gap-2 rounded-2xl border border-gold/35 bg-hood-stage/40 px-5 py-3 text-sm font-semibold text-foreground/90 backdrop-blur-sm"
            >
              {de ? "Tokenomics" : "Tokenomics"}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative order-2 mx-auto w-full max-w-md lg:order-none lg:max-w-none"
        >
          <div
            aria-hidden
            className="hood-glow pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_40%,transparent),transparent_68%)]"
          />
          <HoodPortrait tokenId={previewId} size="hero" showMeta={false} className="relative w-full" />
          <p className="relative mt-3 text-center label-luxury-gold text-[10px] tracking-[0.28em]">
            #{preview.tokenId} / {HOOD.maxSupply} · {preview.character.name}
          </p>
        </motion.div>
      </section>

      <div className="vital-line mx-auto max-w-6xl px-5 sm:px-6" aria-hidden />

      <section id="mint" className="relative z-10 scroll-mt-24 border-t border-gold/10">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
          <HoodMintStage locale={de ? "de" : "en"} />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <p className="label-luxury-gold">{de ? "Der Hof" : "The court"}</p>
        <h2 className="mt-3 font-display text-[clamp(1.6rem,3.5vw,2.25rem)] font-semibold tracking-tight">
          {de ? "Hof & Legenden. Tausend Sitze." : "Court & legends. A thousand seats."}
        </h2>
        <p className="prose-narrow mt-3 text-[14px] text-muted-foreground">
          {de
            ? "Jeder Hood ist ein eigenes Portrait — Hof, Legenden, Noggles, Mood und Siegel."
            : "Each Hood is a unique portrait — court, legends, noggles, mood, and seal."}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {FEATURED_COURT.map((row) => (
            <figure key={row.id} className="group overflow-hidden rounded-[1.25rem] border border-gold/20 transition-colors hover:border-gold/40">
              <HoodStillFrame src={row.art} alt={`${row.en} — Hood court portrait.`} />
              <figcaption className="px-3 py-3">
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

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20">
        <div className="jewel rounded-[1.65rem] border border-gold/25 px-6 py-7 sm:px-8 sm:py-8">
          <p className="label-luxury-gold">{de ? FIRST_THOUSAND.eyebrowDe : FIRST_THOUSAND.eyebrow}</p>
          <h2 className="mt-2 font-display text-[clamp(1.5rem,3.5vw,2.2rem)] font-semibold tracking-tight">
            {de ? FIRST_THOUSAND.titleDe : FIRST_THOUSAND.title}
          </h2>
          <p className="prose-narrow mt-3 text-[14px] text-muted-foreground">
            {de ? FIRST_THOUSAND.holdLeadDe : FIRST_THOUSAND.holdLead}
          </p>
          <Link
            to="/roadmap"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-gold"
          >
            {de ? "Fahrplan" : "Roadmap"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <blockquote className="display-editorial mt-10 text-[clamp(1.35rem,3vw,2rem)] text-ivory/95">
          {de
            ? "70% jedes Mints in die Launch-Liquidität. 30% halten den Desk. AURA ab T-0."
            : "70% of each mint to launch liquidity. 30% keeps the desk on. AURA from T-0."}
        </blockquote>
        <p className="prose-narrow mt-4 text-[13px] text-muted-foreground">
          {de
            ? "Escrow kauft nur AURA auf dem festgelegten Paar. Kein LP-Share, keine Rendite-Garantie."
            : "Escrow only buys AURA on the committed pair. Not an LP-share token, not a return promise."}{" "}
          <Link to="/tokenomics" className="font-semibold text-gold hover:underline">
            {de ? "Tokenomics →" : "Tokenomics →"}
          </Link>
        </p>

        <div className="vital-line my-10" aria-hidden />

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURED_VALUE.map((row) => (
            <div key={row.id} className="hood-panel px-4 py-4">
              <div className="icon-well-gold mb-3 h-10 w-10 text-sm">◈</div>
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
    </HoodShell>
  );
}
