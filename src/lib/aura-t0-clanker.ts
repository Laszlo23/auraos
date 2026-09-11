/**
 * Platform AURA T-0 spec — pool / lock / rewards around a **pre-deployed AuraToken.sol**.
 * Builds a deploy config — does **not** send a transaction.
 * Do not CREATE2 ClankerTokenV4 as official AURA (admin + crosschainMint fails GoPlus 10/10).
 * Company Launch Desk tokens use clanker.server.ts + company-token-presets. Keep them separate.
 */

import type { Address } from "viem";

import {
  AURA_CURVE_CHAIN,
  AURA_CURVE_ENGINE,
  AURA_DEV_BUY_USDC,
  AURA_LP_BOOK_USDC,
  AURA_LP_DRIP_AURA,
  AURA_LP_DRIP_PRICE_USD,
  AURA_LP_FAR_AURA,
  AURA_LP_FAR_PRICE_USD,
  AURA_LP_NEAR_AURA,
  AURA_LP_NEAR_PRICE_USD,
  AURA_LP_START_PRICE_USD,
  AURA_REWARD_SPLIT_BPS,
  AURA_REWARD_SPLIT_TOTAL_BPS,
  AURA_SWAP_BURN_BPS,
  BASE_WETH,
} from "@/lib/aura-curve";
import { AURA_POOL_FEE_BPS, AURA_TOKEN_TAX_BPS } from "@/lib/aura-scanner";
import { auraClankerMetadata, auraTokenImageUrl } from "@/lib/aura-token-meta";
import { AURA_MAX_SUPPLY, AURA_TOKEN_NAME, AURA_TOKEN_SYMBOL } from "@/lib/aura-token";
import { BASE_USDC } from "@/lib/private-sale";

export const AURA_T0_CLANKER_CONTEXT = {
  interface: "Aura OS",
  platform: "auraos",
  id: "AURA",
  notCompanyDesk: true,
  createFactoryToken: false,
  wrapsExistingAuraToken: true,
} as const;

/** T-0 pool venue. Wrap AuraToken if Clanker can; else native v4. Never factory token. */
export const AURA_T0_VENUE = {
  chain: "Base",
  pool: "Uniswap v4 AURA/USDC",
  wrapExisting: true,
  clankerPath:
    "Attach locked pool + Dynamic3 + fee split to pre-deployed AuraToken (existingToken: true).",
  nativeFallback:
    "Native Uni v4 Position Manager + published lock. Same Dynamic3 / 50-25-15-10 / 15 bps burn.",
  factoryTokenForbidden: "ClankerTokenV4",
} as const;

export type AuraPlatformTgeInput = {
  tokenAdmin: Address;
  protocolSink: Address;
  burnSink: Address;
  questBonus: Address;
  lpStakerRecipient: Address;
  /** Pre-deployed AuraToken.sol. Null until the 48h announce. Never invent one. */
  auraToken?: Address | null;
  /** Override the published $1,111 seed. Empty string skips the seed (tests only). */
  devBuyUsdc?: string;
  imageUrl?: string | null;
};

export function buildAuraPlatformTgeSpec(input: AuraPlatformTgeInput): Record<string, unknown> {
  if (AURA_REWARD_SPLIT_TOTAL_BPS !== 10_000) {
    throw new Error("AURA reward split must be 10000 bps");
  }

  const rewards = {
    recipients: [
      {
        admin: input.tokenAdmin,
        recipient: input.lpStakerRecipient,
        bps: AURA_REWARD_SPLIT_BPS.lpStakers,
        token: "Both" as const,
      },
      {
        admin: input.tokenAdmin,
        recipient: input.protocolSink,
        bps: AURA_REWARD_SPLIT_BPS.protocolSink,
        token: "Both" as const,
      },
      {
        admin: input.tokenAdmin,
        recipient: input.burnSink,
        bps: AURA_REWARD_SPLIT_BPS.burn,
        token: "Both" as const,
      },
      {
        admin: input.tokenAdmin,
        recipient: input.questBonus,
        bps: AURA_REWARD_SPLIT_BPS.questBonus,
        token: "Both" as const,
      },
    ],
  };

  return {
    name: AURA_TOKEN_NAME,
    symbol: AURA_TOKEN_SYMBOL,
    image: input.imageUrl ?? auraTokenImageUrl(),
    metadata: auraClankerMetadata(),
    tokenAdmin: input.tokenAdmin,
    auraToken: input.auraToken ?? null,
    existingToken: true,
    createFactoryToken: false,
    factoryTokenForbidden: "ClankerTokenV4",
    fallbackIfNoExistingTokenPool:
      "Native Uni v4 Position Manager + published lock. Same Dynamic3 / split / 15 bps burn. Never ClankerTokenV4.",
    tokenTaxBps: AURA_TOKEN_TAX_BPS,
    poolFeeBps: AURA_POOL_FEE_BPS,
    swapBurnBps: AURA_SWAP_BURN_BPS,
    chainId: AURA_CURVE_CHAIN.id,
    vanity: false,
    supply: AURA_MAX_SUPPLY,
    pool: {
      pairedToken: "USDC",
      pairedTokenAddress: BASE_USDC,
      positions: AURA_CURVE_ENGINE.clankerPositions,
      intendedPositions: AURA_CURVE_ENGINE.positions,
      bands: AURA_CURVE_ENGINE.bands,
      bookUsdc: String(AURA_LP_BOOK_USDC),
      startPriceUsd: AURA_LP_START_PRICE_USD,
      flatStart: {
        nearAura: AURA_LP_NEAR_AURA,
        nearPriceUsd: AURA_LP_NEAR_PRICE_USD,
        dripAura: AURA_LP_DRIP_AURA,
        dripPriceUsd: AURA_LP_DRIP_PRICE_USD,
        farAura: AURA_LP_FAR_AURA,
        farPriceUsd: AURA_LP_FAR_PRICE_USD,
      },
    },
    fees: {
      preset: AURA_CURVE_ENGINE.feePreset,
      minBps: AURA_CURVE_ENGINE.feeMinBps,
      maxBps: AURA_CURVE_ENGINE.feeMaxBps,
    },
    sniperFees: {
      startingFee: AURA_CURVE_ENGINE.sniperStartingFee,
      endingFee: AURA_CURVE_ENGINE.sniperEndingFee,
      secondsToDecay: AURA_CURVE_ENGINE.sniperSecondsToDecay,
    },
    rewards,
    airdrop: ["pAURA redeem +11%", "Hood 7,777 claim"],
    context: AURA_T0_CLANKER_CONTEXT,
    signingNote:
      "Platform TGE wraps pre-deployed AuraToken.sol. This spec configures the pool / lock / rewards only. Do not CREATE2 a second AURA. tokenAdmin is the new launch treasury. Announce 48h before any deploy.",
    ...(input.devBuyUsdc === ""
      ? {}
      : {
          devBuy: {
            usdcAmount: input.devBuyUsdc ?? String(AURA_DEV_BUY_USDC),
            recipient: input.tokenAdmin,
          },
        }),
    secondPairLater: {
      quote: "WETH",
      quoteAddress: BASE_WETH,
      note: "Same AURA. Extra pool after the USDC book is live. Not a new CA.",
    },
  };
}
