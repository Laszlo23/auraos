/**
 * Hood giveaway code helpers — no I/O.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const HOOD_CODE_RE = /^HOOD-[A-Z0-9]{8}$/;
export const HOOD_GIVEAWAY_BATCH_MAX = 6;

export function looksLikeHoodCode(value: string): boolean {
  return HOOD_CODE_RE.test(value.trim().toUpperCase());
}

export function normalizeHoodCode(value: string): string | null {
  const v = value.trim().toUpperCase();
  return looksLikeHoodCode(v) ? v : null;
}

export function randomHoodCode(bytes: Uint8Array): string {
  if (bytes.length < 8) throw new Error("Need 8 random bytes.");
  let tail = "";
  for (let i = 0; i < 8; i++) {
    tail += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `HOOD-${tail}`;
}

export function clampGiveawayBatch(count: unknown): number {
  const n = typeof count === "number" ? count : Number(count);
  if (!Number.isFinite(n)) return HOOD_GIVEAWAY_BATCH_MAX;
  return Math.min(HOOD_GIVEAWAY_BATCH_MAX, Math.max(1, Math.floor(n)));
}

export function hoodRedeemMessage(code: string, address: string, nonce: string): string {
  return [
    "Aura OS — Hood giveaway",
    "",
    `Code: ${code}`,
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    "",
    "Signing claims this Hood to your wallet. It costs no gas.",
  ].join("\n");
}

export type HoodRedeemCode =
  | "ok"
  | "invalid"
  | "redeemed"
  | "void"
  | "unarmed"
  | "sold_out"
  | "rate"
  | "bad_wallet"
  | "bad_sig"
  | "mint_failed";
