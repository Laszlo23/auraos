/**
 * Quant Trading Desk — Base spot risk policy.
 *
 * Competitive context: comparable spot / algo desks commonly keep per-idea
 * risk in the ~1–3% of equity band. Aura hard-caps single-trade USDC notional
 * at 2% of wallet equity (mid-benchmark) and will not let founders configure
 * risk above the 3% upper band.
 */

/** Hard ceiling: per-idea notional ≤ this % of wallet USDC equity (Base). */
export const SPOT_RISK_HARD_CAP_PCT = 2;

/** Upper bound founders may save on `max_risk_pct` (rival band max). */
export const SPOT_RISK_FOUNDER_MAX_PCT = 3;

/** Lower bound founders may save on `max_risk_pct`. */
export const SPOT_RISK_FOUNDER_MIN_PCT = 0.1;

/** Default when company has no override. */
export const SPOT_RISK_DEFAULT_PCT = 0.5;

export const SPOT_RISK_POLICY_LABEL =
  "Base hard cap: 2% of wallet USDC per idea (industry spot band 1–3%).";

/** Clamp a founder-configured max_risk_pct into the allowed band. */
export function clampFounderRiskPct(pct: number): number {
  const n = Number(pct);
  if (!Number.isFinite(n)) return SPOT_RISK_DEFAULT_PCT;
  return Math.min(SPOT_RISK_FOUNDER_MAX_PCT, Math.max(SPOT_RISK_FOUNDER_MIN_PCT, n));
}

/**
 * Absolute USDC ceiling for one idea from equity.
 * Always uses the platform hard % — not the founder's (possibly lower) setting.
 */
export function hardSpotNotionalCapUsdc(equityUsdc: number): number {
  const equity = Math.max(Number(equityUsdc) || 0, 0);
  return Number(((equity * SPOT_RISK_HARD_CAP_PCT) / 100).toFixed(2));
}

/** Effective risk % for budgeting: founder setting, never above hard cap %. */
export function effectiveSpotRiskPct(founderMaxRiskPct: number): number {
  return Math.min(SPOT_RISK_HARD_CAP_PCT, clampFounderRiskPct(founderMaxRiskPct));
}
