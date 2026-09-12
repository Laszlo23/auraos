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
  /** Planned wallet mint — $11, not $111. Hood stays $299. Raise later via setMintPriceUsdc. */
  mintUsd: 11,
  /** Wallet mint only — USDC 6 decimals. */
  mintUsdcUnits: 11_000_000n,
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
    "Mint is wallet-only on Base: approve USDC and call mint(). Stripe does not sell Squares. Optional TBA top-up is a later USDC send — you can lose the tokens. Not equity.",
  stripeHonestDe:
    "Mint nur per Wallet auf Base: USDC freigeben und mint() aufrufen. Stripe verkauft keine Squares. TBA-Aufladung ist ein späterer USDC-Send — du kannst die Token verlieren. Kein Equity.",
  walletMint:
    "Connect a wallet on Base. Approve $11 USDC. Call mint(). The Square and its TBA land in that wallet.",
  walletMintDe:
    "Wallet auf Base verbinden. 11 $ USDC freigeben. mint() aufrufen. Square und TBA landen in dieser Wallet.",
  missing:
    "The Solidity is written. It is not deployed. No CA on Base. No Squares minted. The TBA stays empty until AURA exists after T-0. Metadata is the app icon. There is no on-chain OS perk and no auto-bind. Do not deploy before T-0.",
  missingDe:
    "Der Solidity-Code existiert. Er ist nicht deployed. Keine CA auf Base. Keine Squares gemintet. Die TBA bleibt leer, bis AURA nach T-0 existiert. Metadata ist das App-Icon. Kein On-Chain-OS-Perk, kein Auto-Bind. Nicht vor T-0 deployen.",
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
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
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
