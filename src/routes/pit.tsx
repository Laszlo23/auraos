import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { motion } from "motion/react";

import { PublicSiteHeader } from "@/components/aura/public-site-header";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import {
  TICKPIX,
  TICKPIX_COPY,
  tickpixCollectionUrl,
  tickpixContractAddress,
  tickpixExplorerTokenUrl,
} from "@/lib/tickpix";
import { SITE_URL, url } from "@/lib/site";

const TITLE = "TICKPIX — the pit | Aura OS";
const DESCRIPTION =
  "Collectible pixel traders on Robinhood Chain. Culture seats for the tape — not a stock, not a fund, not a second Hood. Mint at nft.aibusiness.fun.";

export const Route = createFileRoute("/pit")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "TICKPIX — they live on the tape" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url(TICKPIX.path) },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${TICKPIX.path}` }],
  }),
  component: PitPage,
});

function PitPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  const mintHref = tickpixCollectionUrl();
  const ca = tickpixContractAddress();
  const kicker = de ? TICKPIX_COPY.kickerDe : TICKPIX_COPY.kicker;
  const title = de ? TICKPIX_COPY.titleDe : TICKPIX_COPY.title;
  const lead = de ? TICKPIX_COPY.leadDe : TICKPIX_COPY.lead;
  const auraLink = de ? TICKPIX_COPY.auraLinkDe : TICKPIX_COPY.auraLink;
  const disclaimer = de ? TICKPIX_COPY.disclaimerDe : TICKPIX_COPY.disclaimer;
  const cta = de ? TICKPIX_COPY.ctaDe : TICKPIX_COPY.cta;

  return (
    <div className="min-h-svh bg-background">
      <PublicSiteHeader />
      <main>
        <section className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-5xl items-center gap-10 px-5 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{kicker}</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{lead}</p>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-foreground/85">{auraLink}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={mintHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                {cta} <ExternalLink className="h-4 w-4" />
              </a>
              <Link
                to="/community"
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/[0.03] px-5 py-3 text-sm font-semibold text-foreground/90"
              >
                Community <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/hood"
                className="inline-flex items-center gap-2 rounded-2xl border border-gold/35 px-5 py-3 text-sm font-semibold text-gold"
              >
                {de ? "Hood = OS-Pass" : "Hood = OS passport"}
              </Link>
            </div>
            <p className="mt-6 max-w-lg text-[12px] leading-relaxed text-muted-foreground">{disclaimer}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[1.75rem] border border-primary/25 bg-foreground/[0.03] p-6 sm:p-8"
          >
            <div className="relative space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {de ? "So funktioniert es" : "How it plugs in"}
              </p>
              <ul className="space-y-4 text-[14px] leading-relaxed text-foreground/90">
                <li>
                  <span className="font-semibold text-primary">01 · Mint</span>
                  <p className="mt-1 text-muted-foreground">
                    {de
                      ? `CCFF00-Holder gratis in der Allowlist · Public ${TICKPIX.publicPrice}. Chain ${TICKPIX.chainId}.`
                      : `CCFF00 holders free on allowlist · public ${TICKPIX.publicPrice}. Chain ${TICKPIX.chainId}.`}
                  </p>
                </li>
                <li>
                  <span className="font-semibold text-primary">02 · Belong</span>
                  <p className="mt-1 text-muted-foreground">
                    {de
                      ? "Dieselbe Wallet in Aura OS linken → Pit-Badge auf Community + Quest."
                      : "Link the same wallet in Aura OS → Pit badge on Community + Quest."}
                  </p>
                </li>
                <li>
                  <span className="font-semibold text-primary">03 · Show up</span>
                  <p className="mt-1 text-muted-foreground">
                    {de
                      ? "Clock-in + Tape-Card auf dem Mint-Site. Aura vergibt XP für Mitmachen — kein Yield."
                      : "Clock-in + tape card on the mint site. Aura awards XP for showing up — not yield."}
                  </p>
                </li>
              </ul>
              <dl className="grid gap-2 border-t border-border/40 pt-4 font-mono text-[11px] text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <dt>Supply</dt>
                  <dd className="text-foreground/80">{TICKPIX.maxSupply.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Network</dt>
                  <dd className="text-foreground/80">Robinhood · {TICKPIX.chainId}</dd>
                </div>
                {ca ? (
                  <div className="flex justify-between gap-3">
                    <dt>CA</dt>
                    <dd>
                      <a
                        href={tickpixExplorerTokenUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {`${ca.slice(0, 6)}…${ca.slice(-4)}`}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </motion.div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
