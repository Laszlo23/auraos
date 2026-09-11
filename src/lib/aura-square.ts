/**
 * Aura Square — Base ERC-721 + ERC-6551 binder. Not Hood. Not on pAURA rails.
 * CA stays null until env is set. Never invent one.
 */

import { readConfiguredBaseAddress } from "@/lib/aura-token";
import { BASE_USDC } from "@/lib/private-sale";
import { SITE_URL } from "@/lib/site";

export const AURA_SQUARE = {
  name: "Aura Square",
  symbol: "AURASQ",
  path: "/square",
  maxSupply: 1111,
  /** USDC whole dollars — distinct from Hood $299. */
  mintUsd: 111,
  tbaFundMinUsd: 11,
  tbaFundMaxUsd: 1111,
  chainId: 8453,
  /** Canonical ERC-6551 registry (Tokenbound). */
  registry: "0x000000006551c19487814612e58FE06813775758" as const,
  /** Tokenbound Account V3 implementation. */
  tbaImplementation: "0x41C8f39463A868d3A88af00cd0fe7102F30E44eC" as const,
} as const;

export const AURA_SQUARE_COPY = {
  kicker: "Aura Square · Base binder",
  kickerDe: "Aura Square · Base-Binder",
  title: "A square that holds tokens.",
  titleDe: "Ein Square, der Token hält.",
  lead:
    "Utility NFT on Base. Each Square opens an ERC-6551 smart wallet that can hold AURA, USDC, or later company tokens. Not founding seats. Not Hood. Not on the pAURA sale.",
  leadDe:
    "Utility-NFT auf Base. Jeder Square öffnet eine ERC-6551-Smart-Wallet, die AURA, USDC oder später Company-Token halten kann. Keine Founding Seats. Kein Hood. Nicht im pAURA-Sale.",
  notHood:
    "Cap is 1,111 — not Hood’s 1,000. No founding rebates. No surprise AURA airdrop into the TBA.",
  notHoodDe:
    "Cap ist 1.111 — nicht Hoods 1.000. Keine Founding-Rabatte. Kein Überraschungs-AURA-Airdrop in die TBA.",
  stripeHonest:
    "Stripe does not teleport USDC. After checkout, the ops wallet mints the Square or sends USDC into that TBA on Base. You can lose the tokens. Not equity.",
  stripeHonestDe:
    "Stripe teleportiert kein USDC. Nach dem Checkout mintet die Ops-Wallet den Square oder schickt USDC in diese TBA auf Base. Du kannst die Token verlieren. Kein Equity.",
} as const;

export function auraSquareAddress(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["AURA_SQUARE_CA"] || process.env["VITE_AURA_SQUARE_CA"] || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_AURA_SQUARE_CA"] === "string"
      ? String(import.meta.env["VITE_AURA_SQUARE_CA"])
      : "";
  return readConfiguredBaseAddress(fromProc, fromVite);
}

export function auraSquareExplorerUrl(ca = auraSquareAddress()): string | null {
  if (!ca) return null;
  return `https://basescan.org/token/${ca}`;
}

export function auraSquareMintUrl(): string {
  return `${SITE_URL}${AURA_SQUARE.path}`;
}

export const AURA_SQUARE_USDC = BASE_USDC;

export const AURA_SQUARE_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "mintTo",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mintPriceUsdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ERC6551_REGISTRY_ABI = [
  {
    type: "function",
    name: "account",
    stateMutability: "view",
    inputs: [
      { name: "implementation", type: "address" },
      { name: "salt", type: "bytes32" },
      { name: "chainId", type: "uint256" },
      { name: "tokenContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export function squareCollectionMetadata() {
  const ca = auraSquareAddress();
  return {
    name: AURA_SQUARE.name,
    description: AURA_SQUARE_COPY.lead,
    image: `${SITE_URL}/brand/aura-app-icon.png`,
    external_url: auraSquareMintUrl(),
    seller_fee_basis_points: 0,
    fee_recipient: ca,
  };
}

export function squareTokenMetadata(tokenId: number) {
  return {
    name: `${AURA_SQUARE.name} #${tokenId}`,
    description: `${AURA_SQUARE_COPY.lead} ${AURA_SQUARE_COPY.notHood}`,
    image: `${SITE_URL}/brand/aura-app-icon.png`,
    external_url: `${auraSquareMintUrl()}#${tokenId}`,
    attributes: [
      { trait_type: "Collection", value: AURA_SQUARE.name },
      { trait_type: "Utility", value: "ERC-6551 token binder" },
      { trait_type: "Chain", value: "Base" },
      { trait_type: "Token ID", value: tokenId, display_type: "number" },
      { trait_type: "Max Supply", value: AURA_SQUARE.maxSupply, display_type: "number" },
      { trait_type: "Not", value: "Hood · pAURA · founding seat" },
    ],
  };
}
