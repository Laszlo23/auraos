/** Canonical AURA market-token economics. Percentages match the whitepaper; units sum exactly. */

export const AURA_TOKEN_SYMBOL = "AURA";
export const AURA_TOKEN_NAME = "AURA Token";
export const AURA_MAX_SUPPLY = 777_777_777;
export const AURA_MAX_SUPPLY_DISPLAY = "777,777,777";

/** Official Base CA — null until T-0. Never invent one. */
export const AURA_TOKEN_CA: `0x${string}` | null = null;
export const AURA_PAIR_URL: string | null = null;
export const AURA_OFFICIAL_CA_SOURCES = [
  "https://aibusiness.fun/tokenomics",
  "https://x.com/buildingcultu3",
] as const;

export function auraCaLive(): boolean {
  return Boolean(AURA_TOKEN_CA);
}

export type AuraAllocation = {
  id: string;
  label: string;
  pct: number;
  amount: number;
};

/**
 * Whole-token split of 777,777,777. Remainders from 15%/10%/5%/2% land on
 * ecosystem, private, marketing, and public so the table adds up exactly.
 */
export const AURA_ALLOCATIONS: AuraAllocation[] = [
  { id: "community", label: "Community & contributor rewards", pct: 30, amount: 233_333_333 },
  { id: "ecosystem", label: "Ecosystem growth & partnerships", pct: 15, amount: 116_666_667 },
  { id: "treasury", label: "Treasury", pct: 15, amount: 116_666_667 },
  { id: "team", label: "Team & founders", pct: 12, amount: 93_333_333 },
  { id: "private", label: "Private / strategic sale", pct: 10, amount: 77_777_778 },
  { id: "liquidity", label: "Liquidity", pct: 8, amount: 62_222_222 },
  { id: "advisors", label: "Advisors", pct: 3, amount: 23_333_333 },
  { id: "marketing", label: "Marketing & acquisition", pct: 5, amount: 38_888_889 },
  { id: "public", label: "Public launch / community", pct: 2, amount: 15_555_555 },
];

export const AURA_ALLOCATION_TOTAL = AURA_ALLOCATIONS.reduce((s, a) => s + a.amount, 0);

if (AURA_ALLOCATION_TOTAL !== AURA_MAX_SUPPLY) {
  throw new Error(`AURA allocations sum to ${AURA_ALLOCATION_TOTAL}, expected ${AURA_MAX_SUPPLY}`);
}

export const AURA_TEAM_VESTING = {
  cliffMonths: 12,
  vestMonths: 36,
  note: "12-month cliff, then 36-month linear vesting. No unrestricted team unlock at T-0.",
} as const;

export const AURA_BUY_PLAN = {
  headline: "No contract address until T-0. Buy only on the published Base pair.",
  steps: [
    {
      t: "Before launch",
      d: "Read the whitepaper. Join the whitelist tasks. Do not send funds to any unofficial CA.",
    },
    {
      t: "T-0 on Base",
      d: "Clanker deploys AURA with a Uniswap v4 pool. Official CA is published on aibusiness.fun and X @buildingcultu3 only.",
    },
    {
      t: "First official buy",
      d: "€3,000 strategic acquisition + €3,000 across 30 capped market-ops agents. No wash, no self-trade, no circular volume.",
    },
    {
      t: "Community buy",
      d: "Same Base pair, same CA. Prefer the in-app Wallet / Grow swap once the pair is live. Never buy from a DM or a cloned ticker.",
    },
  ],
} as const;

export function formatAuraAmount(n: number): string {
  return n.toLocaleString("en-US");
}
