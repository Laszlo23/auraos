import {
  FOUNDING_SEAT_DISPLAY,
  FOUNDING_SEAT_DISPLAY_DE,
  FOUNDING_SEAT_USD,
  PRICE_OPS_BPS,
  PRICE_OPS_DISPLAY,
  PRICE_OPS_DISPLAY_DE,
  PRICE_REMAINDER_BPS,
  PRICE_REMAINDER_DISPLAY,
  PRICE_REMAINDER_DISPLAY_DE,
} from "@/lib/founding-price";

/**
 * The Hood — founding-circle NFT.
 * Utility membership, not equity, not the AURA launch token.
 * Mint split: 70% launch liquidity, 30% developer ops (servers). No invented CA.
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
  opsBps: PRICE_OPS_BPS,
  lpBps: PRICE_REMAINDER_BPS,
  opsUsd: PRICE_OPS_DISPLAY,
  lpUsd: PRICE_REMAINDER_DISPLAY,
  proceeds: "split" as const,
} as const;

export const HOOD_COPY = {
  kicker: "The Hood · founding circle",
  kickerDe: "The Hood · Founding Circle",
  title: "Wear the win.",
  title2: "Give it to the pool.",
  titleDe: "Trag den Sieg.",
  title2De: "Gib ihn in den Pool.",
  lead: `A 1,000-piece circle for seated founders. Noggles on. Punk in the palace. Of each ${FOUNDING_SEAT_DISPLAY} mint: 70% (${PRICE_REMAINDER_DISPLAY}) to launch liquidity, 30% (${PRICE_OPS_DISPLAY}) to developer ops — servers, infra, keeping the desk on.`,
  leadDe: `Ein Kreis aus 1.000 Stücken für seated Founder. Noggles auf. Punk im Palast. Von jedem ${FOUNDING_SEAT_DISPLAY_DE}-Mint: 70% (${PRICE_REMAINDER_DISPLAY_DE}) in die Launch-Liquidität, 30% (${PRICE_OPS_DISPLAY_DE}) an Developer-Ops — Server, Infra, Desk am Leben.`,
  robinhood:
    "The Hood is coming to Robinhood Chain too. Until a Hood contract is published there, mint stays on Base. Official CA only on aibusiness.fun — never in a DM.",
  robinhoodDe:
    "The Hood kommt auch auf Robinhood Chain. Bis dort ein Hood-Contract veröffentlicht ist, bleibt der Mint auf Base. Offizielle CA nur auf aibusiness.fun — nie per DM.",
} as const;

export const HOOD_COURT = [
  {
    id: "king",
    art: "/hood/king.jpg",
    en: "The King",
    de: "The King",
    enRole: "Wears the win",
    deRole: "Trägt den Sieg",
  },
  {
    id: "queen",
    art: "/hood/queen.jpg",
    en: "The Queen",
    de: "The Queen",
    enRole: "Holds the room",
    deRole: "Hält den Raum",
  },
  {
    id: "jester",
    art: "/hood/jester.jpg",
    en: "The Jester",
    de: "The Jester",
    enRole: "Loves the chaos",
    deRole: "Liebt das Chaos",
  },
  {
    id: "knight",
    art: "/hood/knight.jpg",
    en: "The Knight",
    de: "The Knight",
    enRole: "Guards the book",
    deRole: "Hütet das Buch",
  },
  {
    id: "oracle",
    art: "/hood/oracle.jpg",
    en: "The Oracle",
    de: "The Oracle",
    enRole: "Sees the next move",
    deRole: "Sieht den nächsten Zug",
  },
  {
    id: "alchemist",
    art: "/hood/alchemist.jpg",
    en: "The Alchemist",
    de: "The Alchemist",
    enRole: "Turns mint into gold",
    deRole: "Macht Mint zu Gold",
  },
] as const;

export const HOOD_AGENTS = [
  {
    id: "atlas",
    art: "/hood/atlas.jpg",
    name: "Atlas",
    enRole: "Chief Executive",
    deRole: "Chief Executive",
  },
  {
    id: "quant",
    art: "/hood/quant.jpg",
    name: "Quant",
    enRole: "Trading Desk",
    deRole: "Trading Desk",
  },
  {
    id: "yield",
    art: "/hood/yield.jpg",
    name: "Yield",
    enRole: "Yield & Liquidity",
    deRole: "Yield & Liquidität",
  },
  {
    id: "iris",
    art: "/hood/iris.jpg",
    name: "Iris",
    enRole: "Product & Storefront",
    deRole: "Produkt & Storefront",
  },
  {
    id: "vela",
    art: "/hood/vela.jpg",
    name: "Vela",
    enRole: "Growth & Marketing",
    deRole: "Growth & Marketing",
  },
  {
    id: "orin",
    art: "/hood/orin.jpg",
    name: "Orin",
    enRole: "Social Voice",
    deRole: "Social Voice",
  },
  {
    id: "juno",
    art: "/hood/juno.jpg",
    name: "Juno",
    enRole: "Customer Success",
    deRole: "Customer Success",
  },
  { id: "cass", art: "/hood/cass.jpg", name: "Cass", enRole: "Engineering", deRole: "Engineering" },
  { id: "ledger", art: "/hood/ledger.jpg", name: "Ledger", enRole: "Finance", deRole: "Finance" },
] as const;

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
    en: "70% → liquidity",
    de: "70% → Liquidität",
    enBody: `${PRICE_REMAINDER_DISPLAY} of each mint is reserved for the T-0 liquidity book. Policy — not an LP-share token, not a return promise.`,
    deBody: `${PRICE_REMAINDER_DISPLAY_DE} jedes Mints sind für das T-0-Liquiditätsbuch reserviert. Policy — kein LP-Share-Token, keine Rendite-Garantie.`,
  },
  {
    id: "ops",
    en: "30% → ops",
    de: "30% → Ops",
    enBody: `${PRICE_OPS_DISPLAY} of each mint pays developer ops: servers, infra, keeping Aura OS running. Not a hidden second treasury story.`,
    deBody: `${PRICE_OPS_DISPLAY_DE} jedes Mints zahlen Developer-Ops: Server, Infra, Aura OS am Laufen. Keine versteckte zweite Treasury-Story.`,
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
    deBody:
      "Derselbe Kreis, nächste Chain — wenn der Hood-Contract da ist. Keine Überraschungs-CA.",
  },
] as const;
