/**
 * Card-pack LP rail SSOT — net Stripe proceeds → official Uni v4 AURA/USDC book.
 * Packs stay priced in USD. There is no Stripe-implied token price.
 * Never invent a CA. Worker stays dark until publish + pool id exist.
 */

export const AURA_BUY_LP_STATUSES = ["reserved", "usdc_onchain", "swapped", "sent"] as const;
export type AuraBuyLpStatus = (typeof AURA_BUY_LP_STATUSES)[number];

export const USDC_DECIMALS = 6;
export const AURA_BUY_SLIPPAGE_BPS_DEFAULT = 200;
export const AURA_BUY_SLIPPAGE_BPS_MAX = 500;
/** Stripe's typical US card take when the balance_transaction is not expanded yet. */
export const STRIPE_CARD_FEE_BPS = 290;
export const STRIPE_CARD_FEE_FLAT_CENTS = 30;

export function isAuraBuyLpStatus(value: string | null | undefined): value is AuraBuyLpStatus {
  return AURA_BUY_LP_STATUSES.includes(value as AuraBuyLpStatus);
}

export function assertAuraBuyLpStatus(value: string): AuraBuyLpStatus {
  if (!isAuraBuyLpStatus(value)) {
    throw new Error(`Unknown AURA buy LP status: ${value}`);
  }
  return value;
}

export function stripeCardFeeCentsEstimate(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  return Math.round((amountCents * STRIPE_CARD_FEE_BPS) / 10_000) + STRIPE_CARD_FEE_FLAT_CENTS;
}

export function stripeNetCents(amountCents: number, feeCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  const fee = Number.isFinite(feeCents) && feeCents > 0 ? Math.min(feeCents, amountCents) : 0;
  return Math.max(0, Math.round(amountCents) - Math.round(fee));
}

export function centsToUsd(cents: number): number {
  return Math.round(cents) / 100;
}

/** USDC 6-decimal units from net USD. 100% of net after Stripe fees. */
export function usdcUnitsFromNetUsd(netUsd: number): bigint {
  if (!Number.isFinite(netUsd) || netUsd <= 0) return 0n;
  return BigInt(Math.round(netUsd * 10 ** USDC_DECIMALS));
}

export function usdcUnitsFromNetCents(netCents: number): bigint {
  return usdcUnitsFromNetUsd(centsToUsd(netCents));
}

export function applySlippageBps(amountOut: bigint, slippageBps: number): bigint {
  const bps = Number.isFinite(slippageBps)
    ? Math.round(slippageBps)
    : AURA_BUY_SLIPPAGE_BPS_DEFAULT;
  const clamped = Math.min(AURA_BUY_SLIPPAGE_BPS_MAX, Math.max(0, bps));
  if (amountOut <= 0n) return 0n;
  return (amountOut * BigInt(10_000 - clamped)) / 10_000n;
}

export type AuraBuyFulfillGate = {
  caPublished: boolean;
  poolId: string | null;
  hook: string | null;
  fundsAvailable: boolean;
  floatCovers: boolean;
};

export type AuraBuyFulfillDecision =
  | { ok: false; reason: "pre_t0" | "missing_pool" | "missing_hook" | "funds_held" }
  | { ok: true; reason: "live_book" };

export function auraBuyFulfillDecision(gate: AuraBuyFulfillGate): AuraBuyFulfillDecision {
  if (!gate.caPublished) return { ok: false, reason: "pre_t0" };
  if (!gate.poolId || !/^0x[a-fA-F0-9]{64}$/.test(gate.poolId)) {
    return { ok: false, reason: "missing_pool" };
  }
  if (!gate.hook || !/^0x[a-fA-F0-9]{40}$/.test(gate.hook)) {
    return { ok: false, reason: "missing_hook" };
  }
  const funded = gate.floatCovers || gate.fundsAvailable;
  if (!funded) return { ok: false, reason: "funds_held" };
  return { ok: true, reason: "live_book" };
}

export function nextAuraBuyLpStatus(
  current: AuraBuyLpStatus,
  event: "float" | "swapped" | "sent",
): AuraBuyLpStatus {
  switch (current) {
    case "reserved":
      return event === "float" ? "usdc_onchain" : current;
    case "usdc_onchain":
      return event === "swapped" ? "swapped" : current;
    case "swapped":
      return event === "sent" ? "sent" : current;
    case "sent":
      return "sent";
    default: {
      const _exhaustive: never = current;
      return _exhaustive;
    }
  }
}

export type AuraBuyPublicReceipt = {
  id: string;
  pack: string;
  netUsd: number;
  wallet: string;
  usdcTxHash: string | null;
  swapTxHash: string | null;
  txHash: string | null;
  createdAt: string;
};

export function toAuraBuyPublicReceipt(row: {
  id: string;
  pack: string;
  net_usd?: number | null;
  amount_usd: number;
  wallet: string;
  usdc_tx_hash?: string | null;
  swap_tx_hash?: string | null;
  tx_hash?: string | null;
  created_at: string;
  lp_status?: string | null;
}): AuraBuyPublicReceipt | null {
  if (row.lp_status && row.lp_status !== "sent") return null;
  const net =
    typeof row.net_usd === "number" && Number.isFinite(row.net_usd) ? row.net_usd : row.amount_usd;
  return {
    id: row.id,
    pack: row.pack,
    netUsd: net,
    wallet: row.wallet,
    usdcTxHash: row.usdc_tx_hash ?? null,
    swapTxHash: row.swap_tx_hash ?? row.tx_hash ?? null,
    txHash: row.tx_hash ?? null,
    createdAt: row.created_at,
  };
}

export const AURA_BUY_LP_COPY = {
  rail: "After T-0, 100% of the pack net (after Stripe fees) becomes USDC on Base and buys on the live official Uniswap v4 AURA/USDC tick. Not a Stripe-implied token price. USDC stays in the locked book.",
  railDe:
    "Nach T-0 wird 100 % des Pack-Nets (nach Stripe-Gebühren) zu USDC auf Base und kauft zum Live-Tick des offiziellen Uniswap-v4-AURA/USDC-Buchs. Kein von Stripe implizierter Tokenpreis. USDC bleibt im gesperrten Buch.",
  receipts:
    "Public receipts: net USD, swap tx, buyer wallet. Same official book as the $6,000 seed.",
  receiptsDe:
    "Öffentliche Belege: Netto-USD, Swap-Tx, Käufer-Wallet. Dasselbe offizielle Buch wie der 6.000-$ Seed.",
} as const;
