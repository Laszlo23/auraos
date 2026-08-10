/** Size a desk idea under daily notional, strategy max, founder risk %, and Base hard USDC cap. */

import {
  effectiveSpotRiskPct,
  hardSpotNotionalCapUsdc,
  SPOT_RISK_HARD_CAP_PCT,
} from "@/lib/trading/risk-policy";

export function sizeTradeNotional(opts: {
  requested: number;
  specMaxNotional: number;
  maxNotionalDay: number;
  spentToday: number;
  /** Founder max risk % of desk equity (clamped to 0.1–3; hard-capped at 2% USDC). */
  maxRiskPct: number;
  /** USDC equity proxy — falls back to daily notional when unknown. */
  equityUsdc: number;
  /** Extra % daily notional from Quant boost / holder tiers. */
  notionalBoostPct?: number;
}): number {
  const dayCap =
    Number(opts.maxNotionalDay) * (1 + Math.max(0, opts.notionalBoostPct ?? 0) / 100);
  const remaining = Math.max(0, dayCap - opts.spentToday);
  const equity = Math.max(opts.equityUsdc, 10);
  const riskPct = effectiveSpotRiskPct(opts.maxRiskPct);
  const riskBudget = equity * (riskPct / 100);
  /** Platform hard USDC ceiling — cannot be raised by founder % or holder boosts. */
  const hardUsdc = hardSpotNotionalCapUsdc(equity);

  const raw = Math.min(
    Math.max(0, opts.requested),
    opts.specMaxNotional,
    remaining,
    hardUsdc,
    riskBudget > 0 ? riskBudget : remaining,
  );

  // Tiny wallets: allow a small floor only if it still respects the hard USDC cap.
  const minFloor = Math.min(5, hardUsdc);
  if (raw < minFloor && remaining >= minFloor && riskBudget < minFloor && hardUsdc >= minFloor) {
    return Number(
      Math.min(minFloor, remaining, opts.specMaxNotional, hardUsdc, opts.requested || minFloor).toFixed(
        2,
      ),
    );
  }

  return Number(raw.toFixed(2));
}

export function unrealizedPnl(entry: number, mark: number, sizeUsdc: number): number {
  if (!entry || !mark || !sizeUsdc) return 0;
  return Number((sizeUsdc * ((mark - entry) / entry)).toFixed(4));
}

export { SPOT_RISK_HARD_CAP_PCT };
