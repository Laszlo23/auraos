import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequest, getResponseHeaders } from "@tanstack/react-start/server";

export const DESK_COOKIE_NAME = "aura_desk";
const MAX_AGE = 7 * 24 * 60 * 60;

function getSecret(): string {
  const secret = process.env["TEAM_DESK_SECRET"];
  if (secret && secret.trim()) return secret.trim();
  const pwd = process.env["TEAM_DESK_PASSWORD"];
  if (pwd && pwd.trim()) {
    const hash = createHmac("sha256", "aura-desk-fallback-salt");
    hash.update(pwd.trim());
    return hash.digest("hex");
  }
  throw new Error("TEAM_DESK_SECRET or TEAM_DESK_PASSWORD not configured");
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Buffer.from(base64, "base64").toString("utf8");
}

export function signDeskToken(displayName: string): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = JSON.stringify({ displayName, exp });
  const encoded = base64UrlEncode(payload);
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): { displayName: string; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts as [string, string];

    const secret = getSecret();
    const expectedSig = createHmac("sha256", secret).update(encoded).digest("base64url");

    if (
      !sig ||
      !expectedSig ||
      Buffer.byteLength(sig) !== Buffer.byteLength(expectedSig) ||
      !timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expectedSig, "utf8"))
    ) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encoded)) as { displayName: string; exp: number };
    if (!payload.displayName || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now() / 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

function getCookieFromRequest(): string | null {
  try {
    const request = getRequest();
    const cookies = request?.headers.get("cookie");
    if (!cookies) return null;
    const match = cookies.match(new RegExp(`${DESK_COOKIE_NAME}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function requireDeskAuth(tokenFromBody?: string | null): { displayName: string } {
  const tokenCandidate = tokenFromBody || getCookieFromRequest();
  if (!tokenCandidate) {
    throw new Error("Team Desk: Unauthorized");
  }
  const verified = verifyToken(tokenCandidate);
  if (!verified) {
    throw new Error("Team Desk: Session expired or invalid");
  }
  return { displayName: verified.displayName };
}

export function setDeskAuthCookie(token: string) {
  const headers = getResponseHeaders();
  headers.set(
    "Set-Cookie",
    `${DESK_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`,
  );
}

export function clearDeskAuthCookie() {
  const headers = getResponseHeaders();
  headers.set(
    "Set-Cookie",
    `${DESK_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );
}
