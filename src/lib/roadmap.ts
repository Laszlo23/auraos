/**
 * Public product roadmap — the whole stack, plus the first 1,000 Hood extras.
 *
 * Hold-to-earn is a product mechanism: a share of real desk / catalog / x402
 * fees, claimable only while the Hood sits in the wallet. Not equity. Not a
 * fixed APY. If you sell, the stream walks with the NFT.
 */

import { TOKEN_LAUNCH_DISPLAY } from "@/lib/site";

export type RoadmapKind = "build" | "hood" | "love" | "coffee" | "space" | "scale";
export type RoadmapStatus = "live" | "brewing" | "next" | "horizon";

export type RoadmapStop = {
  id: string;
  when: string;
  status: RoadmapStatus;
  kind: RoadmapKind;
  title: string;
  body: string;
};

export const ROADMAP_INTRO = {
  eyebrow: "Roadmap",
  title: "The whole nine yards.",
  subtitle:
    "Aura OS is the desk. Aura Local is the street. The Hood is the first 1,000 — extra perks and a hold-to-earn stream from real product fees, for as long as the NFT sits in the wallet. Then we scale the machine, not the promises.",
} as const;

/** Exclusive circle. Cap is the Hood supply. Never expands. */
export const FIRST_THOUSAND = {
  eyebrow: "First 1,000",
  eyebrowDe: "Die ersten 1.000",
  title: "The Hood is the only founding extra.",
  titleDe: "The Hood ist der einzige Founding-Extra.",
  lead: "One thousand seats. That’s the circle. Later members get the OS. They do not get this pack.",
  leadDe:
    "Tausend Sitze. Das ist der Kreis. Spätere Mitglieder bekommen das OS. Dieses Paket nicht.",
  holdTitle: "Hold-to-earn",
  holdTitleDe: "Hold-to-earn",
  holdLead:
    "As long as the Hood is in your wallet, you stay in the founding yield: a share of real desk, catalog, and x402 fees, plus the AURA gift you claim at T-0. Sell it — the stream walks with the NFT. Not a fixed APY. Not equity. Usage in, claims out.",
  holdLeadDe:
    "Solange der Hood in deiner Wallet sitzt, bleibst du im Founding-Yield: ein Anteil an echten Desk-, Katalog- und x402-Gebühren, plus das AURA-Geschenk, das du ab T-0 claimst. Verkaufst du — wandert der Strom mit dem NFT. Kein festes APY. Kein Equity. Nutzung rein, Claims raus.",
  perks: [
    {
      id: "hold-to-earn",
      title: "Passive stream while you hold",
      titleDe: "Passiver Strom, solange du hältst",
      body: "A founding-circle cut of live product fees. Claimable only by the current owner. Transfer follows the token.",
      bodyDe:
        "Ein Founding-Circle-Anteil an echten Produktgebühren. Nur der aktuelle Owner kann claimen. Transfer folgt dem Token.",
    },
    {
      id: "aura-gift",
      title: "7,777 AURA in your wallet at T-0",
      titleDe: "7.777 AURA in deiner Wallet ab T-0",
      body: "On-chain gift drop. Claim unlocked AURA the moment the market executes. Escrow buy adds bonus pressure. No admin clawback.",
      bodyDe:
        "On-chain Gift-Drop. Claim freigeschaltete AURA sobald der Markt ausgeführt ist. Escrow-Kauf gibt Bonus-Druck. Kein Admin-Clawback.",
    },
    {
      id: "lp-book",
      title: "70% of mint USDC buys official AURA",
      titleDe: "70% der Mint-USDC kaufen offizielles AURA",
      body: "Trapped in the launch escrow. Guardian proposes the pair, 72 hours, then anyone can execute. No owner withdraw.",
      bodyDe:
        "Im Launch-Escrow gefangen. Guardian schlägt das Paar vor, 72 Stunden, dann kann jeder ausführen. Kein Owner-Withdraw.",
    },
    {
      id: "desk",
      title: "Genesis desk forever",
      titleDe: "Genesis-Desk für immer",
      body: "Extra strategy slot, season score, quest XP, 25% x402 rebate, founding badge. Live on the trading desk today.",
      bodyDe:
        "Extra Strategie-Slot, Season-Score, Quest-XP, 25% x402-Rabatt, Founding-Badge. Heute schon am Handelstisch.",
    },
  ],
  disclaimer:
    "Mechanism and target — not a return promise. Amounts follow real usage. Ninty LLC / Aura OS does not sell equity through the Hood.",
  disclaimerDe:
    "Mechanismus und Ziel — keine Rendite-Garantie. Beträge folgen echter Nutzung. Ninty LLC / Aura OS verkauft über den Hood kein Equity.",
} as const;

export const ROADMAP_STOPS: RoadmapStop[] = [
  {
    id: "os-live",
    when: "Now",
    status: "live",
    kind: "build",
    title: "Aura OS is already a desk",
    body: "Agents, billing, catalog, x402, trading paper, identity. Companies run work here today. The Hood is a circle on top of a product — not a JPEG waiting for a product.",
  },
  {
    id: "vienna-street",
    when: "Now → autumn",
    status: "brewing",
    kind: "build",
    title: "Aura Local + Nachbar, Vienna first",
    body: "The street layer: local shops, neighbors, Glück auf. Portals at /portal/$slug, map on Nachbar entdecken. Prove the OS next to real people before we sell the planet a story.",
  },
  {
    id: "aura-quest",
    when: "Now",
    status: "live",
    kind: "build",
    title: "AURA Quest — unified progression",
    body: "One XP bar, contribution REP, streaks, and badges across OS + Local + Nachbar. Server-enforced awards — no client-side XP gaming. Tokenomics stay off day one.",
  },
  {
    id: "aura-scouts",
    when: "Autumn",
    status: "brewing",
    kind: "build",
    title: "Aura Scouts — Vienna density",
    body: "Scout role, verified local seat attribution, Vienna REP leaderboard. Connectors earn when businesses they brought pay — not when they click a link.",
  },
  {
    id: "hood-circle",
    when: "Mint window",
    status: "next",
    kind: "hood",
    title: "The Hood — first 1,000 only",
    body: "Capped NFT. Extra perks never expand past these thousand. Hold-to-earn ships after external audit + fee-split contract — not before. Instant AURA gift drop + launch escrow on Base.",
  },
  {
    id: "fair-launch",
    when: TOKEN_LAUNCH_DISPLAY,
    status: "next",
    kind: "build",
    title: "Fair launch — no VC, no insider dump",
    body: "AURA on Base via Uniswap v2 — LP in AuraLpSink. Escrowed Hood USDC buys the official pair. Hood owners claim unlocked AURA at T-0. Treasury publishes a TSLA-anchored reference basket for Quant ops. Same rules for everyone who shows up.",
  },
  {
    id: "robinhood-chain",
    when: "Now → T-0",
    status: "brewing",
    kind: "build",
    title: "Robinhood Chain — creator mints live",
    body: "Creator collections and USDG desk on Robinhood Chain today. Multichain Quant (Base · BSC · Robinhood). Hood + AURA fair launch stay on Base until Robinhood contracts ship — then the same 1,000 circle extends rails, not dilution.",
  },
  {
    id: "ninety-days",
    when: "T+90",
    status: "next",
    kind: "build",
    title: "Commercial proof, not vibes",
    body: "Paying companies, live catalog, x402 volume, hold-to-earn claims only after the mechanism is audited and live. If the numbers are thin, we say so.",
  },
  {
    id: "hundred-companies",
    when: "After proof",
    status: "horizon",
    kind: "scale",
    title: "100 companies, then DACH",
    body: "Vienna → Austria → DACH. Marketplace, agent economy, more rails. The first 1,000 stay the founding yield. New seats are product seats, not a second Hood.",
  },
  {
    id: "thousand-network",
    when: "Scale",
    status: "horizon",
    kind: "scale",
    title: "1,000 companies, then Europe",
    body: "The OS as the default desk for SMEs and agents. Hold-to-earn still tracks Hood ownership. We do not mint a second “founding” collection to dilute the first.",
  },
  {
    id: "autonomous",
    when: "Far",
    status: "horizon",
    kind: "love",
    title: "The network runs without us hovering",
    body: "That’s the point of an OS. We stay for coffee. We do not stay as a bottleneck. The first 1,000 still hold the keys they bought.",
  },
];

export const ROADMAP_RITUALS = [
  {
    id: "os",
    title: "Ship the desk",
    when: "Every week",
    body: "Agents, Local, billing, trading. The roadmap is a product list, not a mood board.",
  },
  {
    id: "hood",
    title: "Protect the 1,000",
    when: "Permanent",
    body: "No second founding drop. Perks and hold-to-earn follow the Hood, not a spreadsheet of friends.",
  },
  {
    id: "honest",
    title: "Say the number",
    when: "Public",
    body: "Fees, claims, companies. If hold-to-earn is quiet, the page is quiet. Atlas would yell otherwise.",
  },
] as const;

export const ROADMAP_BEATS = [
  {
    week: "W0–2",
    title: "Desk + Local",
    detail: "OS live. Vienna street layer. Hood art and escrow ready.",
  },
  {
    week: "W3–4",
    title: "The Hood",
    detail: "Mint the 1,000. Desk perks on. Hold-to-earn after audit — fee-split contract, not marketing copy.",
  },
  {
    week: "T-0",
    title: "Fair launch",
    detail: "AURA pair. Escrow buy. Gift lock starts the 90-day clock.",
  },
  {
    week: "T+90",
    title: "Proof",
    detail: "Companies paying. Claims from usage. Unlock the gift. Publish the tape.",
  },
] as const;

export const VIBES_CHART = [
  { label: "OS", features: 86, vibes: 40, love: 48 },
  { label: "Local", features: 70, vibes: 62, love: 58 },
  { label: "Hood", features: 74, vibes: 80, love: 72 },
  { label: "T-0", features: 82, vibes: 70, love: 64 },
  { label: "T+90", features: 90, vibes: 58, love: 70 },
  { label: "1k cos", features: 94, vibes: 50, love: 66 },
] as const;
