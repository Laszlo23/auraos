/** Canonical founding-seat price. Stripe Price ID must match this amount. */
export const FOUNDING_SEAT_USD = 299;
export const FOUNDING_SEAT_CENTS = 29_900;
export const FOUNDING_SEAT_DISPLAY = "$299";
export const FOUNDING_SEAT_DISPLAY_DE = "299 $";

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
