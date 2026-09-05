import { AURA_MAX_SUPPLY } from "@/lib/aura-token";

export const PAURA_NAME = "AURA Private Sale";
export const PAURA_SYMBOL = "pAURA";

/**
 * Immutable treasury on the live pAURA contract (`TREASURY()`).
 * Every on-chain `buy` / `buyFor` sends 100% USDC here — never invent a different address.
 * Changing the destination requires a new sale contract + CA cutover.
 */
export const PRIVATE_SALE_TREASURY = "0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1" as const;

/**
 * Platform rails wallet (x402 payTo, OKX referrer, Clanker platform fee, NOW withdraw target).
 * Distinct from the live sale/ops immutables until those contracts are redeployed.
 */
export const PLATFORM_RAILS_TREASURY =
  "0xAC55a8674398BF050F21940EE0bB2d18BC393114" as const;
export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
/** Live Base pAURA sale — public CA, not a secret. */
export const PRIVATE_SALE_CONTRACT_LIVE = "0x25f42e74ce4697a29d9f252981fb9efa35aee55c" as const;

/** Whole pAURA that can be minted (33% of AURA after +11% bonus). On-chain SALE_CAP. */
export const PRIVATE_SALE_CAP_WHOLE = 231_231_200;
/** Open-buyer slice of the cap. pAURA must be a multiple of 100 so ×1.11 stays whole. */
export const PRIVATE_SALE_OPEN_PAURA = 210_210_200;
/** Project take bought after 48h, then locked 90 days after T-0. */
export const PRIVATE_SALE_PROJECT_PAURA = 21_021_000;
/** AURA reserved at T-0 if the cap sells out (cap × 1.11). */
export const PRIVATE_SALE_LAUNCH_AURA = 256_666_632;
export const PRIVATE_SALE_OPEN_LAUNCH_AURA = 233_333_322;
export const PRIVATE_SALE_PROJECT_LAUNCH_AURA = 23_333_310;
export const PRIVATE_SALE_BONUS_BPS = 1100;
export const PRIVATE_SALE_MIN_USDC = 50;
export const PRIVATE_SALE_FDV_USDC = 1_000_000;
export const PRIVATE_SALE_ADMIN_NAME = "Laszlo";

export const PRIVATE_SALE_ABI = [
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [{ name: "usdcAmount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "buyFor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "usdcAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "creditCash",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "pAuraAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "previewBuy",
    stateMutability: "pure",
    inputs: [{ name: "usdcAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
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
    name: "remaining",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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
    name: "usdcRaised",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "saleClosed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "SALE_CAP",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MIN_USDC",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "TREASURY",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
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
] as const;

export const ERC20_ABI = [
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
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
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
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export function usdcToPAura(usdc: number): number {
  if (!Number.isFinite(usdc) || usdc <= 0) return 0;
  return (usdc * AURA_MAX_SUPPLY) / PRIVATE_SALE_FDV_USDC;
}

export function pAuraToLaunchAura(pAura: number): number {
  if (!Number.isFinite(pAura) || pAura <= 0) return 0;
  return (pAura * (10_000 + PRIVATE_SALE_BONUS_BPS)) / 10_000;
}

export function isPrivateSaleSender(name: string): boolean {
  return name.trim().toLowerCase() === PRIVATE_SALE_ADMIN_NAME.toLowerCase();
}

export function isBaseAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function privateSaleContractAddress(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["PRIVATE_SALE_CONTRACT"] || process.env["VITE_PRIVATE_SALE_CONTRACT"] || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_PRIVATE_SALE_CONTRACT"] === "string"
      ? String(import.meta.env["VITE_PRIVATE_SALE_CONTRACT"])
      : "";
  const raw = (fromProc || fromVite || PRIVATE_SALE_CONTRACT_LIVE).trim();
  if (!isBaseAddress(raw)) return null;
  return raw;
}

export function privateSaleBasescan(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `https://basescan.org${clean}`;
}
