/** Size a desk idea under daily notional, strategy max, and founder risk %. */

export function sizeTradeNotional(opts: {
  requested: number;
  specMaxNotional: number;
  maxNotionalDay: number;
  spentToday: number;
  /** Founder max risk % of desk equity (0.1–5). */
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
  const riskBudget = equity * (Math.max(0.1, Math.min(5, opts.maxRiskPct)) / 100);
  const raw = Math.min(
    Math.max(0, opts.requested),
    opts.specMaxNotional,
    remaining,
    riskBudget > 0 ? Math.max(riskBudget, 5) : remaining,
  );
  // riskBudget can be tiny at 0.5% of small wallets — allow at least $5 if remaining allows
  if (raw < 5 && remaining >= 5 && riskBudget < 5) {
    return Math.min(5, remaining, opts.specMaxNotional, opts.requested || 5);
  }
  return Number(raw.toFixed(2));
}

export function unrealizedPnl(entry: number, mark: number, sizeUsdc: number): number {
  if (!entry || !mark || !sizeUsdc) return 0;
  return Number((sizeUsdc * ((mark - entry) / entry)).toFixed(4));
}
