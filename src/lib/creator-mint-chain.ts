/**
 * Client-only Robinhood Chain config for creator mint wallet.
 * Never falls back to VITE_CHAIN_NETWORK (Base) — creator flows are RH-only.
 * Never embed Alchemy (or other) API keys in VITE_* — Vite inlines those.
 */

const PUBLIC_RH_MAINNET = "https://rpc.robinhoodchain.com";
const PUBLIC_RH_TESTNET = "https://testnet-rpc.robinhoodchain.com";

/** Alchemy / provider paths that would leak a key if inlined. */
export function isKeyedRpcUrl(url: string): boolean {
  return /\/v2\/[A-Za-z0-9_-]{16,}/.test(url) || /alchemy\.com\/v2\//i.test(url);
}

export function clientCreatorChainId(): number {
  const raw = import.meta.env["VITE_CREATOR_CHAIN_ID"];
  const n = Number(raw);
  if (n === 46630) return 46630;
  if (n === 4663) return 4663;
  return 4663;
}

export function clientCreatorRpcUrl(): string {
  const testnet = clientCreatorChainId() === 46630;
  const fallback = testnet ? PUBLIC_RH_TESTNET : PUBLIC_RH_MAINNET;
  const explicit = import.meta.env["VITE_ROBINHOOD_RPC_URL"];
  if (typeof explicit === "string" && explicit.trim().startsWith("http")) {
    const url = explicit.trim().replace(/\/$/, "");
    if (!isKeyedRpcUrl(url)) return url;
  }
  return fallback;
}

export function clientCreatorStableAddress(): `0x${string}` {
  const raw = import.meta.env["VITE_CREATOR_STABLE_RH"];
  if (typeof raw === "string" && /^0x[a-fA-F0-9]{40}$/.test(raw.trim())) {
    return raw.trim() as `0x${string}`;
  }
  return "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
}
