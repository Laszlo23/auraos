import { getAddress } from "viem";

/** Hard cap so a pasted dump cannot blow the request or the table. */
export const FOLLOWER_NOTICE_IMPORT_MAX = 20_000;

const ADDR_RE = /0x[a-fA-F0-9]{40}/g;
const ADDR_ONE = /0x[a-fA-F0-9]{40}/;

export type FollowerNoticeParse = {
  wallets: `0x${string}`[];
  invalid: string[];
  invalidCount: number;
  duplicates: number;
};

export function normalizeFollowerWallet(raw: string): `0x${string}` | null {
  const m = raw.trim().match(ADDR_ONE);
  if (!m) return null;
  try {
    return getAddress(m[0]).toLowerCase() as `0x${string}`;
  } catch {
    return null;
  }
}

function looksLikeHeader(line: string): boolean {
  return /^(wallet|address|addr)\b/i.test(line) && !/0x[a-fA-F0-9]{40}/.test(line);
}

/**
 * Pull unique Base-style 0x addresses from a CSV or a plain list.
 * Extra columns are ignored. Lines starting with # are comments.
 */
export function parseFollowerNoticeCsv(text: string): FollowerNoticeParse {
  const wallets: `0x${string}`[] = [];
  const seen = new Set<string>();
  const invalid: string[] = [];
  let duplicates = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || looksLikeHeader(line)) continue;

    const matches = line.match(ADDR_RE);
    if (!matches) {
      if (/[0-9a-fx]/i.test(line)) invalid.push(line.slice(0, 80));
      continue;
    }

    for (const match of matches) {
      const addr = normalizeFollowerWallet(match);
      if (!addr) {
        invalid.push(match);
        continue;
      }
      if (seen.has(addr)) {
        duplicates += 1;
        continue;
      }
      seen.add(addr);
      wallets.push(addr);
    }
  }

  return {
    wallets,
    invalid: invalid.slice(0, 50),
    invalidCount: invalid.length,
    duplicates,
  };
}
