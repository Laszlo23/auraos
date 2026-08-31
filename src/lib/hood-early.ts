/**
 * Early supporter Hood wave — password-gated, first 333, before the public drop.
 * Password / hash stay server-only (never VITE_*).
 */

export const HOOD_EARLY_SUPPORTER_CAP = 333;
export const HOOD_EARLY_PERMIT_TTL_SEC = 2 * 60 * 60;
export const HOOD_EARLY_STORAGE_KEY = "aura_hood_early_permit";

export const HOOD_EARLY_COPY = {
  kicker: "Early supporters · 333",
  kickerDe: "Early Supporters · 333",
  title: "Password mint for the first 333.",
  titleDe: "Passwort-Mint für die ersten 333.",
  lead: "Before the public drop, early supporters can mint with an invite password. Cap 333. Same $299 USDC on Base — 70% into the locked launch escrow. Password never lives in the frontend bundle.",
  leadDe:
    "Vor dem öffentlichen Drop können Early Supporters mit Passwort minten. Cap 333. Dieselben 299 $ USDC auf Base — 70% in den gesperrten Launch-Escrow. Das Passwort liegt nie im Frontend-Bundle.",
  hint: "Got the early pass? Enter it below, then mint with your wallet.",
  hintDe: "Hast du den Early Pass? Unten eingeben, dann mit Wallet minten.",
  soldOut: "Early supporter wave is full (333/333). Public mint opens on the published date.",
  soldOutDe:
    "Early-Supporter-Welle ist voll (333/333). Der öffentliche Mint öffnet am veröffentlichten Datum.",
  publicOpen: "Public mint is open — no password needed.",
  publicOpenDe: "Öffentlicher Mint ist offen — kein Passwort nötig.",
} as const;

/** Trim, lowercase, collapse whitespace — same idea as Relic normalize. */
export function normalizeHoodEarlyPass(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hoodEarlySlotsLeft(totalMinted: number): number {
  const minted = Math.max(0, Math.floor(totalMinted));
  return Math.max(0, HOOD_EARLY_SUPPORTER_CAP - minted);
}

export function hoodEarlyWaveOpen(totalMinted: number, publicMintOpen: boolean): boolean {
  if (publicMintOpen) return false;
  return hoodEarlySlotsLeft(totalMinted) > 0;
}

/** Wallet mint allowed: public drop, or early wave with a live permit and room under 333. */
export function hoodWalletMintAllowed(opts: {
  publicOpen: boolean;
  earlyUnlocked: boolean;
  totalMinted: number | null;
}): boolean {
  if (opts.publicOpen) return true;
  if (!opts.earlyUnlocked) return false;
  if (opts.totalMinted == null) return true; // allow UI; chain enforces via next id
  return hoodEarlySlotsLeft(opts.totalMinted) > 0;
}
