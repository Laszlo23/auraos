import { TOKEN_SYMBOL } from "@/lib/plans";

export type HolderTierId = "none" | "spark" | "charge" | "core" | "genesis";

export type HolderPerk = {
  id: string;
  label: string;
  description: string;
  active: boolean;
};

export type HolderPerks = {
  symbol: typeof TOKEN_SYMBOL;
  auraBalance: number;
  tier: HolderTierId;
  tierLabel: string;
  nextTier: HolderTierId | null;
  nextTierAt: number | null;
  notionalBoostPct: number;
  strategySlotBonus: number;
  arenaEntryDiscountPct: number;
  questXpBoostPct: number;
  x402RebateBps: number;
  seasonScoreMultiplier: number;
  hasGenesisNft: boolean;
  genesisNftContract: string | null;
  perks: HolderPerk[];
  /** Transparent roadmap for the future Genesis NFT. */
  nftRoadmap: { title: string; body: string }[];
};

/** Hood holders: 25% off paid catalog slugs except the Hood mint itself. */
export const HOOD_X402_REBATE_BPS = 2500;
/** Weekly Trading Arena score multiplier for minted Hood holders. */
export const HOOD_SEASON_SCORE_MULTIPLIER = 1.1;
export const HOOD_X402_REBATE_EXCLUDED = ["genesis-passport"] as const;

const TIERS: {
  id: HolderTierId;
  label: string;
  min: number;
  notionalBoostPct: number;
  strategySlotBonus: number;
  arenaEntryDiscountPct: number;
  questXpBoostPct: number;
}[] = [
  {
    id: "spark",
    label: "Spark",
    min: 1,
    notionalBoostPct: 0,
    strategySlotBonus: 0,
    arenaEntryDiscountPct: 0,
    questXpBoostPct: 10,
  },
  {
    id: "charge",
    label: "Charge",
    min: 1_200,
    notionalBoostPct: 15,
    strategySlotBonus: 0,
    arenaEntryDiscountPct: 25,
    questXpBoostPct: 15,
  },
  {
    id: "core",
    label: "Core",
    min: 3_000,
    notionalBoostPct: 25,
    strategySlotBonus: 1,
    arenaEntryDiscountPct: 50,
    questXpBoostPct: 25,
  },
];

export function resolveHolderTier(auraBalance: number, hasGenesisNft: boolean): HolderTierId {
  if (hasGenesisNft) return "genesis";
  let tier: HolderTierId = "none";
  for (const t of TIERS) {
    if (auraBalance >= t.min) tier = t.id;
  }
  return tier;
}

export function hoodX402PriceUsdc(priceUsdc: number, slug: string, hasHood: boolean): number {
  if (
    !hasHood ||
    HOOD_X402_REBATE_EXCLUDED.includes(slug as (typeof HOOD_X402_REBATE_EXCLUDED)[number])
  ) {
    return priceUsdc;
  }
  return Math.round(priceUsdc * (1 - HOOD_X402_REBATE_BPS / 10_000) * 1_000_000) / 1_000_000;
}

export function buildHolderPerks(opts: {
  auraBalance: number;
  hasGenesisNft?: boolean;
  genesisNftContract?: string | null;
}): HolderPerks {
  const auraBalance = Math.max(0, Number(opts.auraBalance) || 0);
  const hasGenesisNft = Boolean(opts.hasGenesisNft);
  const tier = resolveHolderTier(auraBalance, hasGenesisNft);
  const base =
    TIERS.find((t) => t.id === (tier === "genesis" ? "core" : tier)) ??
    ({
      id: "none" as const,
      label: "Visitor",
      min: 0,
      notionalBoostPct: 0,
      strategySlotBonus: 0,
      arenaEntryDiscountPct: 0,
      questXpBoostPct: 0,
    } as const);

  const genesisExtras = hasGenesisNft
    ? { notionalBoostPct: 10, strategySlotBonus: 1, arenaEntryDiscountPct: 25, questXpBoostPct: 10 }
    : { notionalBoostPct: 0, strategySlotBonus: 0, arenaEntryDiscountPct: 0, questXpBoostPct: 0 };

  const notionalBoostPct = base.notionalBoostPct + genesisExtras.notionalBoostPct;
  const strategySlotBonus = base.strategySlotBonus + genesisExtras.strategySlotBonus;
  const arenaEntryDiscountPct = Math.min(
    100,
    base.arenaEntryDiscountPct + genesisExtras.arenaEntryDiscountPct,
  );
  const questXpBoostPct = base.questXpBoostPct + genesisExtras.questXpBoostPct;
  const x402RebateBps = hasGenesisNft ? HOOD_X402_REBATE_BPS : 0;
  const seasonScoreMultiplier = hasGenesisNft ? HOOD_SEASON_SCORE_MULTIPLIER : 1;

  const next =
    tier === "none" ? TIERS[0] : tier === "spark" ? TIERS[1] : tier === "charge" ? TIERS[2] : null;

  const perks: HolderPerk[] = [
    {
      id: "tour_badge",
      label: "Desk tour badge",
      description: "Show you completed the Quant walkthrough.",
      active: tier !== "none" || hasGenesisNft,
    },
    {
      id: "quest_xp",
      label: `+${questXpBoostPct || 10}% quest XP`,
      description: "Faster founder XP on desk quests.",
      active: questXpBoostPct > 0,
    },
    {
      id: "notional",
      label: `+${notionalBoostPct}% daily notional`,
      description: "Higher USDC/day ceiling while Quant is armed.",
      active: notionalBoostPct > 0,
    },
    {
      id: "strategy_slot",
      label: `+${strategySlotBonus || 1} strategy slot`,
      description: "Run an extra approved strategy in parallel.",
      active: strategySlotBonus > 0,
    },
    {
      id: "season",
      label: "+10% season score",
      description: "Founding-circle multiplier on the weekly Trading Arena score.",
      active: hasGenesisNft,
    },
    {
      id: "x402",
      label: "25% x402 rebate",
      description: "25% off paid desk x402 calls. The Hood mint stays $299.",
      active: hasGenesisNft,
    },
    {
      id: "genesis",
      label: "Founding-circle badge",
      description: "The Hood on your desk — unique 4-layer passport.",
      active: hasGenesisNft,
    },
    {
      id: "hold-to-earn",
      label: "Hold-to-earn",
      description:
        "Founding-circle cut of desk, catalog, and x402 fees while the Hood sits in your wallet. Ships with the mint — not a fixed APY.",
      active: false,
    },
  ];

  return {
    symbol: TOKEN_SYMBOL,
    auraBalance,
    tier,
    tierLabel: hasGenesisNft ? "Genesis" : base.label,
    nextTier: next?.id ?? (tier === "core" && !hasGenesisNft ? "genesis" : null),
    nextTierAt: next?.min ?? null,
    notionalBoostPct,
    strategySlotBonus,
    arenaEntryDiscountPct,
    questXpBoostPct,
    x402RebateBps,
    seasonScoreMultiplier,
    hasGenesisNft,
    genesisNftContract: opts.genesisNftContract ?? null,
    perks,
    nftRoadmap: [
      {
        title: "The Hood — first 1,000 only",
        body: "Capped founding circle. Extra perks never expand past these thousand. 70% of the $299 mint to T-0 liquidity, 30% to ops.",
      },
      {
        title: "Hold-to-earn while you hold",
        body: "A share of real desk, catalog, and x402 fees, claimable only by the current owner. Sell the Hood, the stream walks. Not a fixed APY.",
      },
      {
        title: "7,777 AURA + desk genesis",
        body: "Claim 7,777 AURA (+ buy bonus) into your wallet at T-0. Extra strategy slot, +10% season score, quest XP, 25% x402 rebate, founding badge.",
      },
      {
        title: "Robinhood Chain",
        body: "Same circle, next chain — when the Hood contract is published there. Official CA only on aibusiness.fun.",
      },
    ],
  };
}
