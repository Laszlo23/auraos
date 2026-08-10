import {
  SITE_URL,
  TOKEN_LAUNCH_AT,
  TOKEN_LAUNCH_DISPLAY,
  TOKEN_LAUNCH_MS,
} from "@/lib/site";

/** Hard cap on founding company seats (product truth). */
export const FOUNDING_SEATS_TOTAL = 1000;

/**
 * Wave 1 private-access marketing window.
 * Invite waves fill before fair launch — when the clock hits zero, Wave 1 closes.
 */
export const WAVE1_LABEL = "Wave 1 · private access";
export const WAVE1_INVITE_CAP = 250;
export const WAVE1_CLOSES_AT = TOKEN_LAUNCH_AT;
export const WAVE1_CLOSES_MS = TOKEN_LAUNCH_MS;
export const WAVE1_CLOSES_DISPLAY = TOKEN_LAUNCH_DISPLAY;

export const PROOF_SHARE_TEXT =
  "Aura OS proof: every finished task has a timestamp + written result. Agents keep dated memory. Wave 1 private access is capped — join the waitlist before it closes.";

export const PROOF_PAGE_URL = `${SITE_URL}/proof`;

export function wave1RemainingMs(now = Date.now()): number {
  return Math.max(0, WAVE1_CLOSES_MS - now);
}

export function wave1Closed(now = Date.now()): boolean {
  return now >= WAVE1_CLOSES_MS;
}

/** Estimate Wave 1 invite pressure from founding seats taken (capped at WAVE1_INVITE_CAP). */
export function wave1TakenFromSeats(seatsTaken: number): number {
  return Math.min(WAVE1_INVITE_CAP, Math.max(0, Math.floor(seatsTaken)));
}
