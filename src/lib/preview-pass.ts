import { SITE_URL } from "@/lib/site";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Standing multi-use tester door. Does not count as a paid founding seat. */
export const PREVIEW_PASS_CODE = "LOOK";
export const PREVIEW_CODE_RE = /^LOOK-[A-Z0-9]{8}$/;
export const PREVIEW_PASS_BATCH_MAX = 6;
export const PREVIEW_PASS_STANDING_USES = 50;

export function looksLikePreviewCode(value: string): boolean {
  const v = value.trim().toUpperCase();
  return v === PREVIEW_PASS_CODE || PREVIEW_CODE_RE.test(v);
}

export function normalizePreviewCode(value: string): string | null {
  const v = value.trim().toUpperCase();
  return looksLikePreviewCode(v) ? v : null;
}

export function randomPreviewCode(bytes: Uint8Array): string {
  if (bytes.length < 8) throw new Error("Need 8 random bytes.");
  let tail = "";
  for (let i = 0; i < 8; i++) {
    tail += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `LOOK-${tail}`;
}

export function clampPreviewBatch(count: unknown): number {
  const n = typeof count === "number" ? count : Number(count);
  if (!Number.isFinite(n)) return PREVIEW_PASS_BATCH_MAX;
  return Math.min(PREVIEW_PASS_BATCH_MAX, Math.max(1, Math.floor(n)));
}

export function previewPassShareUrl(code: string = PREVIEW_PASS_CODE): string {
  const normalized = normalizePreviewCode(code) ?? PREVIEW_PASS_CODE;
  return `${SITE_URL}/auth?mode=signup&invite=${encodeURIComponent(normalized)}`;
}
