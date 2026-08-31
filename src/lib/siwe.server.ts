/**
 * SIWE (EIP-4361) message helpers — no I/O.
 * Domain / URI must match SITE_URL (localhost only on localhost).
 */
import { getAddress } from "viem";

import { SITE_URL } from "@/lib/site";
import { SIWE_EMAIL_DOMAIN } from "@/lib/siwe-display";

export {
  SIWE_EMAIL_DOMAIN,
  displayUserLabel,
  isSiweEmail,
  truncateAddress,
} from "@/lib/siwe-display";

export const SIWE_TTL_MS = 2 * 60 * 1000;
export const SIWE_CHAIN_ID = 8453;
export const SIWE_STATEMENT =
  "Sign in to Aura OS. This proves you control the wallet. It costs no gas.";
export const SIWE_BIND_STATEMENT =
  "Bind this wallet to your Aura OS account. This proves you control the wallet. It costs no gas.";

const ADDR = /^0x[a-fA-F0-9]{40}$/;

export function normalizeAddress(raw: string): `0x${string}` | null {
  const v = raw.trim();
  if (!ADDR.test(v)) return null;
  try {
    return getAddress(v).toLowerCase() as `0x${string}`;
  } catch {
    return null;
  }
}

export function checksumAddress(raw: string): `0x${string}` | null {
  const v = raw.trim();
  if (!ADDR.test(v)) return null;
  try {
    return getAddress(v);
  } catch {
    return null;
  }
}

export function siweEmailFor(address: string): string {
  const norm = normalizeAddress(address);
  if (!norm) throw new Error("Invalid wallet address.");
  return `${norm}@${SIWE_EMAIL_DOMAIN}`;
}

export type SiweHost = {
  host: string;
  origin: string;
};

/** Production host, or localhost / 127.0.0.1 when the request is local. */
export function resolveSiweHost(requestOrigin?: string | null): SiweHost {
  const fallback = new URL(SITE_URL);
  if (!requestOrigin) {
    return { host: fallback.host, origin: fallback.origin };
  }
  try {
    const u = new URL(requestOrigin);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (local) return { host: u.host, origin: u.origin };
    if (u.origin === fallback.origin) return { host: fallback.host, origin: fallback.origin };
  } catch {
    /* ignore */
  }
  return { host: fallback.host, origin: fallback.origin };
}

export type SiweMessageInput = {
  address: string;
  nonce: string;
  domain: string;
  uri: string;
  chainId: number;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
};

export function buildSiweMessage(input: SiweMessageInput): string {
  const checksum = checksumAddress(input.address);
  if (!checksum) throw new Error("Invalid wallet address.");
  const statement = input.statement ?? SIWE_STATEMENT;
  return [
    `${input.domain} wants you to sign in with your Ethereum account:`,
    checksum,
    "",
    statement,
    "",
    `URI: ${input.uri}`,
    "Version: 1",
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expirationTime}`,
  ].join("\n");
}

export function nonceExpired(expiresAt: string, now = Date.now()): boolean {
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return now >= t;
}
