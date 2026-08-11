/**
 * Curated money-working strategies for Aura Yield Desk.
 * APYs are illustrative bands from public Base/BNB DeFi research (Aug 2026) —
 * agents never invent live fills; paper accrues at conservative mid of band.
 */

export type YieldRiskTier = "conservative" | "balanced" | "aggressive" | "extreme";
export type YieldKind =
  | "lp"
  | "lending"
  | "farm"
  | "ve_lock"
  | "prediction"
  | "day_trade"
  | "arb";
export type YieldChain = "base" | "bsc";

export type YieldCatalogItem = {
  id: string;
  name: string;
  tagline: string;
  chain: YieldChain;
  protocol: string;
  kind: YieldKind;
  riskTier: YieldRiskTier;
  /** Mid estimate used for paper accrual (honest: not a promise). */
  targetApyPct: number;
  /** Display band for UI. */
  apyBand: [number, number];
  assets: string[];
  howItWorks: string;
  risks: string[];
  standOut: string;
  /** Minimum allocate USDC. */
  minUsdc: number;
  /** Max share of yield budget for this single book. */
  maxBudgetPct: number;
  liveReady: boolean;
  docsUrl?: string;
};

export const YIELD_RISK_ORDER: YieldRiskTier[] = [
  "conservative",
  "balanced",
  "aggressive",
  "extreme",
];

export const YIELD_CATALOG: YieldCatalogItem[] = [
  {
    id: "base_aave_usdc",
    name: "Base USDC lending",
    tagline: "Sleep money — supply USDC, earn borrow interest.",
    chain: "base",
    protocol: "Aave V3",
    kind: "lending",
    riskTier: "conservative",
    targetApyPct: 4.5,
    apyBand: [2.5, 8],
    assets: ["USDC"],
    howItWorks:
      "Supply USDC into Aave V3 on Base via your smart wallet. Borrowers pay variable interest; withdraw aUSDC→USDC when utilization allows.",
    risks: ["Smart-contract risk", "Utilization freeze on withdraw", "Rate can compress overnight"],
    standOut: "Live idle rail — park residual USDC between Quant scalp windows.",
    minUsdc: 5,
    maxBudgetPct: 60,
    liveReady: true,
    docsUrl: "https://aave.com",
  },
  {
    id: "base_aero_usdc_weth_lp",
    name: "Aerodrome WETH/USDC LP",
    tagline: "Base’s liquidity hub — fees + AERO emissions when gauged.",
    chain: "base",
    protocol: "Aerodrome",
    kind: "lp",
    riskTier: "balanced",
    targetApyPct: 18,
    apyBand: [8, 45],
    assets: ["WETH", "USDC"],
    howItWorks:
      "Provide two-sided liquidity on Aerodrome. Stake in a gauge to earn AERO emissions directed by veAERO voters; unstaked LPs earn swap fees instead.",
    risks: [
      "Impermanent loss vs holding",
      "AERO emission volatility",
      "Gauge / listing eligibility",
      "ve(3,3) weekly epoch timing",
    ],
    standOut:
      "Core Base flywheel: deepen liquidity → volume → votes → emissions. Live rail: OKX half-swap + Aerodrome LP + gauge.",
    minUsdc: 10,
    maxBudgetPct: 40,
    liveReady: true,
    docsUrl: "https://aerodrome.finance/docs",
  },
  {
    id: "base_aero_volatile_lp",
    name: "Aerodrome volatile pair LP",
    tagline: "High-emission pools — big APY, real IL.",
    chain: "base",
    protocol: "Aerodrome",
    kind: "lp",
    riskTier: "aggressive",
    targetApyPct: 55,
    apyBand: [20, 150],
    assets: ["volatile", "USDC/WETH"],
    howItWorks:
      "LP into high-vote gauges (often new listings or Ignition launches). Emissions can spike; IL can erase nominal APY.",
    risks: [
      "Severe impermanent loss",
      "Token dump / rug on new pairs",
      "Emission cliff after bribes dry up",
      "Need active range management on CL pools",
    ],
    standOut: "Where agents beat humans: auto-exit when vAPR collapses or IL budget is blown.",
    minUsdc: 40,
    maxBudgetPct: 25,
    liveReady: false,
    docsUrl: "https://aerodrome.finance/docs",
  },
  {
    id: "base_veaero_voter",
    name: "veAERO voter desk",
    tagline: "Lock AERO → vote gauges → earn 100% of pool revenue share.",
    chain: "base",
    protocol: "Aerodrome",
    kind: "ve_lock",
    riskTier: "aggressive",
    targetApyPct: 25,
    apyBand: [10, 60],
    assets: ["AERO", "veAERO"],
    howItWorks:
      "Lock AERO (up to 4y) into veAERO NFTs. Vote weekly for gauges; earn fees + bribes on voted pools. Rebases reduce emission dilution.",
    risks: [
      "Lock illiquidity",
      "AERO price risk",
      "Vote inefficiency / wrong gauges",
      "Weekly operational burden (agents automate)",
    ],
    standOut:
      "Classic LP→lock→vote flywheel. Agents pick bribe-efficient gauges so money routes money.",
    minUsdc: 100,
    maxBudgetPct: 20,
    liveReady: false,
    docsUrl: "https://aerodrome.finance/docs",
  },
  {
    id: "bsc_venus_usdc",
    name: "Venus USDC supply",
    tagline: "BNB Chain money market — deep USDT/USDC books.",
    chain: "bsc",
    protocol: "Venus",
    kind: "lending",
    riskTier: "conservative",
    targetApyPct: 3.8,
    apyBand: [1.5, 8],
    assets: ["USDC", "USDT"],
    howItWorks:
      "Supply Binance-Peg USDC into Venus Core Pool (vUSDC) on BNB Chain. Earn variable supply APY; redeem underlying when you need cash for farms or Quant.",
    risks: ["Smart-contract risk", "Stable depeg contagion", "Withdraw when utilization spikes"],
    standOut: "Park BSC treasury that funds Pancake farms without sitting at 0%. Live rail via Venus vUSDC.",
    minUsdc: 5,
    maxBudgetPct: 50,
    liveReady: true,
  },
  {
    id: "bsc_pancake_stable_lp",
    name: "PancakeSwap stable LP + farm",
    tagline: "USDT/USDC (or FDUSD) LP → stake LP for CAKE.",
    chain: "bsc",
    protocol: "PancakeSwap",
    kind: "farm",
    riskTier: "balanced",
    targetApyPct: 12,
    apyBand: [4, 30],
    assets: ["USDT", "USDC", "FDUSD", "CAKE"],
    howItWorks:
      "Half-swap USDC→USDT via OKX, add Pancake V2 USDT/USDC liquidity, stake LP in MasterChef v2 (pid 48). Earn swap fees; CAKE when farm allocPoint > 0.",
    risks: ["Stable depeg", "CAKE emission decay", "Farm multiplier changes", "veCAKE lock complexity"],
    standOut: "Low-fee BNB Chain compounding — agents harvest CAKE and optionally lock veCAKE for boost.",
    minUsdc: 10,
    maxBudgetPct: 40,
    liveReady: true,
    docsUrl: "https://docs.pancakeswap.finance/earn/yield-farming",
  },
  {
    id: "bsc_pancake_volatile_farm",
    name: "Pancake volatile farm",
    tagline: "BNB/CAKE or hot pairs — high APR, high IL.",
    chain: "bsc",
    protocol: "PancakeSwap",
    kind: "farm",
    riskTier: "extreme",
    targetApyPct: 80,
    apyBand: [25, 200],
    assets: ["WBNB", "CAKE", "alt"],
    howItWorks:
      "LP volatile pairs and stake in farms. New farms can show 50–100%+ APR briefly before capital floods in.",
    risks: [
      "Extreme IL",
      "Emission mirage (APR ≠ realized)",
      "Altcoin collapse",
      "Need frequent rebalance",
    ],
    standOut: "Agents treat APR as a timer — enter early, exit when incentives flatten.",
    minUsdc: 40,
    maxBudgetPct: 15,
    liveReady: false,
  },
  {
    id: "bsc_lista_yield",
    name: "Lista / slisBNB stack",
    tagline: "Liquid-staked BNB + lisUSD strategies inside Lista.",
    chain: "bsc",
    protocol: "Lista DAO",
    kind: "farm",
    riskTier: "aggressive",
    targetApyPct: 22,
    apyBand: [8, 50],
    assets: ["BNB", "slisBNB", "lisUSD"],
    howItWorks:
      "Stake BNB → slisBNB, optionally mint lisUSD CDP, then farm inside Lista lending / pairs.",
    risks: ["CDP liquidation", "lisUSD peg", "Thin external liquidity", "Stacked contract risk"],
    standOut: "BNB-native yield stack competitors on Base can’t copy 1:1.",
    minUsdc: 75,
    maxBudgetPct: 20,
    liveReady: false,
  },
  {
    id: "base_limitless_pred",
    name: "Base prediction edge",
    tagline: "GuessMarket LP fee share + Limitless CLOB scout on Base.",
    chain: "base",
    protocol: "GuessMarket / Limitless",
    kind: "prediction",
    riskTier: "extreme",
    targetApyPct: 40,
    apyBand: [-100, 200],
    assets: ["USDC"],
    howItWorks:
      "Live: create/reuse a GuessMarket YES/NO book and seed USDC LP (earn ~75% of trade fees, no classic IL). Scout Limitless active CLOB markets for directional edges; Limitless fills need API keys later.",
    risks: [
      "Binary total loss if you buy shares (LP is fee-side)",
      "Oracle / resolution risk",
      "Thin books / adverse selection",
      "Regulatory gray zones by jurisdiction",
      "$10 GuessMarket create fee when opening a new market",
    ],
    standOut:
      "Agents research + seed LP fees — money working while humans doomscroll headlines.",
    minUsdc: 20,
    maxBudgetPct: 10,
    liveReady: true,
    docsUrl: "https://guessmarket.com/en/ai-agents/",
  },
  {
    id: "bsc_predict_fun",
    name: "BNB prediction desk",
    tagline: "Predict Fun / OPINION-style markets on BNB — USDT collateral.",
    chain: "bsc",
    protocol: "Predict Fun / OPINION",
    kind: "prediction",
    riskTier: "extreme",
    targetApyPct: 35,
    apyBand: [-100, 180],
    assets: ["USDT", "USDC"],
    howItWorks:
      "Trade event contracts on BNB Chain venues with wallet distribution (Trust / Binance Wallet rails). Prefer yield-bearing open collateral when available.",
    risks: ["Binary loss", "Venue risk", "Oracle risk", "Liquidity gaps vs Polymarket"],
    standOut: "Same agent brain, chain-native distribution where BNB users already live.",
    minUsdc: 20,
    maxBudgetPct: 10,
    liveReady: false,
  },
  {
    id: "cross_stable_arb",
    name: "Stable / basis arb scout",
    tagline: "Catch USDC–USDT–FDUSD dislocations + DEX–CEX basis.",
    chain: "base",
    protocol: "OKX DEX + CEX proxy",
    kind: "arb",
    riskTier: "aggressive",
    targetApyPct: 15,
    apyBand: [0, 40],
    assets: ["USDC", "USDT", "FDUSD"],
    howItWorks:
      "Monitor stable spreads and wrapped-native basis. Execute only when edge clears gas + slippage + inventory risk.",
    risks: ["Failed legs", "Bridge delay", "Depeg during arb", "MEV"],
    standOut: "Quant + Yield share inventory: spot desk provides inventory, Yield harvests dislocations.",
    minUsdc: 100,
    maxBudgetPct: 15,
    liveReady: false,
  },
  {
    id: "day_scalp_eth",
    name: "Intraday ETH scalp book",
    tagline: "5m/15m mean-reversion / breakout — capital turns, not sleeps.",
    chain: "base",
    protocol: "Aura Quant (spot)",
    kind: "day_trade",
    riskTier: "aggressive",
    targetApyPct: 30,
    apyBand: [-50, 120],
    assets: ["WETH", "USDC"],
    howItWorks:
      "Short-horizon spot strategies on WETH/USDC with tight stops, time exits, and daily notional caps. Pairs with Yield so idle cash still earns between scalp windows.",
    risks: ["Whipsaw", "Overtrading fees", "Gap risk", "Requires armed Quant desk"],
    standOut: "Money velocity: desk flips inventory all day; Yield parks residual overnight.",
    minUsdc: 50,
    maxBudgetPct: 30,
    liveReady: true,
  },
];

export function yieldCatalogById(id: string): YieldCatalogItem | undefined {
  return YIELD_CATALOG.find((x) => x.id === id);
}

export function yieldCatalogForTier(maxTier: YieldRiskTier): YieldCatalogItem[] {
  const maxIdx = YIELD_RISK_ORDER.indexOf(maxTier);
  return YIELD_CATALOG.filter((x) => YIELD_RISK_ORDER.indexOf(x.riskTier) <= maxIdx);
}

export function riskTierLabel(tier: YieldRiskTier): string {
  switch (tier) {
    case "conservative":
      return "Conservative";
    case "balanced":
      return "Balanced";
    case "aggressive":
      return "Aggressive";
    case "extreme":
      return "Extreme";
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}
