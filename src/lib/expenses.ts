/** DE/AT-friendly expense categories for Ledger bookkeeper assist. */

export const EXPENSE_CATEGORIES = [
  { id: "office", label: "Office / supplies", labelDe: "Bürobedarf" },
  { id: "software", label: "Software / SaaS", labelDe: "Software / SaaS" },
  { id: "travel", label: "Travel / transport", labelDe: "Reise / Fahrt" },
  { id: "marketing", label: "Marketing / ads", labelDe: "Marketing / Werbung" },
  {
    id: "professional_services",
    label: "Professional services",
    labelDe: "Fremdleistungen / Beratung",
  },
  { id: "equipment", label: "Equipment / assets", labelDe: "Technik / Anlagen" },
  { id: "rent_utilities", label: "Rent / utilities", labelDe: "Miete / Nebenkosten" },
  { id: "meals", label: "Meals / hospitality", labelDe: "Bewirtung / Verpflegung" },
  { id: "telecom", label: "Phone / internet", labelDe: "Telefon / Internet" },
  { id: "banking_fees", label: "Bank / payment fees", labelDe: "Bank- / Zahlungsgebühren" },
  { id: "taxes_fees", label: "Taxes & gov fees", labelDe: "Steuern / Abgaben" },
  { id: "inventory_cogs", label: "Inventory / COGS", labelDe: "Waren / Herstellung" },
  { id: "personal", label: "Personal (not business)", labelDe: "Privat" },
  { id: "uncategorized", label: "Uncategorized", labelDe: "Unklar" },
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]["id"];

export const TAX_HINTS = [
  { id: "likely_business", label: "Likely business expense", labelDe: "Vermutlich Betriebsausgabe" },
  { id: "input_vat_possible", label: "Input VAT possible", labelDe: "Vorsteuer möglich" },
  { id: "personal", label: "Likely personal", labelDe: "Vermutlich privat" },
  { id: "mixed", label: "Mixed / split needed", labelDe: "Gemischt / aufteilen" },
  { id: "unknown", label: "Needs review", labelDe: "Prüfen" },
] as const;

export type TaxHintId = (typeof TAX_HINTS)[number]["id"];

export function expenseCategoryLabel(id: string, locale: "en" | "de" = "en"): string {
  const row = EXPENSE_CATEGORIES.find((c) => c.id === id);
  if (!row) return id;
  return locale === "de" ? row.labelDe : row.label;
}

export function taxHintLabel(id: string, locale: "en" | "de" = "en"): string {
  const row = TAX_HINTS.find((c) => c.id === id);
  if (!row) return id;
  return locale === "de" ? row.labelDe : row.label;
}

export const TAX_ASSIST_DISCLAIMER =
  "Aura Ledger assists with document intake and preparation only. This is not tax, legal, or accounting advice. Confirm every item with a licensed Steuerberater / CPA before filing.";
