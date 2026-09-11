/**
 * Official-pair quotes for the Aura swap desk. Not a DEX.
 * Quote is public. Settle happens in the wallet against the published Base pool.
 */

import {
  AURA_CURVE_COPY,
  AURA_OFFICIAL_PAIRS,
  AURA_REWARD_SPLIT_BPS,
  AURA_SWAP_BURN_BPS,
  type AuraOfficialPairId,
  auraPairLive,
  formatBps,
} from "@/lib/aura-curve";
import { auraTokenAddress } from "@/lib/aura-self-launch";

export const AURA_SWAP_ASSETS = ["AURA", "USDC", "ETH", "WETH"] as const;
export type AuraSwapAsset = (typeof AURA_SWAP_ASSETS)[number];

export type AuraSwapQuoteRequest = {
  from: AuraSwapAsset;
  to: AuraSwapAsset;
  amount: string;
};

export type AuraSwapQuote = {
  live: boolean;
  from: AuraSwapAsset;
  to: AuraSwapAsset;
  amountIn: string;
  amountOut: string | null;
  pairId: AuraOfficialPairId | null;
  pairLabel: string | null;
  swapBurnBps: number;
  swapBurnLabel: string;
  feeNote: string;
  settleNote: string;
  reason: string | null;
};

function pairFor(from: AuraSwapAsset, to: AuraSwapAsset): AuraOfficialPairId | null {
  const set = new Set([from, to]);
  if (set.has("AURA") && set.has("USDC")) return "aura-usdc";
  if (set.has("AURA") && (set.has("WETH") || set.has("ETH"))) return "aura-weth";
  return null;
}

export function officialPairForRoute(from: AuraSwapAsset, to: AuraSwapAsset) {
  const id = pairFor(from, to);
  if (!id) return null;
  return AURA_OFFICIAL_PAIRS.find((p) => p.id === id) ?? null;
}

export function quoteAuraOfficialSwap(input: AuraSwapQuoteRequest): AuraSwapQuote {
  const from = input.from;
  const to = input.to;
  const amountIn = input.amount.trim() || "0";
  const pair = officialPairForRoute(from, to);
  const token = auraTokenAddress();

  if (from === to) {
    return {
      live: false,
      from,
      to,
      amountIn,
      amountOut: null,
      pairId: null,
      pairLabel: null,
      swapBurnBps: AURA_SWAP_BURN_BPS,
      swapBurnLabel: formatBps(AURA_SWAP_BURN_BPS),
      feeNote: AURA_CURVE_COPY.noApy,
      settleNote: AURA_CURVE_COPY.softwareNotEquity,
      reason: "Pick two different assets on an official pair.",
    };
  }

  if (!pair) {
    return {
      live: false,
      from,
      to,
      amountIn,
      amountOut: null,
      pairId: null,
      pairLabel: null,
      swapBurnBps: AURA_SWAP_BURN_BPS,
      swapBurnLabel: formatBps(AURA_SWAP_BURN_BPS),
      feeNote: AURA_CURVE_COPY.noApy,
      settleNote: AURA_CURVE_COPY.softwareNotEquity,
      reason: "Official desk routes: AURA↔USDC now, AURA↔ETH/WETH when the second pool is published. Not a DEX.",
    };
  }

  const live = Boolean(token && auraPairLive(pair.id));
  return {
    live,
    from,
    to,
    amountIn,
    amountOut: live ? null : null,
    pairId: pair.id,
    pairLabel: pair.label,
    swapBurnBps: AURA_SWAP_BURN_BPS,
    swapBurnLabel: formatBps(AURA_SWAP_BURN_BPS),
    feeNote: `Pool fees Dynamic3 (1–3%). LP stakers ${formatBps(AURA_REWARD_SPLIT_BPS.lpStakers)} · ${AURA_CURVE_COPY.noApy}`,
    settleNote: AURA_CURVE_COPY.softwareNotEquity,
    reason: live
      ? null
      : pair.officialBook
        ? "T-0 book is not live. CA and AURA/USDC pool publish on /token after the 48h announce."
        : "AURA/WETH is the Phase 3 pair — same token, extra pool. Not published yet.",
  };
}

export function auraSwapDeskStatus() {
  const token = auraTokenAddress();
  return {
    token,
    pairs: AURA_OFFICIAL_PAIRS.map((p) => ({
      id: p.id,
      label: p.label,
      officialBook: p.officialBook,
      phase: p.phase,
      live: Boolean(token && auraPairLive(p.id)),
    })),
    swapBurnBps: AURA_SWAP_BURN_BPS,
    rewardSplit: AURA_REWARD_SPLIT_BPS,
  };
}
