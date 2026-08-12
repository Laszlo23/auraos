/**
 * Client-safe Yield Autopilot defaults/types.
 * Keep server protocol imports out of this module so createServerFn RPCs
 * can be imported from client components.
 */

export type YieldAutopilotConfig = {
  /** Park idle USDC in lending when Quant has no open trade. */
  idleRouter: boolean;
  /** Stress IL and auto-close aggressive LP paper books past budget. */
  ilThermostat: boolean;
  /** Max simulated IL % before exit recommendation / auto-close. */
  ilBudgetPct: number;
  /** Epoch Hunter: surface vote deadline + predictive edge picks. */
  epochHunter: boolean;
  /** Compound Cascade: log harvest→restake paper events. */
  compoundCascade: boolean;
  /** Live: claim gauge AERO → USDC → optional Aave (founder opt-in). */
  autoCompoundLive: boolean;
  /** Downgrade risk tier if unrealized paper PnL is deeply negative. */
  riskAutopilot: boolean;
  /** Target share of yield budget reserved for Quant velocity (0–50). */
  quantReservePct: number;
  /** Auto-allocate idle park when armed (paper always; live only if catalog liveReady). */
  autoParkIdle: boolean;
  /** Preferred idle park catalog id. */
  idleCatalogId: string;
};

export const DEFAULT_AUTOPILOT: YieldAutopilotConfig = {
  idleRouter: true,
  ilThermostat: true,
  ilBudgetPct: 8,
  epochHunter: true,
  compoundCascade: true,
  autoCompoundLive: false,
  riskAutopilot: true,
  quantReservePct: 25,
  autoParkIdle: false,
  idleCatalogId: "base_aave_usdc",
};

export function mergeYieldAutopilot(
  raw: YieldAutopilotConfig | null | undefined,
): YieldAutopilotConfig {
  return { ...DEFAULT_AUTOPILOT, ...(raw ?? {}) };
}
