/**
 * On-chain Hood → fair-launch desk (v2). Numbers match the Solidity constants.
 * Official CAs stay null until deploy — never invent one.
 * Gift surface is AuraHoodGiftDrop: unlocked AURA claimable at T-0.
 */

import { FOUNDING_SEAT_USD, PRICE_OPS_BPS, PRICE_REMAINDER_BPS } from "@/lib/founding-price";
import { BASE_USDC } from "@/lib/private-sale";
import { AURA_LAUNCH_TREASURY, readConfiguredBaseAddress } from "@/lib/aura-token";

export const HOOD_MAX_SUPPLY = 1000;
export const HOOD_GIFT_AURA = 7_777;
export const HOOD_GIFT_TOTAL_AURA = HOOD_GIFT_AURA * HOOD_MAX_SUPPLY;
export const HOOD_GIFT_DUST_AURA = 778;
/** Desk v2: claim as soon as T-0 binds AURA (AuraHoodGiftDrop.LOCK_DAYS = 0). */
export const HOOD_GIFT_LOCK_DAYS = 0;
export const LAUNCH_MARKET_TIMELOCK_HOURS = 72;
export const LAUNCH_DESK_VERSION = 2;

/** USDC 6-decimals, matches AuraLaunchEscrow.PRICE_USDC */
export const HOOD_PRICE_USDC_UNITS = 299_000_000n;
export const HOOD_LP_USDC_UNITS = 209_300_000n;
export const HOOD_OPS_USDC_UNITS = 89_700_000n;

export const LAUNCH_USDC = BASE_USDC;
export const LAUNCH_OPS_DEFAULT = AURA_LAUNCH_TREASURY;

export const LAUNCH_PROOF = {
  title: "On-chain. Unruggable desk.",
  titleDe: "On-chain. Schreibtisch ohne Rug.",
  lead: "Every Hood mint deposits USDC on Base. 70% is trapped in the launch escrow — it can only buy AURA on the committed fair-launch pair. Those tokens go to the Hood gift drop. 30% goes to an immutable ops address. Gift Hoods still seed the book: the sponsor pays the $209.30 LP slice. At T-0, Hood owners claim unlocked AURA into their wallet. The market bind is public and waits 72 hours.",
  leadDe:
    "Jeder Hood-Mint legt USDC auf Base ein. 70% bleiben im Launch-Escrow — sie können nur AURA auf dem festgelegten Fair-Launch-Paar kaufen. Diese Token gehen in den Hood-Gift-Drop. 30% gehen an eine unveränderliche Ops-Adresse. Geschenkte Hoods füllen das Buch trotzdem: der Sponsor zahlt die 209,30-$ LP-Scheibe. Ab T-0 claimen Hood-Owner freigeschaltete AURA in ihre Wallet. Die Marktbindung ist öffentlich und wartet 72 Stunden.",
  bullets: [
    {
      id: "escrow",
      en: "70% ($209.30) USDC cannot be withdrawn to a team wallet. Only a timelocked buy into the official pair.",
      de: "70% (209,30 $) USDC sind nicht auf eine Team-Wallet abziehbar. Nur ein zeitgesperrter Kauf ins offizielle Paar.",
    },
    {
      id: "ops",
      en: "30% ($89.70) to an immutable ops address set at deploy. That live desk sink is not the official AURA treasury.",
      de: "30% (89,70 $) an eine unveränderliche Ops-Adresse aus dem Deploy. Diese Live-Desk-Senke ist nicht die offizielle AURA-Treasury.",
    },
    {
      id: "gift",
      en: "Each Hood is owed 7,777 unlocked AURA (7,777,000 if all 1,000 mint) plus any AURA the book buys.",
      de: "Jeder Hood bekommt 7.777 freigeschaltete AURA (7.777.000 bei 1.000 Mints) plus AURA, die das Buch kauft.",
    },
    {
      id: "lock",
      en: "Claim at T-0 — AURA lands in the current Hood owner's wallet. No admin clawback. No 90-day hostage.",
      de: "Claim ab T-0 — AURA landet in der Wallet des aktuellen Hood-Owners. Kein Admin-Clawback. Keine 90-Tage-Geisel.",
    },
    {
      id: "timelock",
      en: "Guardian proposes AURA + pair. 72-hour public delay. Propose again and the clock resets. Anyone can execute.",
      de: "Guardian schlägt AURA + Paar vor. 72 Stunden öffentlich. Neu vorschlagen setzt die Uhr zurück. Jeder kann ausführen.",
    },
    {
      id: "supply",
      en: "Hood max supply is 1,000 and cannot be raised. Metadata freezes one-way.",
      de: "Hood-Max-Supply ist 1.000 und kann nicht erhöht werden. Metadata friert einseitig ein.",
    },
  ],
} as const;

export function launchEscrowAddress(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["LAUNCH_ESCROW_CONTRACT"] || process.env["VITE_LAUNCH_ESCROW_CONTRACT"] || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_LAUNCH_ESCROW_CONTRACT"] === "string"
      ? String(import.meta.env["VITE_LAUNCH_ESCROW_CONTRACT"])
      : "";
  return readConfiguredBaseAddress(fromProc, fromVite);
}

/** Env key kept as LAUNCH_GIFT_LOCK_CONTRACT; value is AuraHoodGiftDrop on Desk v2. */
export function launchGiftLockAddress(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["LAUNCH_GIFT_LOCK_CONTRACT"] ||
        process.env["VITE_LAUNCH_GIFT_LOCK_CONTRACT"] ||
        ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_LAUNCH_GIFT_LOCK_CONTRACT"] === "string"
      ? String(import.meta.env["VITE_LAUNCH_GIFT_LOCK_CONTRACT"])
      : "";
  return readConfiguredBaseAddress(fromProc, fromVite);
}

export const launchGiftDropAddress = launchGiftLockAddress;

export function assertLaunchMath() {
  if (HOOD_GIFT_TOTAL_AURA + HOOD_GIFT_DUST_AURA !== 7_777_778) {
    throw new Error("Hood gifts must consume the 1% public slice (7,777,778).");
  }
  if (FOUNDING_SEAT_USD !== 299) throw new Error("Hood price must stay $299.");
  if (PRICE_REMAINDER_BPS !== 7_000 || PRICE_OPS_BPS !== 3_000) {
    throw new Error("Hood split must stay 70/30.");
  }
  if (HOOD_LP_USDC_UNITS + HOOD_OPS_USDC_UNITS !== HOOD_PRICE_USDC_UNITS) {
    throw new Error("USDC units must split 209.30 / 89.70.");
  }
  if (HOOD_GIFT_LOCK_DAYS !== 0) {
    throw new Error("Desk v2 gifts claim at T-0 (LOCK_DAYS = 0).");
  }
}

assertLaunchMath();

/** Client/server ABIs for wallet mint (approve USDC → mintPaid). */
export const HOOD_ESCROW_ABI = [
  {
    type: "function",
    name: "mintPaid",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "hoodFunded",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "PRICE_USDC",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "launched",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "sweepBook",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export const HOOD_PASSPORT_ABI = [
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "maxSupply",
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
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** AuraHoodGiftDrop — claim unlocked AURA after T-0. */
export const HOOD_GIFT_DROP_ABI = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "pending",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allocated",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "claimed",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "t0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "GIFT_PER_HOOD",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "LOCK_DAYS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function genesisPassportAddress(): `0x${string}` | null {
  const fromProc =
    typeof process !== "undefined"
      ? process.env["GENESIS_NFT_CONTRACT"] || process.env["VITE_GENESIS_NFT_CONTRACT"] || ""
      : "";
  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env["VITE_GENESIS_NFT_CONTRACT"] === "string"
      ? String(import.meta.env["VITE_GENESIS_NFT_CONTRACT"])
      : "";
  return readConfiguredBaseAddress(fromProc, fromVite);
}

export function hoodMintExplorer(txHash: string): string {
  return `https://basescan.org/tx/${txHash}`;
}
