/**
 * Genesis identity policy — on-chain Hood cap is immutable at 1,000.
 * "Genesis 777" is a profile tier for the first 777 Hood minters + early contributors.
 */
export const HOOD_MAX_SUPPLY = 1000;
export const GENESIS_TIER_MAX = 777;

/** Hood tokenId 1–777 maps to genesis_number on user_progress. */
export function genesisNumberFromHoodTokenId(tokenId: number | null | undefined): number | null {
  if (tokenId == null || !Number.isFinite(tokenId)) return null;
  const id = Math.floor(tokenId);
  if (id < 1 || id > GENESIS_TIER_MAX) return null;
  return id;
}

export function isGenesisTier(genesisNumber: number | null | undefined): boolean {
  return genesisNumber != null && genesisNumber >= 1 && genesisNumber <= GENESIS_TIER_MAX;
}

export const GENESIS_POLICY = {
  hoodSupply: HOOD_MAX_SUPPLY,
  genesisTierCap: GENESIS_TIER_MAX,
  summary:
    "Hood NFT supply stays capped at 1,000 on-chain. Genesis 777 is a profile tier — first 777 Hood minters and verified early contributors — without changing contract supply.",
} as const;
