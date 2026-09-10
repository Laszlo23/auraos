import {
  OS_YEAR_DISPLAY,
  OS_YEAR_DISPLAY_DE,
  OS_YEARLY_CENTS,
  OS_YEARLY_USD,
} from "@/lib/os-pricing";

/** Canonical Aura OS year price (also the Hood mint). Stripe must match cents. */
export const FOUNDING_SEAT_USD = OS_YEARLY_USD;
export const FOUNDING_SEAT_CENTS = OS_YEARLY_CENTS;
export const FOUNDING_SEAT_DISPLAY = "$299";
export const FOUNDING_SEAT_DISPLAY_DE = "299 $";
/** How we say the flagship OS price in public copy. */
export const FOUNDING_SEAT_PERIOD = OS_YEAR_DISPLAY;
export const FOUNDING_SEAT_PERIOD_DE = OS_YEAR_DISPLAY_DE;

/** Of each $299: 30% developer ops (servers, infra), 70% product / launch LP. */
export const PRICE_OPS_BPS = 3_000;
export const PRICE_REMAINDER_BPS = 7_000;
export const PRICE_OPS_CENTS = Math.round((FOUNDING_SEAT_CENTS * PRICE_OPS_BPS) / 10_000);
export const PRICE_REMAINDER_CENTS = FOUNDING_SEAT_CENTS - PRICE_OPS_CENTS;
export const PRICE_OPS_USD = PRICE_OPS_CENTS / 100;
export const PRICE_REMAINDER_USD = PRICE_REMAINDER_CENTS / 100;
export const PRICE_OPS_DISPLAY = `$${(PRICE_OPS_CENTS / 100).toFixed(2)}`;
export const PRICE_REMAINDER_DISPLAY = `$${(PRICE_REMAINDER_CENTS / 100).toFixed(2)}`;
export const PRICE_OPS_DISPLAY_DE = `${(PRICE_OPS_CENTS / 100).toFixed(2).replace(".", ",")} $`;
export const PRICE_REMAINDER_DISPLAY_DE = `${(PRICE_REMAINDER_CENTS / 100).toFixed(2).replace(".", ",")} $`;
