import { SITE_URL, TOKEN_LAUNCH_AT, TOKEN_LAUNCH_DISPLAY, TOKEN_LAUNCH_MS } from "@/lib/site";

/** Hard cap on founding company seats (product truth — paid inventory). */
export const FOUNDING_SEATS_TOTAL = 1000;

/**
 * Founding-seat marketing window.
 * Scarcity UI uses founding seats remaining + this fair-launch clock — no fake invite ledger.
 */
export const WAVE1_LABEL = "Founding seats · open";
export const WAVE1_CLOSES_AT = TOKEN_LAUNCH_AT;
export const WAVE1_CLOSES_MS = TOKEN_LAUNCH_MS;
export const WAVE1_CLOSES_DISPLAY = TOKEN_LAUNCH_DISPLAY;

/** @deprecated Prefer FOUNDING_SEATS_TOTAL — kept for any leftover imports. */
export const WAVE1_INVITE_CAP = FOUNDING_SEATS_TOTAL;

export const PROOF_SHARE_TEXT =
  "Aura OS proof: every finished task has a timestamp + written result. Agents keep dated memory. Founding seats are capped at 1000 — numbers stay honest.";

export const PROOF_PAGE_URL = `${SITE_URL}/proof`;

export function wave1RemainingMs(now = Date.now()): number {
  return Math.max(0, WAVE1_CLOSES_MS - now);
}

export function wave1Closed(now = Date.now()): boolean {
  return now >= WAVE1_CLOSES_MS;
}

/** @deprecated Use founding seats taken directly. */
export function wave1TakenFromSeats(seatsTaken: number): number {
  return Math.min(FOUNDING_SEATS_TOTAL, Math.max(0, Math.floor(seatsTaken)));
}
