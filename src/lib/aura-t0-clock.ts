/**
 * Public AURA T-0 clock — single source of truth.
 * Sunday 13 Sep 2026, 11:11:00 Europe/Vienna (CEST, UTC+2) = 09:11 UTC.
 * CA stays unpublished until this instant. Never invent one.
 */

export const TOKEN_LAUNCH_AT_ISO = "2026-09-13T11:11:00+02:00";
/** 48h covenant gate: announce must be public by this instant. */
export const TOKEN_LAUNCH_ANNOUNCE_BY_ISO = "2026-09-11T11:11:00+02:00";
export const TOKEN_LAUNCH_NOTICE_HOURS = 48;
export const TOKEN_LAUNCH_LABEL = "Fair launch";
export const TOKEN_LAUNCH_DISPLAY = "Sunday 13 Sep 2026, 11:11 Europe/Vienna";
export const TOKEN_LAUNCH_DISPLAY_DE = "Sonntag, 13. Sep 2026, 11:11 Wien";
export const TOKEN_LAUNCH_TZ = "Europe/Vienna";

export type TokenLaunchRemain = {
  live: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function tokenLaunchAtMs(): number {
  return Date.parse(TOKEN_LAUNCH_AT_ISO);
}

export function tokenLaunchAnnounceByMs(): number {
  return Date.parse(TOKEN_LAUNCH_ANNOUNCE_BY_ISO);
}

export function tokenLaunchIsLive(nowMs: number = Date.now()): boolean {
  return nowMs >= tokenLaunchAtMs();
}

export function tokenLaunchRemain(nowMs: number = Date.now()): TokenLaunchRemain {
  const totalMs = Math.max(0, tokenLaunchAtMs() - nowMs);
  const days = Math.floor(totalMs / 86_400_000);
  const hours = Math.floor((totalMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  return {
    live: totalMs === 0 && nowMs >= tokenLaunchAtMs(),
    totalMs,
    days,
    hours,
    minutes,
    seconds,
  };
}

export function padLaunchUnit(n: number): string {
  return String(n).padStart(2, "0");
}

/** Full 48h post — docs, pin, LinkedIn. No CA. */
export const T0_ANNOUNCE_POST = `Fair launch T-0: Sunday 13 Sep 2026, 11:11 Europe/Vienna.
Token: AURA on Base. Official book: locked Uniswap v4 AURA/USDC. Seed $1,111 USDC. Starting book $6,000 USDC.
CA will be published at T-0 only on aibusiness.fun and @bihary41418 — never by DM.
Covenant: https://aibusiness.fun/trust`;

/** X-length blast. Keep ≤280. No CA. */
export const T0_ANNOUNCE_POST_X = `Fair launch T-0: Sun 13 Sep 2026, 11:11 Vienna.

AURA on Base. Locked Uni v4 AURA/USDC.
Seed $1,111 USDC. Book $6,000 USDC.

CA at T-0 only on aibusiness.fun + @bihary41418 — never by DM.
https://aibusiness.fun/trust`;

/** Farcaster-length blast. Keep ≤320. No CA. */
export const T0_ANNOUNCE_POST_FC = `Fair launch T-0: Sunday 13 Sep 2026, 11:11 Vienna.

AURA on Base. Locked Uni v4 AURA/USDC. Seed $1,111 USDC. Book $6,000 USDC.

CA at T-0 only on aibusiness.fun + @bihary41418 — never by DM.
https://aibusiness.fun/trust`;
