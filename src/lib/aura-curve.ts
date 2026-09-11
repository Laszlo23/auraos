/**
 * AURA T-0 curve SSOT — Uni v4 locked LP + own fee/burn/reward rules.
 * CAs stay null until env is set after the 48h announce. Never invent one.
 *
 * Human reading: docs/AURA_CURVE.md
 */

import { AURA_MAX_SUPPLY, allocationById, readConfiguredBaseAddress } from "@/lib/aura-token";
import { BASE_USDC, PRIVATE_SALE_BONUS_BPS } from "@/lib/private-sale";
import { WETH_ADDRESSES } from "@/lib/trading/tokens";

export const AURA_CURVE_DOC = "/docs/AURA_CURVE.md";
export const AURA_RH_WRAPPER_DOC = "/docs/AURA_RH_WRAPPER.md";

/** Base WETH — official second pair later, same token. */
export const BASE_WETH = WETH_ADDRESSES.base;

export const AURA_CURVE_CHAIN = {
  id: 8453,
  name: "Base",
  venue: "Uniswap v4",
  venueDe: "Uniswap v4",
} as const;

/**
 * Starting book — not the official $1,111 seed.
 * $6k USDC under the start tick + 18M AURA in a wide band above.
 * Rest of the 46,666,667 LP line drips higher. Not all AURA against $6k.
 */
export const AURA_LP_BOOK_USDC = 6000;
export const AURA_LP_START_PRICE_USD = 0.001;
export const AURA_LP_NEAR_AURA = 18_000_000;
export const AURA_LP_DRIP_AURA = 27_666_667;
export const AURA_LP_FAR_AURA = 1_000_000;
export const AURA_LP_NEAR_PRICE_USD = { min: 0.001, max: 0.0035 } as const;
export const AURA_LP_DRIP_PRICE_USD = { min: 0.0035, max: 0.02 } as const;
export const AURA_LP_FAR_PRICE_USD = { min: 0.02, max: 0.08 } as const;

/** Clanker deploy preset closest to FlatStart. Never send Project for platform AURA. */
export const AURA_CLANKER_POSITIONS = "Standard" as const;

/** Concentrated ticks, not a custom Bancor formula. FlatStart — not Project moon stairs. */
export const AURA_CURVE_ENGINE = {
  kind: "uni-v4-locked-lp",
  positions: "FlatStart",
  clankerPositions: AURA_CLANKER_POSITIONS,
  bands: 3,
  feePreset: "Dynamic3",
  feeMinBps: 100,
  feeMaxBps: 300,
  sniperStartingFee: 666_777,
  sniperEndingFee: 41_673,
  sniperSecondsToDecay: 15,
  note: "Flat-start Uni v4 book: $6k USDC + 18M AURA near ~$0.001. Locked ticks. Clanker Standard (or native v4) — not a Project moon stair, not a meme ticker.",
  noteDe:
    "Flat-Start-Uni-v4-Buch: 6k $ USDC + 18 Mio. AURA bei ~0,001 $. Gesperrte Ticks. Clanker Standard (oder natives v4) — keine Project-Mondtreppe, kein Meme-Ticker.",
} as const;

/** Tiny AURA-side swap burn. Keep 10–25 so the book still works. */
export const AURA_SWAP_BURN_BPS = 15;
export const AURA_SWAP_BURN_BPS_MIN = 10;
export const AURA_SWAP_BURN_BPS_MAX = 25;

/** Optional in-app spend burn (compute / Local boost). */
export const AURA_UTILITY_BURN_BPS = 100;
/** Lifetime utility-burn ceiling vs max supply — cannot brick the token. */
export const AURA_UTILITY_BURN_CAP_BPS = 200;

/** Official T-0 seed. USDC enters the AURA/USDC book; bought AURA lands in the launch treasury. */
export const AURA_DEV_BUY_USDC = 1111;
/** USDC that must sit on the new tokenAdmin wallet before Sunday (seed + book). Not ETH. */
export const AURA_T0_TREASURY_USDC = AURA_DEV_BUY_USDC + AURA_LP_BOOK_USDC;
export const AURA_T0_GAS_ETH = { min: 0.02, max: 0.05 } as const;

export const AURA_REWARD_SPLIT_BPS = {
  lpStakers: 5000,
  protocolSink: 2500,
  burn: 1500,
  questBonus: 1000,
} as const;

export const AURA_REWARD_SPLIT_TOTAL_BPS =
  AURA_REWARD_SPLIT_BPS.lpStakers +
  AURA_REWARD_SPLIT_BPS.protocolSink +
  AURA_REWARD_SPLIT_BPS.burn +
  AURA_REWARD_SPLIT_BPS.questBonus;

export type AuraOfficialPairId = "aura-usdc" | "aura-weth";

export type AuraOfficialPair = {
  id: AuraOfficialPairId;
  label: string;
  quote: "USDC" | "WETH";
  quoteAddress: `0x${string}`;
  phase: 1 | 3;
  officialBook: boolean;
};

export const AURA_OFFICIAL_PAIRS: readonly AuraOfficialPair[] = [
  {
    id: "aura-usdc",
    label: "AURA/USDC",
    quote: "USDC",
    quoteAddress: BASE_USDC,
    phase: 1,
    officialBook: true,
  },
  {
    id: "aura-weth",
    label: "AURA/WETH",
    quote: "WETH",
    quoteAddress: BASE_WETH,
    phase: 3,
    officialBook: false,
  },
] as const;

export const AURA_CURVE_COPY = {
  venue: "Uniswap v4 on Base",
  venueDe: "Uniswap v4 auf Base",
  lpLock:
    "Launch LP is a locked Uniswap v4 AURA/USDC FlatStart book — $6,000 USDC at ~$0.001, 18M AURA near the first ticks. No team withdraw. Official pool id only on aibusiness.fun and X @buildingcultu3.",
  lpLockDe:
    "Die Start-LP ist ein gesperrtes Uniswap-v4-AURA/USDC-FlatStart-Buch — 6.000 $ USDC bei ~0,001 $, 18 Mio. AURA an den ersten Ticks. Kein Team-Withdraw. Offizielle Pool-ID nur auf aibusiness.fun und X @buildingcultu3.",
  fairLaunch:
    "AURA is created from a new empty wallet at T-0 and paired on Uniswap v4 (Base, AURA/USDC). Locked LP, published hooks, Dynamic3 fees. Official CA only on aibusiness.fun and X @buildingcultu3. Not a company-desk Clanker meme.",
  fairLaunchDe:
    "AURA entsteht bei T-0 aus einer neuen, leeren Wallet und wird auf Uniswap v4 (Base, AURA/USDC) gepaart. Gesperrte LP, veröffentlichte Hooks, Dynamic3-Fees. Offizielle CA nur auf aibusiness.fun und X @buildingcultu3. Kein Company-Desk-Clanker-Meme.",
  softwareNotEquity:
    "This is software utility plus a public pool. You can lose the tokens. Not equity.",
  softwareNotEquityDe:
    "Das ist Software-Nutzen plus ein öffentlicher Pool. Du kannst die Token verlieren. Kein Equity.",
  noApy:
    "Fee share for staked LP is a trailing 7-day estimate — not a promised APY.",
  noApyDe:
    "Fee-Anteil für gestakte LP ist eine nachlaufende 7-Tage-Schätzung — kein versprochenes APY.",
  vsCultureCoin:
    "Diff vs Culture Coin: locked LP, fixed supply, published hooks, one official Base CA, never a surprise address in a DM.",
  vsCultureCoinDe:
    "Unterschied zu Culture Coin: gesperrte LP, fixer Supply, veröffentlichte Hooks, eine offizielle Base-CA, nie eine Überraschungsadresse per DM.",
  officialSeed:
    "Official T-0 seed $1,111 USDC → launch treasury / official book. Not Laszlo’s sale key.",
  officialSeedDe:
    "Offizieller T-0-Seed 1.111 $ USDC → Launch-Treasury / offizielles Buch. Nicht Laszlos Sale-Key.",
  tokenTaxZero:
    "Token tax 0%. Trading fee 1–3% on the official AURA/USDC pool. 0.15% swap burn. You can sell.",
  tokenTaxZeroDe:
    "Token-Steuer 0 %. Handelsgebühr 1–3 % auf dem offiziellen AURA/USDC-Pool. 0,15 % Swap-Burn. Du kannst verkaufen.",
  youCanSell: "You can sell. No blacklist. No transfer tax.",
  youCanSellDe: "Du kannst verkaufen. Keine Blacklist. Keine Transfer-Steuer.",
  startingBook:
    "Starting book $6,000 USDC at ~$0.001. First buys get a real bag. Curve is flat-start, not a Project moon stair. Official seed $1,111 stays.",
  startingBookDe:
    "Startbuch 6.000 $ USDC bei ~0,001 $. Erste Käufe bekommen eine echte Tasche. Flat-Start, keine Project-Mondtreppe. Offizieller Seed 1.111 $ bleibt.",
} as const;

export const AURA_AIRDROP_ONLY = ["pAURA redeem +11%", "Hood 7,777 claim"] as const;

export const AURA_NOT_PROMISED = [
  "No TICKPIX ERC-20 or second Culture Coin",
  "No promised APY or number-go-up",
  "No custom unaudited Bancor curve as the first launch",
  "No second official CA at T-0",
  "No TICKPIX / CCFF00 on /sale or pAURA rails",
  "No transfer tax / blacklist / honeypot on AuraToken",
  "No ClankerTokenV4 as official AURA",
] as const;

function readEnvAddress(
  procKeys: string[],
  viteKeys: string[],
): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? procKeys.map((k) => process.env[k] || "").find(Boolean) || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" && import.meta.env
      ? viteKeys
          .map((k) =>
            typeof import.meta.env[k] === "string" ? String(import.meta.env[k]) : "",
          )
          .find(Boolean) || ""
      : "";
  return readConfiguredBaseAddress(fromProc, fromVite);
}

/** bytes32 pool id or a 20-byte hook/pool manager id — never invent one. */
export function readConfiguredHexId(
  ...candidates: Array<string | undefined>
): string | null {
  for (const raw of candidates) {
    const value = raw?.trim() ?? "";
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) return value;
    if (/^0x[a-fA-F0-9]{64}$/.test(value)) return value;
  }
  return null;
}

function readEnvHexId(procKeys: string[], viteKeys: string[]): string | null {
  const fromProc =
    typeof process !== "undefined"
      ? procKeys.map((k) => process.env[k] || "").find(Boolean) || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" && import.meta.env
      ? viteKeys
          .map((k) =>
            typeof import.meta.env[k] === "string" ? String(import.meta.env[k]) : "",
          )
          .find(Boolean) || ""
      : "";
  return readConfiguredHexId(fromProc, fromVite);
}

export function auraPoolUsdcId(): string | null {
  return (
    readEnvHexId(
      ["AURA_POOL_USDC", "AURA_PAIR_CA"],
      ["VITE_AURA_POOL_USDC", "VITE_AURA_PAIR_CA"],
    )
  );
}

export function auraPoolWethId(): string | null {
  return readEnvHexId(["AURA_POOL_WETH"], ["VITE_AURA_POOL_WETH"]);
}

export function auraGaugeAddress(): `0x${string}` | null {
  return readEnvAddress(["AURA_GAUGE"], ["VITE_AURA_GAUGE"]);
}

export function auraBurnSinkAddress(): `0x${string}` | null {
  return readEnvAddress(["AURA_BURN_SINK"], ["VITE_AURA_BURN_SINK"]);
}

export function auraProtocolSinkAddress(): `0x${string}` | null {
  return readEnvAddress(["AURA_PROTOCOL_SINK"], ["VITE_AURA_PROTOCOL_SINK"]);
}

export function auraQuestBonusAddress(): `0x${string}` | null {
  return readEnvAddress(["AURA_QUEST_BONUS"], ["VITE_AURA_QUEST_BONUS"]);
}

/** Optional RH wrapper — never the official T-0 CA. */
export function auraRhWrapperAddress(): `0x${string}` | null {
  return readEnvAddress(["AURA_RH_WRAPPER"], ["VITE_AURA_RH_WRAPPER"]);
}

/** Trailing 7-day fee APR percent, labeled estimate. Null until a real window exists. */
export function auraTrailingFeeApr7d(): number | null {
  const raw =
    typeof process !== "undefined"
      ? process.env["AURA_FEE_APR_7D"] || process.env["VITE_AURA_FEE_APR_7D"] || ""
      : typeof import.meta !== "undefined" &&
          import.meta.env &&
          typeof import.meta.env["VITE_AURA_FEE_APR_7D"] === "string"
        ? String(import.meta.env["VITE_AURA_FEE_APR_7D"])
        : "";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 10_000) return null;
  return n;
}

export const AURA_GAUGE_ABI = [
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "unstake",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "staked",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type AuraOfficialCaRow = {
  id: string;
  label: string;
  labelDe: string;
  value: string | null;
  kind: "token" | "pool" | "sink" | "gauge" | "treasury" | "wrapper";
  t0: boolean;
};

export function auraOfficialCaRows(input: {
  token: string | null;
  treasury: string | null;
}): AuraOfficialCaRow[] {
  return [
    {
      id: "token",
      label: "AURA (Base)",
      labelDe: "AURA (Base)",
      value: input.token,
      kind: "token",
      t0: true,
    },
    {
      id: "pool-usdc",
      label: "Official pool AURA/USDC",
      labelDe: "Offizieller Pool AURA/USDC",
      value: auraPoolUsdcId(),
      kind: "pool",
      t0: true,
    },
    {
      id: "pool-weth",
      label: "Second pool AURA/WETH",
      labelDe: "Zweiter Pool AURA/WETH",
      value: auraPoolWethId(),
      kind: "pool",
      t0: false,
    },
    {
      id: "gauge",
      label: "AuraGauge",
      labelDe: "AuraGauge",
      value: auraGaugeAddress(),
      kind: "gauge",
      t0: true,
    },
    {
      id: "burn",
      label: "AuraBurnSink",
      labelDe: "AuraBurnSink",
      value: auraBurnSinkAddress(),
      kind: "sink",
      t0: true,
    },
    {
      id: "protocol",
      label: "Protocol sink (ops)",
      labelDe: "Protokoll-Sink (Ops)",
      value: auraProtocolSinkAddress(),
      kind: "sink",
      t0: true,
    },
    {
      id: "treasury",
      label: "Launch treasury",
      labelDe: "Launch-Treasury",
      value: input.treasury,
      kind: "treasury",
      t0: true,
    },
    {
      id: "rh-wrapper",
      label: "RH wrapper (not official CA)",
      labelDe: "RH-Wrapper (keine offizielle CA)",
      value: auraRhWrapperAddress(),
      kind: "wrapper",
      t0: false,
    },
  ];
}

export function auraPairLive(id: AuraOfficialPairId): boolean {
  if (id === "aura-usdc") return Boolean(auraPoolUsdcId());
  return Boolean(auraPoolWethId());
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

export function assertAuraCurveRules(): void {
  if (AURA_REWARD_SPLIT_TOTAL_BPS !== 10_000) {
    throw new Error(`Reward split must sum to 10000 bps, got ${AURA_REWARD_SPLIT_TOTAL_BPS}`);
  }
  if (AURA_SWAP_BURN_BPS < AURA_SWAP_BURN_BPS_MIN || AURA_SWAP_BURN_BPS > AURA_SWAP_BURN_BPS_MAX) {
    throw new Error(`Swap burn ${AURA_SWAP_BURN_BPS} bps must stay in 10–25`);
  }
  if (AURA_UTILITY_BURN_CAP_BPS >= 10_000) {
    throw new Error("Utility burn cap cannot be 100% of supply");
  }
  if (AURA_MAX_SUPPLY !== 777_777_777) {
    throw new Error("Curve spec must keep the 777,777,777 cap");
  }
  if (AURA_DEV_BUY_USDC !== 1111) {
    throw new Error("Official T-0 seed must stay $1,111 USDC");
  }
  if (AURA_LP_BOOK_USDC !== 6000) {
    throw new Error("Starting book quote must stay $6,000 USDC");
  }
  if (AURA_LP_START_PRICE_USD !== 0.001) {
    throw new Error("FlatStart start price must stay $0.001");
  }
  if (AURA_CURVE_ENGINE.positions !== "FlatStart" || AURA_CURVE_ENGINE.bands !== 3) {
    throw new Error("Official book must stay FlatStart (3 bands), not Project");
  }
  if (AURA_CURVE_ENGINE.clankerPositions !== "Standard") {
    throw new Error("Clanker deploy preset for FlatStart must stay Standard");
  }
  const lpLine = allocationById("liquidity").amount;
  if (AURA_LP_NEAR_AURA + AURA_LP_DRIP_AURA + AURA_LP_FAR_AURA !== lpLine) {
    throw new Error("Near + drip + far AURA must equal the 46,666,667 LP allocation");
  }
  if (AURA_CURVE_ENGINE.feeMinBps !== 100 || AURA_CURVE_ENGINE.feeMaxBps !== 300) {
    throw new Error("Official pool fee must stay Dynamic3 1–3% (token tax stays 0)");
  }
  if (PRIVATE_SALE_BONUS_BPS !== 1100) {
    throw new Error("pAURA redeem must stay +11%");
  }
  const redeem = (100n * BigInt(10_000 + PRIVATE_SALE_BONUS_BPS)) / 10_000n;
  if (redeem !== 111n) {
    throw new Error("1 pAURA must redeem to 1.11 AURA");
  }
  const book = AURA_OFFICIAL_PAIRS.filter((p) => p.officialBook);
  if (book.length !== 1 || book[0]?.id !== "aura-usdc") {
    throw new Error("Official T-0 book must be exactly AURA/USDC");
  }
}

assertAuraCurveRules();
