/** Client-safe catalog metadata for the paid (x402) machine API. */
export type X402Endpoint = {
  slug: string;
  name: string;
  description: string;
  path: string;
  price_usdc: number;
  network: string;
  input: string;
};

export const X402_CATALOG: X402Endpoint[] = [
  {
    slug: "quant-signal",
    name: "Quant Signal",
    description: "Risk-scored directional signal from the Quant desk for any listed asset.",
    path: "/api/public/x402/quant-signal",
    price_usdc: 0.01,
    network: "base-sepolia",
    input: `{ "symbol": "ETH" }`,
  },
  {
    slug: "lead-enrich",
    name: "Lead Enrichment",
    description: "Firmographic and contact enrichment for a company domain, agent-researched.",
    path: "/api/public/x402/lead-enrich",
    price_usdc: 0.05,
    network: "base-sepolia",
    input: `{ "domain": "acme.com" }`,
  },
  {
    slug: "company-brief",
    name: "Company Brief",
    description: "A concise strategic brief on any company or market, written by the Aura agents.",
    path: "/api/public/x402/company-brief",
    price_usdc: 0.02,
    network: "base-sepolia",
    input: `{ "subject": "onchain payments in 2026" }`,
  },
  {
    slug: "genesis-passport",
    name: "Genesis Passport",
    description:
      "Founding-company utility NFT entitlement (pay USDC via x402). Claim mint on Wallet after settle. Not an investment; not token launch.",
    path: "/api/public/x402/genesis-passport",
    price_usdc: 99,
    network: "base-sepolia",
    input: `{ "company_id": "<uuid>" }`,
  },
  {
    slug: "market-snapshot",
    name: "Market Snapshot",
    description: "Cross-asset snapshot with regime read, volatility bands and correlation notes.",
    path: "/api/public/x402/market-snapshot",
    price_usdc: 0.01,
    network: "base-sepolia",
    input: `{ "symbols": ["BTC", "ETH", "SOL"] }`,
  },
  {
    slug: "property-valuation",
    name: "Property Valuation",
    description: "Indicative valuation, rent estimate and yield for a residential address.",
    path: "/api/public/x402/property-valuation",
    price_usdc: 0.08,
    network: "base-sepolia",
    input: `{ "address": "Mariahilfer Str 12, Wien", "size_sqm": 78 }`,
  },
  {
    slug: "outreach-draft",
    name: "Outreach Draft",
    description:
      "Personalised cold outreach email drafted from a lead profile by the Akquise desk.",
    path: "/api/public/x402/outreach-draft",
    price_usdc: 0.03,
    network: "base-sepolia",
    input: `{ "lead": "Weber Immobilien, Vienna", "offer": "AI lead qualification" }`,
  },
  {
    slug: "website-copy",
    name: "Website Copy",
    description: "Landing page copy block — headline, subhead, bullets and CTA — for a product.",
    path: "/api/public/x402/website-copy",
    price_usdc: 0.03,
    network: "base-sepolia",
    input: `{ "product": "AI company OS", "audience": "solo founders" }`,
  },
  {
    slug: "astro-reading",
    name: "Astro Reading",
    description: "Personalised astrological reading generated from birth date, time and place.",
    path: "/api/public/x402/astro-reading",
    price_usdc: 0.02,
    network: "base-sepolia",
    input: `{ "birth_date": "1991-04-17", "birth_place": "Vienna" }`,
  },
  {
    slug: "imagebook-page",
    name: "Image Book Page",
    description: "One illustrated story page: prose plus a ready-to-render image prompt.",
    path: "/api/public/x402/imagebook-page",
    price_usdc: 0.04,
    network: "base-sepolia",
    input: `{ "story": "a fox who builds a rocket", "page": 1 }`,
  },
];

export const usd = (n: number) => `$${n.toFixed(n < 0.01 ? 4 : 2)}`;

/**
 * Revenue routing for every settled call. Platform keeps a fee, the founder's
 * rewards wallet takes the largest slice, the company treasury takes the rest.
 */
export const REVENUE_SPLIT = { platform: 0.2, owner: 0.6, treasury: 0.2 } as const;

export const splitRevenue = (amount: number) => ({
  platform_fee: Number((amount * REVENUE_SPLIT.platform).toFixed(6)),
  owner_share: Number((amount * REVENUE_SPLIT.owner).toFixed(6)),
  treasury_share: Number((amount * REVENUE_SPLIT.treasury).toFixed(6)),
});
