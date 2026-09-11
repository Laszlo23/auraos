/**
 * Honest FlatStart book estimate — not a live AMM, not a promised fill.
 * Models the near band as a linear price walk from $0.001 → $0.0035 over 18M AURA.
 */

import {
  AURA_LP_NEAR_AURA,
  AURA_LP_NEAR_PRICE_USD,
  AURA_LP_START_PRICE_USD,
} from "@/lib/aura-curve";

export const AURA_BOOK_QUOTE_NOTE =
  "Estimate on the published FlatStart near band. Not a live quote. Not a promised fill.";

export type AuraBookQuote = {
  usdcIn: number;
  auraOut: number;
  startPriceUsd: number;
  endPriceUsd: number;
  priceMovePct: number;
  note: string;
};

function nearBandCost(auraOut: number): number {
  const q = Math.min(Math.max(auraOut, 0), AURA_LP_NEAR_AURA);
  const p0 = AURA_LP_NEAR_PRICE_USD.min;
  const span = AURA_LP_NEAR_PRICE_USD.max - AURA_LP_NEAR_PRICE_USD.min;
  return p0 * q + (span * q * q) / (2 * AURA_LP_NEAR_AURA);
}

function priceAfter(auraOut: number): number {
  const q = Math.min(Math.max(auraOut, 0), AURA_LP_NEAR_AURA);
  const span = AURA_LP_NEAR_PRICE_USD.max - AURA_LP_NEAR_PRICE_USD.min;
  return AURA_LP_NEAR_PRICE_USD.min + (span * q) / AURA_LP_NEAR_AURA;
}

/** Tokens out for a USDC buy on the near band (quadratic solve). */
export function estimateAuraBookBuy(usdcIn: number): AuraBookQuote {
  const spend = Math.max(0, usdcIn);
  const p0 = AURA_LP_NEAR_PRICE_USD.min;
  const span = AURA_LP_NEAR_PRICE_USD.max - AURA_LP_NEAR_PRICE_USD.min;
  const a = span / (2 * AURA_LP_NEAR_AURA);
  const disc = p0 * p0 + 4 * a * spend;
  const raw = a > 0 ? (-p0 + Math.sqrt(disc)) / (2 * a) : spend / p0;
  const auraOut = Math.min(raw, AURA_LP_NEAR_AURA);
  const endPriceUsd = priceAfter(auraOut);
  return {
    usdcIn: spend,
    auraOut,
    startPriceUsd: AURA_LP_START_PRICE_USD,
    endPriceUsd,
    priceMovePct: ((endPriceUsd - AURA_LP_START_PRICE_USD) / AURA_LP_START_PRICE_USD) * 100,
    note: AURA_BOOK_QUOTE_NOTE,
  };
}

export function estimateAuraBookBuys(usdcs: readonly number[]): AuraBookQuote[] {
  return usdcs.map((usdc) => estimateAuraBookBuy(usdc));
}

export function assertNearBandCost(auraOut: number, usdc: number, eps = 1e-4): boolean {
  return Math.abs(nearBandCost(auraOut) - usdc) <= eps * Math.max(1, usdc);
}
