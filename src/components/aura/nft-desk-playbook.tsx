import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { useLocale } from "@/hooks/use-locale";
import { NFT_DESK_HARD_NO, NFT_DESK_STRATEGIES } from "@/lib/nft-desk-playbook";
import {
  hoodBasescanCollectionUrl,
  hoodOpenSeaAssetsHint,
  hoodOpenSeaCollectionUrl,
  openSeaCompatChecks,
} from "@/lib/opensea-compat";
import { loc } from "@/lib/robinhood-momentum";

const STATUS_LABEL = {
  live: { en: "Live", de: "Live" },
  "after-audit": { en: "After audit", de: "Nach Audit" },
  compat: { en: "Compat", de: "Compat" },
  horizon: { en: "Horizon", de: "Horizont" },
} as const;

export function NftDeskPlaybookPanel({ className = "" }: { className?: string }) {
  const { locale } = useLocale();
  const de = locale === "de";
  const checks = openSeaCompatChecks();
  const openSea = hoodOpenSeaCollectionUrl();
  const basescan = hoodBasescanCollectionUrl();
  const assetsHint = hoodOpenSeaAssetsHint();

  return (
    <section id="nft-desk" className={`scroll-mt-24 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
        NFT desk
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        {de
          ? "Transparente Strategien — kein Fake-Aktien-NFT"
          : "Transparent strategies — no fake share NFT"}
      </h2>
      <p className="mt-3 max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed">
        {loc(locale, NFT_DESK_HARD_NO)}
      </p>

      <ul className="mt-6 space-y-3">
        {NFT_DESK_STRATEGIES.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border border-border/40 bg-foreground/[0.02] px-4 py-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold tracking-tight">{loc(locale, s.title)}</p>
              <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {loc(locale, STATUS_LABEL[s.status])}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {loc(locale, s.how)}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/90">
              <span className="font-semibold text-foreground/80">{de ? "Nicht: " : "Not: "}</span>
              {loc(locale, s.not)}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-primary">{de ? "OS: " : "OS: "}</span>
                {loc(locale, s.osAdvantage)}
              </p>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-gold">{de ? "Community: " : "Community: "}</span>
                {loc(locale, s.communityAdvantage)}
              </p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">
              {loc(locale, s.trainHint)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          OpenSea hooks
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">
          {de ? "Marketplace-Kompatibilität" : "Marketplace compatibility"}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {de
            ? "Metadaten und offizielle Links — kein Listings-Bot."
            : "Metadata and official links — not a listings bot."}
        </p>
        <ul className="mt-4 space-y-2 text-[13px]">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-muted-foreground">
              <span className={c.ok ? "text-primary" : "text-muted-foreground/50"} aria-hidden>
                {c.ok ? "◆" : "◇"}
              </span>
              <span>
                <span className="font-semibold text-foreground">
                  {de ? c.labelDe : c.label}
                </span>
                {" — "}
                {de ? c.detailDe : c.detail}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3 text-[13px] font-semibold">
          {openSea ? (
            <a
              href={openSea}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              OpenSea {de ? "Collection" : "collection"} →
            </a>
          ) : null}
          {basescan ? (
            <a
              href={basescan}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Basescan →
            </a>
          ) : null}
          {!openSea && assetsHint ? (
            <span className="text-muted-foreground">
              {de ? "Assets-Hint (unverifiziert): " : "Assets hint (unverified): "}
              <a href={assetsHint} target="_blank" rel="noreferrer" className="hover:underline">
                opensea.io/assets/…
              </a>
            </span>
          ) : null}
          <Link to="/hood" className="inline-flex items-center gap-1 text-gold hover:underline">
            {de ? "Hood minten" : "Mint Hood"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/trading"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {de ? "Quant Backtest Lab" : "Quant Backtest Lab"}{" "}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
