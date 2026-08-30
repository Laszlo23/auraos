import { FOUNDING_SEAT_USD } from "@/lib/founding-price";

/**
 * The Hood — founding-circle NFT.
 * Utility membership, not equity, not the AURA launch token.
 * Mint proceeds are reserved for launch liquidity. No invented CA.
 */
export const HOOD = {
  name: "The Hood",
  collection: "Aura Hood",
  path: "/hood",
  art: "/hood.jpg",
  artBrand: "/brand/aura-hood.jpg",
  og: "/og/hood.jpg",
  maxSupply: 1000,
  mintUsd: FOUNDING_SEAT_USD,
  seatUsd: FOUNDING_SEAT_USD,
  proceeds: "liquidity" as const,
} as const;

export const HOOD_COPY = {
  kicker: "The Hood · founding circle",
  kickerDe: "The Hood · Founding Circle",
  title: "Wear the win.",
  title2: "Give it to the pool.",
  titleDe: "Trag den Sieg.",
  title2De: "Gib ihn in den Pool.",
  lead: "A 1,000-piece circle for seated founders. The art is love and winning. The mint does not feed a second treasury — every dollar from the Hood mint is reserved for launch liquidity.",
  leadDe:
    "Ein Kreis aus 1.000 Stücken für seated Founder. Die Kunst ist Liebe und Sieg. Der Mint füttert keine zweite Treasury — jeder Dollar aus dem Hood-Mint ist für die Launch-Liquidität reserviert.",
  robinhood:
    "The Hood is coming to Robinhood Chain too. Until a Hood contract is published there, mint stays on Base. Official CA only on aibusiness.fun — never in a DM.",
  robinhoodDe:
    "The Hood kommt auch auf Robinhood Chain. Bis dort ein Hood-Contract veröffentlicht ist, bleibt der Mint auf Base. Offizielle CA nur auf aibusiness.fun — nie per DM.",
} as const;

export const HOOD_VALUE = [
  {
    id: "circle",
    en: "Founding circle",
    de: "Founding Circle",
    enBody: "Seat number on the passport. You are in the first 1,000 — not a waitlist theater.",
    deBody: "Seat-Nummer auf dem Pass. Du bist in den ersten 1.000 — kein Waitlist-Theater.",
  },
  {
    id: "lp",
    en: "Mint → liquidity",
    de: "Mint → Liquidität",
    enBody:
      "100% of Hood mint proceeds are reserved for the T-0 liquidity book. Not team spend. Not a second wallet story.",
    deBody:
      "100% der Hood-Mint-Erlöse sind für das T-0-Liquiditätsbuch reserviert. Kein Team-Spend. Keine zweite Wallet-Story.",
  },
  {
    id: "desk",
    en: "Desk perks",
    de: "Desk-Vorteile",
    enBody: "Genesis tier on Quant: extra strategy slot, Arena discount, quest XP, x402 rebate.",
    deBody: "Genesis-Stufe am Quant: extra Strategie-Slot, Arena-Rabatt, Quest-XP, x402-Rabatt.",
  },
  {
    id: "robinhood",
    en: "Robinhood Chain",
    de: "Robinhood Chain",
    enBody: "Same circle, next chain — when the Hood contract is published. No surprise CA.",
    deBody: "Derselbe Kreis, nächste Chain — wenn der Hood-Contract da ist. Keine Überraschungs-CA.",
  },
] as const;
