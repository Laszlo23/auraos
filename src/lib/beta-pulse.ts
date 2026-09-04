/**
 * Beta pulse — numbers + $12k prophecy (plan, not promise).
 * Used on Team Desk for honest activation + cash tracking.
 */

export type BetaPulseSnapshot = {
  signups7d: number;
  onboardComplete7d: number;
  firstMission7d: number;
  firstProof7d: number;
  squadJoin7d: number;
  scoutJoin7d: number;
  growthTaskDone7d: number;
  foundingSeatsTotal: number;
  localSeatsPaid: number;
  /** Estimated gross cash in USD cents from seats (founding $299 + local €99≈$108). */
  seatCashUsdCents: number;
  asOf: string;
};

export type ProphecyTier = {
  id: "base" | "stretch" | "moon";
  label: string;
  day30Usd: number;
  day60Usd: number;
  day90Usd: number;
  note: string;
};

/** 90-day $12k mix prophecy — labeled plan, not a promise. */
export const BETA_12K_PROPHECIES: ProphecyTier[] = [
  {
    id: "base",
    label: "Base",
    day30Usd: 2_500,
    day60Usd: 6_000,
    day90Usd: 12_000,
    note: "40 local seats · 40 Reputation ×2 mo · 30 boosts · 5 founding",
  },
  {
    id: "stretch",
    label: "Stretch",
    day30Usd: 4_000,
    day60Usd: 9_000,
    day90Usd: 18_000,
    note: "Faster Lokal closes + 15 founding seats",
  },
  {
    id: "moon",
    label: "Moon",
    day30Usd: 6_000,
    day60Usd: 14_000,
    day90Usd: 28_000,
    note: "Only if Spaces + Scout invites convert weekly",
  },
];

export const BETA_TARGET_USD = 12_000;

export function prophecyProgressPct(actualUsd: number, day90Target = BETA_TARGET_USD): number {
  if (day90Target <= 0) return 0;
  return Math.min(100, Math.round((actualUsd / day90Target) * 100));
}

/** Rough EUR→USD for desk display (not FX-accurate). */
export const LOCAL_SEAT_USD_CENTS_APPROX = 10_800; // €99 ≈ $108
export const FOUNDING_SEAT_USD_CENTS = 29_900;
