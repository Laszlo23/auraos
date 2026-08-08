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
  hasGenesisNft: boolean;
  genesisNftContract: string | null;
  perks: HolderPerk[];
  /** Transparent roadmap for the future Genesis NFT. */
  nftRoadmap: { title: string; body: string }[];
};

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

  const next =
    tier === "none"
      ? TIERS[0]
      : tier === "spark"
        ? TIERS[1]
        : tier === "charge"
          ? TIERS[2]
          : null;

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
      description: "Faster founder XP on trading quests.",
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
      id: "arena",
      label: `${arenaEntryDiscountPct || 25}% Arena discount`,
      description: "Cheaper weekly Trading Arena entry (when fees apply).",
      active: arenaEntryDiscountPct > 0,
    },
    {
      id: "genesis",
      label: "Genesis NFT perks",
      description: "Vanity badge, x402 fee rebate, season score multiplier — when minted.",
      active: hasGenesisNft,
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
    hasGenesisNft,
    genesisNftContract: opts.genesisNftContract ?? null,
    perks,
    nftRoadmap: [
      {
        title: "Genesis pass (ERC-721)",
        body: "One NFT unlocks Core perks plus vanity badge, early presets, and a weekly Arena multiplier.",
      },
      {
        title: "Onchain AURA",
        body: "In-app AURA migrates 1:1 to Base when the ERC-20 ships — holder tiers keep working.",
      },
      {
        title: "Fee rebates",
        body: "Genesis holders get a rebate on paid x402 Quant signal calls.",
      },
    ],
  };
}
