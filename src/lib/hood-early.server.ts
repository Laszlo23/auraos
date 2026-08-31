/**
 * Early supporter password gate — server only.
 * Set HOOD_EARLY_PASS (plaintext) or HOOD_EARLY_PASS_HASH (sha256 hex of normalized pass).
 * Never put either on VITE_*.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { HOOD_EARLY_PERMIT_TTL_SEC, normalizeHoodEarlyPass } from "@/lib/hood-early";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hoodEarlyConfigured(): boolean {
  return Boolean(
    process.env["HOOD_EARLY_PASS"]?.trim() || process.env["HOOD_EARLY_PASS_HASH"]?.trim(),
  );
}

function expectedHash(): string | null {
  const hash = process.env["HOOD_EARLY_PASS_HASH"]?.trim().toLowerCase();
  if (hash && /^[a-f0-9]{64}$/.test(hash)) return hash;
  const pass = process.env["HOOD_EARLY_PASS"]?.trim();
  if (!pass) return null;
  return sha256Hex(normalizeHoodEarlyPass(pass));
}

function permitSecret(): string {
  const explicit = process.env["HOOD_EARLY_PERMIT_SECRET"]?.trim();
  if (explicit) return explicit;
  const hash = expectedHash();
  if (hash) return createHmac("sha256", "aura-hood-early-permit").update(hash).digest("hex");
  throw new Error("Early supporter pass is not configured.");
}

export function verifyHoodEarlyPassword(raw: string): boolean {
  const expected = expectedHash();
  if (!expected) return false;
  const provided = sha256Hex(normalizeHoodEarlyPass(raw));
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function b64urlDecode(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Buffer.from(base64, "base64").toString("utf8");
}

export function issueHoodEarlyPermit(): { permit: string; expiresAt: number } {
  const exp = Math.floor(Date.now() / 1000) + HOOD_EARLY_PERMIT_TTL_SEC;
  const encoded = b64url(JSON.stringify({ kind: "hood_early", exp }));
  const sig = createHmac("sha256", permitSecret()).update(encoded).digest("base64url");
  return { permit: `${encoded}.${sig}`, expiresAt: exp * 1000 };
}

export function verifyHoodEarlyPermit(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [encoded, sig] = parts as [string, string];
    const expected = createHmac("sha256", permitSecret()).update(encoded).digest("base64url");
    if (
      !sig ||
      Buffer.byteLength(sig) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))
    ) {
      return false;
    }
    const payload = JSON.parse(b64urlDecode(encoded)) as { kind?: string; exp?: number };
    if (payload.kind !== "hood_early" || typeof payload.exp !== "number") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}
