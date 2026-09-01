/**
 * Client-only Robinhood Chain config for creator mint wallet.
 * Never falls back to VITE_CHAIN_NETWORK (Base) — creator flows are RH-only.
 */

export function clientCreatorChainId(): number {
  const raw = import.meta.env["VITE_CREATOR_CHAIN_ID"];
  const n = Number(raw);
  if (n === 46630) return 46630;
  if (n === 4663) return 4663;
  return 4663;
}

export function clientCreatorRpcUrl(): string {
  const explicit = import.meta.env["VITE_ROBINHOOD_RPC_URL"];
  if (typeof explicit === "string" && explicit.trim().startsWith("http")) {
    return explicit.trim().replace(/\/$/, "");
  }
  const alchemyKey = import.meta.env["VITE_ALCHEMY_API_KEY"];
  const testnet = clientCreatorChainId() === 46630;
  if (typeof alchemyKey === "string" && alchemyKey.trim()) {
    const sub = testnet ? "robinhood-testnet" : "robinhood-mainnet";
    return `https://${sub}.g.alchemy.com/v2/${alchemyKey.trim()}`;
  }
  return testnet ? "https://testnet-rpc.robinhoodchain.com" : "https://rpc.robinhoodchain.com";
}

export function clientCreatorStableAddress(): `0x${string}` {
  const raw = import.meta.env["VITE_CREATOR_STABLE_RH"];
  if (typeof raw === "string" && /^0x[a-fA-F0-9]{40}$/.test(raw.trim())) {
    return raw.trim() as `0x${string}`;
  }
  return "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
}
