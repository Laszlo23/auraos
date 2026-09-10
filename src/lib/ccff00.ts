/**
 * CCFF00 — HoodStreet “Proof of Neon” founding membership (Robinhood Chain).
 * Culture passport for RH — not Aura founding seats, not $CCFF00 meme speculation.
 * Verify NFT balanceOf only; ignore ERC-20 $CCFF00 pools.
 */

export const CCFF00 = {
  name: "CCFF00",
  tagline: "Proof of Neon",
  partner: "HoodStreet",
  path: "/pit",
  siteUrl: "https://hoodstreet.capital/",
  mintUrl: "https://hoodstreet.capital/ccff00",
  xUrl: "https://x.com/hoodstreetcap",
  clubXUrl: "https://x.com/ccff00club",
  network: "robinhood" as const,
  chainId: 4663,
  /** Official NFT collection — from hoodstreet.capital mainnet contracts. */
  defaultNftContract: "0x505A22Ffed8d37ebE580FfD98d2Cdb0021189146",
  /**
   * Official project ERC-20 that loads into each ERC-6551 TBA at mint.
   * Not used for Aura membership checks — verify the NFT, never the meme ticker alone.
   */
  defaultTokenContract: "0x73CB777311Dc5e464C53Ddafb4496Fd87fE0eC97",
  publicRpc: "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robinhoodchain.blockscout.com",
  /** Soft quest XP bump — stacks with Tickpix, never Hood-tier rebates. */
  questXpBoostPct: 5,
  maxSupply: 10_000,
} as const;

export const CCFF00_COPY = {
  badge: "Hoodstreet · CCFF00",
  badgeDe: "Hoodstreet · CCFF00",
  blurb:
    "HoodStreet founding membership on Robinhood Chain. Each NFT is an ERC-6551 wallet. Aura verifies the NFT — never a DM CA, never the meme ticker alone.",
  blurbDe:
    "HoodStreet-Founding-Membership auf Robinhood Chain. Jedes NFT ist eine ERC-6551-Wallet. Aura prüft das NFT — nie eine DM-CA, nie nur den Meme-Ticker.",
} as const;

/** Resolve CCFF00 ERC-721 address from env or published default. */
export function ccff00NftContractAddress(): `0x${string}` | null {
  const raw =
    (typeof process !== "undefined"
      ? process.env["CCFF00_CONTRACT_ADDRESS"]?.trim() ||
        process.env["VITE_CCFF00_CONTRACT_ADDRESS"]?.trim()
      : undefined) || CCFF00.defaultNftContract;
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as `0x${string}`;
}

export function ccff00ExplorerNftUrl(): string {
  const ca = ccff00NftContractAddress();
  if (!ca) return CCFF00.mintUrl;
  return `${CCFF00.explorer}/token/${ca}`;
}

/** Optional founder demo wallets (comma-separated) — still verified on-chain for everyone. */
export function ccff00FounderWallets(): `0x${string}`[] {
  if (typeof process === "undefined") return [];
  const raw = process.env["CCFF00_FOUNDER_WALLETS"]?.trim() || "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is `0x${string}` => /^0x[a-fA-F0-9]{40}$/.test(s));
}
