/**
 * Single source of truth for chain / Alchemy / x402 network selection.
 * Client code may import labels; secrets stay server-only via getters below.
 */

export type AuraNetwork = "base-sepolia" | "base";

const NETWORK_ALIASES: Record<string, AuraNetwork> = {
  "base-sepolia": "base-sepolia",
  basesepolia: "base-sepolia",
  "base-mainnet": "base",
  base: "base",
  mainnet: "base",
};

/** Normalize env strings into a supported Aura network. */
export function resolveNetwork(raw?: string | null): AuraNetwork {
  if (!raw) return "base-sepolia";
  const key = raw.trim().toLowerCase().replace(/\s+/g, "");
  return NETWORK_ALIASES[key] ?? "base-sepolia";
}

export function chainLabel(network: AuraNetwork): string {
  return network === "base" ? "Base" : "Base Sepolia";
}

export function chainId(network: AuraNetwork): number {
  return network === "base" ? 8453 : 84532;
}

/** Alchemy JSON-RPC subdomain (matches alchemy.com network slugs). */
export function alchemySubdomain(network: AuraNetwork): string {
  return network === "base" ? "base-mainnet" : "base-sepolia";
}

/**
 * Resolves the Alchemy RPC URL.
 * Prefer explicit ALCHEMY_BASE_URL when it matches the configured network;
 * otherwise build from ALCHEMY_API_KEY + network.
 */
export function alchemyRpcUrl(opts?: {
  apiKey?: string | null;
  network?: string | null;
  baseUrl?: string | null;
}): string | null {
  const network = resolveNetwork(opts?.network ?? process.env["ALCHEMY_NETWORK"]);
  const baseUrl = opts?.baseUrl ?? process.env["ALCHEMY_BASE_URL"];
  const apiKey = opts?.apiKey ?? process.env["ALCHEMY_API_KEY"];

  if (baseUrl) {
    try {
      const u = new URL(baseUrl);
      // Only trust explicit URL if host looks like Alchemy for our network.
      const hostOk =
        u.hostname.includes("alchemy.com") &&
        (u.hostname.includes(alchemySubdomain(network)) ||
          u.hostname.includes(network) ||
          // Allow generic override when operator sets BASE_URL deliberately.
          Boolean(process.env["ALCHEMY_BASE_URL"]));
      if (hostOk && u.pathname.length > 1) return baseUrl.replace(/\/$/, "");
    } catch {
      /* fall through */
    }
  }

  if (!apiKey) return null;
  return `https://${alchemySubdomain(network)}.g.alchemy.com/v2/${apiKey}`;
}

/** Server-side active network (ALCHEMY_NETWORK wins, then X402_NETWORK, then VITE). */
export function activeNetwork(): AuraNetwork {
  return resolveNetwork(
    process.env["ALCHEMY_NETWORK"] ||
      process.env["X402_NETWORK"] ||
      process.env["VITE_CHAIN_NETWORK"] ||
      "base-sepolia",
  );
}

export const USDC_ADDRESSES: Record<AuraNetwork, `0x${string}`> = {
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

export const USDC_META: Record<AuraNetwork, { name: string; version: string }> = {
  "base-sepolia": { name: "USDC", version: "2" },
  base: { name: "USD Coin", version: "2" },
};

/** Gas Manager policy — when set, UserOps can be sponsored. */
export function gasPolicyId(): string | null {
  return process.env["ALCHEMY_GAS_POLICY_ID"] || null;
}

export function gasSponsorshipEnabled(): boolean {
  return Boolean(gasPolicyId() && alchemyRpcUrl());
}
