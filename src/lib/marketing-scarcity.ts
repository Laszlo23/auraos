import { SITE_URL, TOKEN_LAUNCH_DISPLAY, TOKEN_LAUNCH_TRUST } from "@/lib/site";

/** Hard cap on founding company seats (product truth — paid inventory). */
export const FOUNDING_SEATS_TOTAL = 1000;

/**
 * Founding-seat marketing window.
 * Scarcity UI uses founding seats remaining + fair-launch announce policy — no fake invite ledger, no dated clock.
 */
export const WAVE1_LABEL = "Wave 1 · founding seats";
/** Display-only: fair launch is announced 48h ahead (not a seat-close clock). */
export const WAVE1_CLOSES_DISPLAY = TOKEN_LAUNCH_DISPLAY;
export const WAVE1_LAUNCH_TRUST = TOKEN_LAUNCH_TRUST;

export const PROOF_SHARE_TEXT =
  "Aura OS proof: every finished task has a timestamp + written result. Agents keep dated memory. Founding seats are capped at 1000 — numbers stay honest.";

export const PROOF_PAGE_URL = `${SITE_URL}/proof`;

/** Wave stays open until seats sell out — no calendar close. */
export function wave1Closed(_now = Date.now()): boolean {
  return false;
}

export function wave1RemainingMs(_now = Date.now()): number {
  return Number.POSITIVE_INFINITY;
}
