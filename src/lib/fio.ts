/**
 * FIO Protocol — Aura's primary crypto-handle service.
 * In-app @handles stay for leaderboard/social; FIO is how money moves.
 */

export type FioChainPair = { chainCode: string; tokenCode: string; label: string };

/** Resolution targets we care about for Aura (ETH + Base + BNB + USDC). */
export const FIO_CHAIN_PAIRS: FioChainPair[] = [
  { chainCode: "ETH", tokenCode: "ETH", label: "ETH" },
  { chainCode: "ETH", tokenCode: "USDC", label: "USDC on ETH" },
  { chainCode: "BASE", tokenCode: "ETH", label: "Base ETH" },
  { chainCode: "BASE", tokenCode: "USDC", label: "USDC on Base" },
  { chainCode: "BSC", tokenCode: "BNB", label: "BNB" },
  { chainCode: "BSC", tokenCode: "USDC", label: "USDC on BSC" },
];

const DEFAULT_DOMAIN = "aura";
const DEFAULT_REGISTER = "https://www.fio.net/";

function readVite(key: string): string {
  try {
    return String(import.meta.env?.[key] ?? "").trim();
  } catch {
    return "";
  }
}

function readProcess(key: string): string {
  try {
    return (typeof process !== "undefined" ? process.env[key] : undefined)?.trim() || "";
  } catch {
    return "";
  }
}

/** Integrator TPID — earns fee share when set to our registered FIO handle. */
export function fioTpid(): string {
  return readProcess("FIO_TPID") || readVite("VITE_FIO_TPID");
}

/** Preferred FIO domain for Aura founders (partnership goal: free handles here). */
export function fioPreferredDomain(): string {
  return readProcess("FIO_DOMAIN") || readVite("VITE_FIO_DOMAIN") || DEFAULT_DOMAIN;
}

export function fioRegisterUrl(suggestedHandle?: string): string {
  const base =
    readProcess("FIO_REGISTER_URL") || readVite("VITE_FIO_REGISTER_URL") || DEFAULT_REGISTER;
  const tpid = fioTpid();
  try {
    const url = new URL(base);
    if (suggestedHandle) url.searchParams.set("handle", suggestedHandle);
    if (tpid) url.searchParams.set("tpid", tpid);
    return url.toString();
  } catch {
    return base;
  }
}

export function suggestFioFromAuraHandle(auraHandle: string): string {
  const clean = auraHandle.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 62);
  return clean ? `${clean}@${fioPreferredDomain()}` : `founder@${fioPreferredDomain()}`;
}
