/**
 * Public narrative: Robinhood Chain commitment + treasury reference peg.
 * SSOT for tokenomics, roadmap, Hood, homepage, and llms.txt.
 *
 * Legal: reference basket ≠ redemption, ≠ wrapped stock, ≠ securities offer.
 */

import type { UiLocale } from "@/lib/attribution";

export type LocaleCopy = { en: string; de: string };

export function loc(locale: UiLocale, copy: LocaleCopy): string {
  return locale === "de" ? copy.de : copy.en;
}

export const REFERENCE_PEG_DISCLAIMER: LocaleCopy = {
  en: "Reference basket is published for treasury transparency — not a redemption right, not a wrapped stock token, not an offer of securities. Actual holdings may differ; targets follow Quant policy and are not guaranteed.",
  de: "Referenzkorb wird zur Treasury-Transparenz veröffentlicht — kein Rücknahmerecht, kein Wrapped-Stock-Token, kein Wertpapierangebot. Tatsächliche Bestände können abweichen; Ziele folgen der Quant-Policy und sind nicht garantiert.",
};

export const ROBINHOOD_MOMENTUM: LocaleCopy = {
  en: "We’re building on Robinhood Chain — creator mints live today; Hood + fair launch stay on Base until contracts ship. Same rules, same CA policy, more rails.",
  de: "Wir bauen auf Robinhood Chain — Creator-Mints laufen heute; Hood + Fair Launch bleiben auf Base, bis die Contracts da sind. Gleiche Regeln, gleiche CA-Policy, mehr Rails.",
};

export const ROBINHOOD_HOMEPAGE_LINE: LocaleCopy = {
  en: "Robinhood Chain · USDG desk · creator mints live — momentum peg targets TSLA + Musk-orbit equities (reference only).",
  de: "Robinhood Chain · USDG-Desk · Creator-Mints live — Momentum-Peg zielt auf TSLA + Musk-Orbit-Aktien (nur Referenz).",
};

export type ReferenceBasketLine = {
  id: string;
  symbol: string;
  label: LocaleCopy;
  weightPct: number;
  role: LocaleCopy;
};

/** Published reference weights for treasury market-ops after T-0 — not live holdings. */
export const TREASURY_REFERENCE_BASKET: ReferenceBasketLine[] = [
  {
    id: "tsla",
    symbol: "TSLA",
    label: { en: "Tesla", de: "Tesla" },
    weightPct: 70,
    role: {
      en: "Primary momentum anchor — Quant sizes treasury ops toward this tape.",
      de: "Primärer Momentum-Anker — Quant richtet Treasury-Ops an diesem Tape aus.",
    },
  },
  {
    id: "musk-orbit",
    symbol: "—",
    label: { en: "Musk-orbit equities", de: "Musk-Orbit-Aktien" },
    weightPct: 30,
    role: {
      en: "Public names Quant selects in the Musk growth orbit — published in the weekly tape, rebalanced on policy.",
      de: "Öffentliche Namen, die Quant im Musk-Wachstumsorbit wählt — im Wochen-Tape veröffentlicht, policy-gesteuert rebalanciert.",
    },
  },
];

export const REFERENCE_PEG_LEAD: LocaleCopy = {
  en: "AURA is not a stock. After T-0, the treasury publishes a reference basket so holders can read the momentum story in plain numbers: TSLA as the anchor, plus Musk-orbit equities where publicly tradable. Quant executes toward that reference — we show the tape, not a promise.",
  de: "AURA ist keine Aktie. Ab T-0 veröffentlicht die Treasury einen Referenzkorb, damit Holder die Momentum-Story in klaren Zahlen lesen: TSLA als Anker, plus Musk-Orbit-Aktien, wo öffentlich handelbar. Quant arbeitet auf diese Referenz hin — wir zeigen das Tape, kein Versprechen.",
};

export const ROBINHOOD_CHAIN_POINTS: { title: LocaleCopy; body: LocaleCopy }[] = [
  {
    title: { en: "Live today", de: "Heute live" },
    body: {
      en: "Creator collections deploy and mint on Robinhood Chain (USDG or ETH). Branded /c/slug storefronts, 90/10 split, on-chain royalties.",
      de: "Creator-Collections deployen und minten auf Robinhood Chain (USDG oder ETH). Marken-/c/slug-Shops, 90/10-Split, On-chain-Royalties.",
    },
  },
  {
    title: { en: "Multichain desk", de: "Multichain-Desk" },
    body: {
      en: "Companies pick Base, BSC, or Robinhood for Quant wallet + OKX fills. x402 machine payments stay on Base.",
      de: "Firmen wählen Base, BSC oder Robinhood für Quant-Wallet + OKX-Fills. x402-Maschinenzahlungen bleiben auf Base.",
    },
  },
  {
    title: { en: "Hood + T-0 on Base", de: "Hood + T-0 auf Base" },
    body: {
      en: "Founding Hood NFT and AURA fair launch remain on Base until Robinhood contracts publish. No surprise CA — ever.",
      de: "Founding-Hood-NFT und AURA-Fair-Launch bleiben auf Base, bis Robinhood-Contracts veröffentlicht sind. Keine Überraschungs-CA — niemals.",
    },
  },
  {
    title: { en: "Next: Hood on Robinhood", de: "Als Nächstes: Hood auf Robinhood" },
    body: {
      en: "Same 1,000 circle, next chain — membership perks unchanged. We ship when the contract is audited and the CA is on this domain.",
      de: "Derselbe Kreis aus 1.000, nächste Chain — Membership-Perks unverändert. Wir shippen, wenn der Contract geprüft ist und die CA auf dieser Domain steht.",
    },
  },
];
