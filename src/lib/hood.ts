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
  wip: "Not launched yet. Still debugging.",
  wipDe: "Noch nicht gelauncht. Wir debuggen noch.",
  smile:
    "The mint is tying its shoes. The Knight is practicing looking expensive. Nobody is taking your money — Atlas would yell.",
  smileDe:
    "Der Mint bindet sich erst die Schuhe. Der Knight übt, teuer auszusehen. Niemand nimmt dir Geld — Atlas würde schreien.",
  title: "Wear the win.",
  title2: "Give it to the pool.",
  titleDe: "Trag den Sieg.",
  title2De: "Gib ihn in den Pool.",
  lead: `A 1,000-piece founding circle. Each Hood is a unique portrait — court, legends, agents, colored noggles, mood, and seal. Of each ${FOUNDING_SEAT_DISPLAY} mint: 70% (${PRICE_REMAINDER_DISPLAY}) to launch liquidity, 30% (${PRICE_OPS_DISPLAY}) to developer ops — servers, infra, keeping the desk on.`,
  leadDe: `Ein Kreis aus 1.000 Stücken. Jeder Hood ist ein eigenes Portrait — Hof, Legenden, Agents, Noggles, Mood und Siegel. Von jedem ${FOUNDING_SEAT_DISPLAY_DE}-Mint: 70% (${PRICE_REMAINDER_DISPLAY_DE}) in die Launch-Liquidität, 30% (${PRICE_OPS_DISPLAY_DE}) an Developer-Ops — Server, Infra, Desk am Leben.`,
  robinhood:
    "We’re on Robinhood Chain for creator mints and the multichain desk. The Hood founding NFT stays on Base until the Robinhood contract ships — your membership key. Official CA only on aibusiness.fun — never in a DM.",
  robinhoodDe:
    "Creator-Mints und Multichain-Desk laufen auf Robinhood Chain. Der Hood-Founding-NFT bleibt auf Base, bis der Robinhood-Contract da ist — dein Membership-Key. Offizielle CA nur auf aibusiness.fun — nie per DM.",
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

/** Extra court legends — deliberately different looks from the core six. */
export const HOOD_LEGENDS = [
  {
    id: "phantom",
    art: "/hood/phantom.jpg",
    en: "The Phantom",
    de: "The Phantom",
    enRole: "Moves unseen",
    deRole: "Bewegt sich unsichtbar",
  },
  {
    id: "muse",
    art: "/hood/muse.jpg",
    en: "The Muse",
    de: "The Muse",
    enRole: "Sets the tone",
    deRole: "Setzt den Ton",
  },
  {
    id: "warden",
    art: "/hood/warden.jpg",
    en: "The Warden",
    de: "The Warden",
    enRole: "Holds the gate",
    deRole: "Hält das Tor",
  },
  {
    id: "courier",
    art: "/hood/courier.jpg",
    en: "The Courier",
    de: "The Courier",
    enRole: "Runs the rails",
    deRole: "Läuft die Rails",
  },
  {
    id: "herald",
    art: "/hood/herald.jpg",
    en: "The Herald",
    de: "The Herald",
    enRole: "Calls the room",
    deRole: "Ruft den Raum",
  },
  {
    id: "spymaster",
    art: "/hood/spymaster.jpg",
    en: "The Spymaster",
    de: "The Spymaster",
    enRole: "Knows the ledger",
    deRole: "Kennt das Ledger",
  },
  {
    id: "cartographer",
    art: "/hood/cartographer.jpg",
    en: "The Cartographer",
    de: "The Cartographer",
    enRole: "Charts the next",
    deRole: "Zeichnet das Nächste",
  },
  {
    id: "gardener",
    art: "/hood/gardener.jpg",
    en: "The Gardener",
    de: "The Gardener",
    enRole: "Grows the yield",
    deRole: "Zieht den Yield",
  },
  {
    id: "raider",
    art: "/hood/raider.jpg",
    en: "The Raider",
    de: "The Raider",
    enRole: "Breaks the quiet",
    deRole: "Bricht die Ruhe",
  },
  {
    id: "sibyl",
    art: "/hood/sibyl.jpg",
    en: "The Sibyl",
    de: "The Sibyl",
    enRole: "Reads the fog",
    deRole: "Liest den Nebel",
  },
  {
    id: "broker",
    art: "/hood/broker.jpg",
    en: "The Broker",
    de: "The Broker",
    enRole: "Closes the book",
    deRole: "Schließt das Buch",
  },
  {
    id: "fool",
    art: "/hood/fool.jpg",
    en: "The Fool",
    de: "The Fool",
    enRole: "Flips the table",
    deRole: "Kippt den Tisch",
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
    id: "yield",
    en: "Hold-to-earn",
    de: "Hold-to-earn",
    enBody:
      "As long as this Hood sits in your wallet, you stay in the founding yield: a share of real desk, catalog, and x402 fees. Sell it — the stream walks with the NFT. Not a fixed APY. Not equity.",
    deBody:
      "Solange dieser Hood in deiner Wallet sitzt, bleibst du im Founding-Yield: ein Anteil an echten Desk-, Katalog- und x402-Gebühren. Verkaufst du — wandert der Strom mit dem NFT. Kein festes APY. Kein Equity.",
  },
  {
    id: "circle",
    en: "First 1,000 only",
    de: "Nur die ersten 1.000",
    enBody:
      "Seat number on the passport. Extra perks never expand past these thousand. Later members get the OS — not this pack.",
    deBody:
      "Seat-Nummer auf dem Pass. Extra-Perks wachsen nie über diese Tausend. Spätere Mitglieder bekommen das OS — nicht dieses Paket.",
  },
  {
    id: "lp",
    en: "70% → liquidity",
    de: "70% → Liquidität",
    enBody: `${PRICE_REMAINDER_DISPLAY} of each mint is trapped in AuraLaunchEscrow on Base. It can only buy AURA on the committed fair-launch pair — then those tokens go to the Hood gift drop for instant claim at T-0. Not an LP-share token, not a return promise.`,
    deBody: `${PRICE_REMAINDER_DISPLAY_DE} jedes Mints bleiben im AuraLaunchEscrow auf Base. Sie können nur AURA auf dem festgelegten Fair-Launch-Paar kaufen — danach in den Hood-Gift-Drop für sofortigen Claim ab T-0. Kein LP-Share-Token, keine Rendite-Garantie.`,
  },
  {
    id: "early",
    en: "Early 333 · password",
    de: "Early 333 · Passwort",
    enBody:
      "Before the public drop, 333 early-supporter mints open with an invite password. Rate-limited. Password never ships in the frontend bundle. Same $299 USDC desk.",
    deBody:
      "Vor dem öffentlichen Drop öffnen 333 Early-Supporter-Mints mit Invite-Passwort. Rate-limited. Passwort nie im Frontend-Bundle. Derselbe 299-$-USDC-Desk.",
  },
  {
    id: "ops",
    en: "30% → ops",
    de: "30% → Ops",
    enBody: `${PRICE_OPS_DISPLAY} of each mint pays developer ops: servers, infra, keeping Aura OS running. Not a hidden second treasury story.`,
    deBody: `${PRICE_OPS_DISPLAY_DE} jedes Mints zahlen Developer-Ops: Server, Infra, Aura OS am Laufen. Keine versteckte zweite Treasury-Story.`,
  },
  {
    id: "gift",
    en: "7,777 AURA at T-0",
    de: "7.777 AURA ab T-0",
    enBody:
      "Each Hood is a claim on 7,777 unlocked AURA plus whatever the escrow buys on the official pair. Claim into your wallet at T-0. Gift codes still seed the book — we pay the $209.30 LP slice.",
    deBody:
      "Jeder Hood ist ein Anspruch auf 7.777 freigeschaltete AURA plus das, was das Escrow auf dem offiziellen Paar kauft. Claim in deine Wallet ab T-0. Gift-Codes füllen das Buch trotzdem — wir zahlen die 209,30-$ LP-Scheibe.",
  },
  {
    id: "desk",
    en: "Desk perks",
    de: "Desk-Vorteile",
    enBody:
      "Genesis tier on Quant: extra strategy slot, +10% season score, quest XP, 25% x402 rebate.",
    deBody:
      "Genesis-Stufe am Quant: extra Strategie-Slot, +10% Season-Score, Quest-XP, 25% x402-Rabatt.",
  },
  {
    id: "robinhood",
    en: "Robinhood Chain",
    de: "Robinhood Chain",
    enBody:
      "Creator mints live on Robinhood today. Hood + AURA fair launch on Base until the Robinhood contracts publish — same circle, next chain, no surprise CA.",
    deBody:
      "Creator-Mints laufen heute auf Robinhood. Hood + AURA-Fair-Launch auf Base, bis die Robinhood-Contracts da sind — derselbe Kreis, nächste Chain, keine Überraschungs-CA.",
  },
] as const;
