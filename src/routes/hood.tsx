import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { PublicMobileMenu, publicPrimaryNav } from "@/components/aura/public-mobile-menu";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { FOUNDING_SEAT_DISPLAY, FOUNDING_SEAT_DISPLAY_DE } from "@/lib/founding-price";
import { HOOD, HOOD_COPY, HOOD_VALUE } from "@/lib/hood";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { SITE_URL, url } from "@/lib/site";

const TITLE = "The Hood — founding circle NFT · mint to liquidity";
const DESCRIPTION =
  "1,000 Hoods for seated founders. Winning and love, not floor-price theater. 100% of mint proceeds reserved for launch liquidity. Coming to Robinhood Chain.";

const TICKER = ["WIN", "LOVE", "LIQUIDITY", "ROBINHOOD", "1 / 1000", "FOUNDING CIRCLE"] as const;

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
            <Link
              to="/sale"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              {t("landing.navSale")}
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
          <div className="relative overflow-hidden rounded-[2rem] border border-gold/30 shadow-[0_0_90px_-16px_oklch(0.8_0.17_85/0.65)]">
            <img
              src={HOOD.art}
              alt="The Hood — founding circle still. Velvet, gold rain, winning and love."
              width={1024}
              height={1024}
              className="aspect-square w-full object-cover"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_62%,oklch(0.12_0.02_80/0.55))]"
            />
          </div>
          <p className="relative mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/85">
            {HOOD.collection} · 1 / {HOOD.maxSupply}
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
          <h1 className="mt-4 font-display text-[clamp(2.6rem,8vw,4.6rem)] font-semibold leading-[0.94] tracking-tight">
            {de ? HOOD_COPY.titleDe : HOOD_COPY.title}
            <span className="mt-2 block text-gold">{de ? HOOD_COPY.title2De : HOOD_COPY.title2}</span>
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-foreground/80">
            {de ? HOOD_COPY.leadDe : HOOD_COPY.lead}
          </p>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            {de ? HOOD_COPY.robinhoodDe : HOOD_COPY.robinhood}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/access"
              className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-background shadow-[0_0_32px_-10px_oklch(0.82_0.16_85/0.8)]"
            >
              {de ? `Founding Seat ${price}` : `Founding seat ${price}`}{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/wallet"
              className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-foreground/[0.04] px-5 py-3 text-sm font-semibold"
            >
              {de ? `Hood minten · ${price}` : `Mint the Hood · ${price}`}
            </Link>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            {de
              ? "Seat schaltet die Firma frei. Hood-Mint nur für seated Founder. Utility — kein Equity, kein AURA-CA."
              : "Seat wakes the company. Hood mint is for seated founders only. Utility — not equity, not an AURA CA."}
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
              ? "Jeder Dollar aus dem Hood-Mint geht in die Launch-Liquidität. Kein zweites Treasury. Kein Team-Spend."
              : "Every dollar from the Hood mint goes into launch liquidity. No second treasury. No team spend."}
          </p>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {de
              ? "Das ist Policy, kein LP-Share-Token und keine Rendite-Garantie. Founding Members finanzieren das Buch, das den Launch trägt."
              : "This is policy — not an LP-share token and not a return promise. Founding members fund the book that carries the launch."}
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-12 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {de ? "Was du bekommst" : "What founders get"}
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
            ? "The Hood — Founding Circle. Mint geht in die Liquidität."
            : "The Hood — founding circle. Mint goes to liquidity.",
          placement: "hood",
        }}
      />
    </main>
  );
}
