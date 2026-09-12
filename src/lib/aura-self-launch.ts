/**
 * Platform AURA T-0 helpers (addresses, redeem math, legacy Uni v2 ABIs for Hood escrow).
 * Venue is Uniswap v4 on Base — see aura-curve.ts. CAs stay null until deploy. Never invent one.
 */

import {
  AURA_ALLOCATIONS,
  AURA_MAX_SUPPLY,
  allocationById,
  onlyIfAuraCaPublished,
  publishedAuraTokenAddress,
  readConfiguredBaseAddress,
} from "@/lib/aura-token";
import {
  PRIVATE_SALE_CONTRACT_LIVE,
  PRIVATE_SALE_OPEN_LAUNCH_AURA,
  PRIVATE_SALE_PROJECT_LAUNCH_AURA,
  BASE_USDC,
} from "@/lib/private-sale";

/** Base Uniswap V2 (official). */
export const BASE_UNI_V2_FACTORY = "0x8909Dc15e40173Ff4699343b6eB8132c65e14bE8" as const;
export const BASE_UNI_V2_ROUTER = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24" as const;

export const AURA_LP_DEAD = "0x000000000000000000000000000000000000dEaD" as const;

export const AURA_TEAM_CLIFF_SECONDS = 365 * 24 * 60 * 60;
/** Full VestingWallet duration = cliff + linear vest (OZ cliff must be ≤ duration). */
export const AURA_TEAM_DURATION_SECONDS = 4 * 365 * 24 * 60 * 60;
export const AURA_ADVISOR_CLIFF_SECONDS = AURA_TEAM_CLIFF_SECONDS;
export const AURA_ADVISOR_DURATION_SECONDS = AURA_TEAM_DURATION_SECONDS;

export const PAURA_REDEEM_BONUS_BPS = 1100;

export function pAuraToAuraAmount(pAuraWholeOrWei: bigint): bigint {
  return (pAuraWholeOrWei * BigInt(10_000 + PAURA_REDEEM_BONUS_BPS)) / 10_000n;
}

/** AURA wei reserved for pAURA redeem if sale sells out (open + project). */
export const AURA_REDEEM_RESERVE_WHOLE =
  PRIVATE_SALE_OPEN_LAUNCH_AURA + PRIVATE_SALE_PROJECT_LAUNCH_AURA;

export function auraTokenAddress(): `0x${string}` | null {
  return publishedAuraTokenAddress();
}

export function auraPairAddress(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["AURA_PAIR_CA"] || process.env["VITE_AURA_PAIR_CA"] || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_AURA_PAIR_CA"] === "string"
      ? String(import.meta.env["VITE_AURA_PAIR_CA"])
      : "";
  return onlyIfAuraCaPublished(readConfiguredBaseAddress(fromProc, fromVite));
}

export function auraLpSinkAddress(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["AURA_LP_SINK"] || process.env["VITE_AURA_LP_SINK"] || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_AURA_LP_SINK"] === "string"
      ? String(import.meta.env["VITE_AURA_LP_SINK"])
      : "";
  return onlyIfAuraCaPublished(readConfiguredBaseAddress(fromProc, fromVite));
}

export function auraPauraRedeemAddress(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["AURA_PAURA_REDEEM"] || process.env["VITE_AURA_PAURA_REDEEM"] || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_AURA_PAURA_REDEEM"] === "string"
      ? String(import.meta.env["VITE_AURA_PAURA_REDEEM"])
      : "";
  return onlyIfAuraCaPublished(readConfiguredBaseAddress(fromProc, fromVite));
}

export function defaultPauraAddress(): `0x${string}` {
  return PRIVATE_SALE_CONTRACT_LIVE;
}

export const AURA_SELF_LAUNCH = {
  venue: "Uniswap v4 on Base",
  venueDe: "Uniswap v4 auf Base",
  lpLock:
    "Launch LP is a locked Uniswap v4 AURA/USDC FlatStart book — $6,000 USDC at ~$0.001, not a Project moon stair. No team withdraw, not a team wallet.",
    lpLockDe:
    "Die Start-LP ist ein gesperrtes Uniswap-v4-AURA/USDC-FlatStart-Buch — 6.000 $ USDC bei ~0,001 $, keine Project-Mondtreppe. Kein Team-Withdraw, keine Team-Wallet.",
  fairLaunch:
    "AURA is created from a new empty wallet at T-0, paired on Uniswap v4 (Base, AURA/USDC). Locked LP, published hooks. Official CA only on aibusiness.fun and X @bihary41418. Platform TGE is not the company-desk Clanker product.",
  fairLaunchDe:
    "AURA entsteht bei T-0 aus einer neuen, leeren Wallet und wird auf Uniswap v4 (Base, AURA/USDC) gepaart. Gesperrte LP, veröffentlichte Hooks. Offizielle CA nur auf aibusiness.fun und X @bihary41418. Platform-TGE ist nicht das Company-Desk-Clanker-Produkt.",
} as const;

export const AURA_TOKEN_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MAX_SUPPLY",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const AURA_PAURA_REDEEM_ABI = [
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [{ name: "pAuraAmount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "open",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "launchClaimAmount",
    stateMutability: "pure",
    inputs: [{ name: "pAuraAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "openRedeem",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export const UNI_V2_ROUTER_ABI = [
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "factory",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const UNI_V2_FACTORY_ABI = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
  {
    type: "function",
    name: "createPair",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
] as const;

export function assertAuraSelfLaunchMath() {
  const sum = AURA_ALLOCATIONS.reduce((s, a) => s + a.amount, 0);
  if (sum !== AURA_MAX_SUPPLY) {
    throw new Error(`AURA allocations sum ${sum}, expected ${AURA_MAX_SUPPLY}`);
  }
  if (allocationById("liquidity").amount !== 46_666_667) {
    throw new Error("Liquidity slice must stay 46,666,667");
  }
  if (allocationById("public").amount !== 7_777_778) {
    throw new Error("Hood gift slice must stay 7,777,778");
  }
  if (AURA_REDEEM_RESERVE_WHOLE !== 256_666_632) {
    throw new Error("Redeem reserve must match private-sale launch AURA");
  }
}

assertAuraSelfLaunchMath();

export { BASE_USDC };
