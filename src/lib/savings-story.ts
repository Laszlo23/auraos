/**
 * Plain-language time & money framing for landing / onboarding.
 * Illustrative owner-time estimates — not live proof or guaranteed results.
 */

export const SAVINGS = {
  /** Typical owner admin time Aura aims to queue for approval instead of you grinding. */
  hoursPerDay: 2,
  /** Conservative owner hourly value (EUR) for “what that time is worth”. */
  hourlyValueEur: 40,
  get moneyPerDayEur() {
    return this.hoursPerDay * this.hourlyValueEur;
  },
  get moneyPerMonthEur() {
    return this.moneyPerDayEur * 20;
  },
  /** Local product monthly price — for “vs hiring help” contrast. */
  localPlanEur: 49,
} as const;

export const SAVINGS_DISCLAIMER = {
  en: "Estimates from reclaiming owner admin time (follow-up, drafts, research). Not a guarantee — your day, your industry, your yes.",
  de: "Schätzung aus zurückgewonnener Owner-Zeit (Follow-up, Entwürfe, Recherche). Keine Garantie — dein Tag, deine Branche, dein Ja.",
} as const;
