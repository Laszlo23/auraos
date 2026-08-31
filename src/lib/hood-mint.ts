/** Public Hood mint open. Change this one ISO string to move the drop. */
export const HOOD_MINT_OPENS_AT = "2026-09-15T16:00:00.000Z";

export type HoodMintRemaining = {
  open: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function hoodMintOpensAt(): Date {
  return new Date(HOOD_MINT_OPENS_AT);
}

export function hoodMintIsOpen(now = Date.now()): boolean {
  return now >= hoodMintOpensAt().getTime();
}

export function hoodMintRemaining(now = Date.now()): HoodMintRemaining {
  const totalMs = Math.max(0, hoodMintOpensAt().getTime() - now);
  return {
    open: totalMs === 0,
    totalMs,
    days: Math.floor(totalMs / 86_400_000),
    hours: Math.floor((totalMs % 86_400_000) / 3_600_000),
    minutes: Math.floor((totalMs % 3_600_000) / 60_000),
    seconds: Math.floor((totalMs % 60_000) / 1000),
  };
}

export function formatHoodMintOpens(locale: "en" | "de"): string {
  const d = hoodMintOpensAt();
  const fmt = new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
  return fmt.format(d);
}
