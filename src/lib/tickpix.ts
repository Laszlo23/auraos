/**
 * TICKPIX — Robinhood Chain culture seats.
 * Community membership on the tape — not a second founding collection, not fundraising.
 * Mint lives at nft.aibusiness.fun; AuraOS verifies holders and unlocks belonging.
 */

export const TICKPIX = {
  name: "TICKPIX",
  tagline: "They live on the tape",
  path: "/pit",
  mintUrl: "https://nft.aibusiness.fun",
  network: "robinhood" as const,
  chainId: 4663,
  maxSupply: 4663,
  /** Default mainnet CA — override with TICKPIX_CONTRACT_ADDRESS. */
  defaultContract: "0xa1F563AA9AFF537b8D1dD551B4DB9eFc9EC2D117",
  publicRpc: "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robinhoodchain.blockscout.com",
  /** Soft quest XP bump for holders — never Hood-tier rebates. */
  questXpBoostPct: 5,
  allowlist: "CCFF00 holders: free until 12 Sep 19:00 UTC (extended)",
  publicPrice: "0.0001 ETH",
  raidEndsAt: "2026-09-12T19:00:00.000Z",
} as const;

export function tickpixRaidOpen(at: Date | number = Date.now()): boolean {
  const ms = typeof at === "number" ? at : at.getTime();
  return ms < Date.parse(TICKPIX.raidEndsAt);
}

export type TickpixWindowCopy = {
  metaTitle: string;
  metaDescription: string;
  banner: string;
  bannerDe: string;
  stepMint: string;
  stepMintDe: string;
  communityBlurb: string;
};

/** Public mint vs CCFF00 free-raid copy — flips at `TICKPIX.raidEndsAt`. */
export function tickpixWindowCopy(at: Date | number = Date.now()): TickpixWindowCopy {
  const price = TICKPIX.publicPrice;
  const chain = TICKPIX.chainId;
  if (tickpixRaidOpen(at)) {
    return {
      metaTitle: "TICKPIX — CCFF00 free raid extended",
      metaDescription:
        "CCFF00 free raid extended to 12 Sep 19:00 UTC. Mint TICKPIX on Robinhood Chain — max 3 free, then public 0.0001 ETH. Culture seats, not a fund. Pit → aibusiness.fun/pit.",
      banner: "CCFF00 free raid extended · until 12 Sep 19:00 UTC",
      bannerDe: "CCFF00 Free Raid verlängert · bis 12 Sep 19:00 UTC",
      stepMint: `CCFF00 free raid extended to 12 Sep 19:00 UTC · max 3 free · then public ${price}. Chain ${chain}.`,
      stepMintDe: `CCFF00 Free Raid verlängert bis 12 Sep 19:00 UTC · max 3 gratis · danach Public ${price}. Chain ${chain}.`,
      communityBlurb:
        "Culture seats on Robinhood Chain — mint free if you hold CCFF00 (until 12 Sep 19:00 UTC), then clock in on the tape. Hood stays the OS passport; Tickpix is belonging for the room.",
    };
  }
  return {
    metaTitle: "TICKPIX — the pit",
    metaDescription:
      "Mint TICKPIX culture seats on Robinhood Chain — public 0.0001 ETH. Verify the CA on Blockscout, never by DM. Pit → aibusiness.fun/pit.",
    banner: `Public mint · ${price} on Robinhood Chain`,
    bannerDe: `Public Mint · ${price} auf Robinhood Chain`,
    stepMint: `Public mint ${price} on chain ${chain}. CCFF00 free raid closed 12 Sep 19:00 UTC — seats still mint at nft.aibusiness.fun.`,
    stepMintDe: `Public Mint ${price} auf Chain ${chain}. CCFF00 Free Raid endete 12 Sep 19:00 UTC — Seats weiter auf nft.aibusiness.fun.`,
    communityBlurb:
      "Culture seats on Robinhood Chain — public mint 0.0001 ETH. CCFF00 holders who minted in the raid window keep their seats. Hood stays the OS passport; Tickpix is belonging for the room.",
  };
}

export const TICKPIX_COPY = {
  kicker: "TICKPIX · the pit",
  kickerDe: "TICKPIX · The Pit",
  title: "Take a seat on the tape.",
  titleDe: "Nimm einen Platz auf dem Tape.",
  lead: "Collectible pixel traders on Robinhood Chain. You mint a seat. It lives in your wallet. That’s it — not a stock, not a fund, not a second Hood.",
  leadDe:
    "Collectible Pixel-Trader auf Robinhood Chain. Du mintest einen Seat. Er liegt in der Wallet. Fertig — keine Aktie, kein Fund, kein zweites Hood.",
  auraLink:
    "Hold Tickpix → Pit badge + Quest XP in Aura OS. Hood stays the OS founding passport. Tickpix is culture for the room.",
  auraLinkDe:
    "Tickpix halten → Pit-Badge + Quest-XP in Aura OS. Hood bleibt der OS-Founding-Pass. Tickpix ist Kultur für den Raum.",
  disclaimer:
    "Ticker names are personality for the share card — not stock ownership. You can lose mint and gas ETH. This is a collectible, not an investment product.",
  disclaimerDe:
    "Ticker-Namen sind Persönlichkeit für die Share-Card — kein Aktienbesitz. Mint- und Gas-ETH kannst du verlieren. Collectible, kein Investmentprodukt.",
  cta: "Take a seat",
  ctaDe: "Seat nehmen",
} as const;

/** Resolve Tickpix ERC-721 address from env or published default. */
export function tickpixContractAddress(): `0x${string}` | null {
  const raw =
    (typeof process !== "undefined"
      ? process.env["TICKPIX_CONTRACT_ADDRESS"]?.trim() ||
        process.env["VITE_TICKPIX_CONTRACT_ADDRESS"]?.trim()
      : undefined) || TICKPIX.defaultContract;
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as `0x${string}`;
}

export function tickpixExplorerTokenUrl(tokenId?: number | string): string {
  const ca = tickpixContractAddress();
  if (!ca) return TICKPIX.mintUrl;
  if (tokenId != null && String(tokenId).length > 0) {
    return `${TICKPIX.explorer}/token/${ca}/instance/${tokenId}`;
  }
  return `${TICKPIX.explorer}/token/${ca}`;
}

export function tickpixCollectionUrl(): string {
  return (
    (typeof process !== "undefined"
      ? process.env["TICKPIX_COLLECTION_URL"]?.trim() ||
        process.env["VITE_TICKPIX_COLLECTION_URL"]?.trim()
      : undefined) || TICKPIX.mintUrl
  );
}
