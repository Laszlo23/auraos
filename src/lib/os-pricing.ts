/**
 * Public Aura OS price ladder — one story everywhere.
 * Hood NFT mint stays a separate one-time $299 (see founding-price / hood).
 */

export const OS_MONTHLY_USD = 29;
export const OS_MONTHLY_CENTS = 2_900;
export const OS_YEARLY_USD = 299;
export const OS_YEARLY_CENTS = 29_900;

export type OsCheckoutPlan = "month" | "year";

export function isOsCheckoutPlan(v: unknown): v is OsCheckoutPlan {
  return v === "month" || v === "year";
}

export function osPlanAmountCents(plan: OsCheckoutPlan): number {
  return plan === "month" ? OS_MONTHLY_CENTS : OS_YEARLY_CENTS;
}

export function osPlanInterval(plan: OsCheckoutPlan): "month" | "year" {
  return plan === "month" ? "month" : "year";
}

export function stripePriceEnvForOsPlan(plan: OsCheckoutPlan): string | undefined {
  const key = plan === "month" ? "STRIPE_PRICE_OS_MONTH" : "STRIPE_PRICE_OS_YEAR";
  return process.env[key]?.trim() || undefined;
}

export function stripePaymentLinkEnvForOsPlan(plan: OsCheckoutPlan): string | undefined {
  const key = plan === "month" ? "STRIPE_PAYMENT_LINK_OS_MONTH" : "STRIPE_PAYMENT_LINK_OS_YEAR";
  return process.env[key]?.trim() || undefined;
}

export const OS_PRICE = {
  try: {
    id: "try" as const,
    href: "/try",
    usd: 0,
    en: { name: "Try Aura", price: "Free", period: "", cta: "Walk the desk" },
    de: { name: "Aura testen", price: "Gratis", period: "", cta: "Desk ansehen" },
  },
  month: {
    id: "month" as const,
    href: "/access?plan=month",
    usd: OS_MONTHLY_USD,
    en: { name: "Aura OS · Monthly", price: "$29", period: "/ month", cta: "Start monthly" },
    de: { name: "Aura OS · Monat", price: "29 $", period: "/ Monat", cta: "Monatlich starten" },
  },
  year: {
    id: "year" as const,
    href: "/access?plan=year",
    usd: OS_YEARLY_USD,
    recommended: true,
    en: {
      name: "Aura OS · Year",
      price: "$299",
      period: "/ year",
      cta: "Start the year",
      note: "Best value — about two months free vs monthly.",
    },
    de: {
      name: "Aura OS · Jahr",
      price: "299 $",
      period: "/ Jahr",
      cta: "Jahr starten",
      note: "Bester Deal — rund zwei Monate gratis gegenüber Monat.",
    },
  },
  local: {
    id: "local" as const,
    href: "/lokal",
    eur: 49,
    en: { name: "Aura Local", price: "€49", period: "/ month", cta: "For Wien shops" },
    de: { name: "Aura Local", price: "49 €", period: "/ Monat", cta: "Für Wiener Betriebe" },
  },
} as const;

export const OS_YEAR_DISPLAY = "$299 / year";
export const OS_YEAR_DISPLAY_DE = "299 $ / Jahr";
export const OS_MONTH_DISPLAY = "$29 / month";
export const OS_MONTH_DISPLAY_DE = "29 $ / Monat";

export function osCopy(locale: string, plan: keyof typeof OS_PRICE) {
  return locale === "de" ? OS_PRICE[plan].de : OS_PRICE[plan].en;
}
