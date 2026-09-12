/** Suggested donation amounts (USD). Users pick on /donate; invoice is created server-side. */
export const DONATE_AMOUNTS_USD = [5, 10, 25, 50, 100, 250] as const;
export type DonateAmountUsd = (typeof DONATE_AMOUNTS_USD)[number];

export const DONATE_ORDER_PREFIX = "donate_";

export function isDonateOrderId(orderId: string | undefined | null): boolean {
  return Boolean(orderId && String(orderId).startsWith(DONATE_ORDER_PREFIX));
}

export function parseDonateAmountUsd(raw: unknown): DonateAmountUsd | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return (DONATE_AMOUNTS_USD as readonly number[]).includes(n)
    ? (n as DonateAmountUsd)
    : null;
}
