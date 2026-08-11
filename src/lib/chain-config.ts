/**
 * Single source of truth for chain / Alchemy / x402 network selection.
 * Multichain desks: Base + BNB Smart Chain + opBNB + Robinhood Chain.
 * Per-company desk preference lives on companies.desk_network (see desk-network.server).
 * Client code may import labels; secrets stay server-only via getters below.
 */

export type AuraNetwork =
  | "base-sepolia"
  | "base"
  | "bsc"
  | "opbnb"
  | "robinhood"
  | "robinhood-testnet";

/** Networks that can settle x402 EIP-3009 USDC with the default facilitator. */
export type X402SettleNetwork = "base" | "base-sepolia";

type NetworkSpec = {
  id: number;
  label: string;
  alchemySubdomain: string;
  explorer: string;
  nativeSymbol: "ETH" | "BNB";
  /** Wrapped native (WETH / WBNB). */
  wrappedNative: `0x${string}`;
  /**
   * Quote stable used by the Quant desk / wallet exchange.
   * On Robinhood this is USDG (Global Dollar), not Circle USDC.
   */
  usdc: `0x${string}`;
  usdcDecimals: number;
  usdcMeta: { name: string; version: string; symbol: string };
  /** Desk primary pair label. */
  primaryPair: string;
  x402Settle: boolean;
};

const NETWORKS: Record<AuraNetwork, NetworkSpec> = {
  "base-sepolia": {
    id: 84532,
    label: "Base Sepolia",
    alchemySubdomain: "base-sepolia",
    explorer: "https://sepolia.basescan.org",
    nativeSymbol: "ETH",
    wrappedNative: "0x4200000000000000000000000000000000000006",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    usdcDecimals: 6,
    usdcMeta: { name: "USDC", version: "2", symbol: "USDC" },
    primaryPair: "WETH/USDC",
    x402Settle: true,
  },
  base: {
    id: 8453,
    label: "Base",
    alchemySubdomain: "base-mainnet",
    explorer: "https://basescan.org",
    nativeSymbol: "ETH",
    wrappedNative: "0x4200000000000000000000000000000000000006",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcDecimals: 6,
    usdcMeta: { name: "USD Coin", version: "2", symbol: "USDC" },
    primaryPair: "WETH/USDC",
    x402Settle: true,
  },
  bsc: {
    id: 56,
    label: "BNB Smart Chain",
    alchemySubdomain: "bnb-mainnet",
    explorer: "https://bscscan.com",
    nativeSymbol: "BNB",
    wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    // Binance-Peg USDC (18 decimals on BSC)
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    usdcDecimals: 18,
    usdcMeta: { name: "USD Coin", version: "2", symbol: "USDC" },
    primaryPair: "WBNB/USDC",
    x402Settle: false,
  },
  opbnb: {
    id: 204,
    label: "opBNB",
    alchemySubdomain: "opbnb-mainnet",
    explorer: "https://opbnb.bscscan.com",
    nativeSymbol: "BNB",
    wrappedNative: "0x4200000000000000000000000000000000000006",
    usdc: "0x9e5AAC1Ba1a2e6aEd6b991Ee3389c028f92536dA",
    usdcDecimals: 18,
    usdcMeta: { name: "USD Coin", version: "2", symbol: "USDC" },
    primaryPair: "WBNB/USDC",
    x402Settle: false,
  },
  robinhood: {
    id: 4663,
    label: "Robinhood Chain",
    alchemySubdomain: "robinhood-mainnet",
    explorer: "https://robinhoodchain.blockscout.com",
    nativeSymbol: "ETH",
    // Canonical WETH on Robinhood Chain
    wrappedNative: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    // Global Dollar (USDG) — native stable on Robinhood, not Circle USDC
    usdc: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    usdcDecimals: 6,
    usdcMeta: { name: "Global Dollar", version: "1", symbol: "USDG" },
    primaryPair: "WETH/USDG",
    x402Settle: false,
  },
  "robinhood-testnet": {
    id: 46630,
    label: "Robinhood Testnet",
    alchemySubdomain: "robinhood-testnet",
    explorer: "https://explorer.testnet.chain.robinhood.com",
    nativeSymbol: "ETH",
    // Testnet tokens — verify before funded testing
    wrappedNative: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    usdc: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    usdcDecimals: 6,
    usdcMeta: { name: "Global Dollar", version: "1", symbol: "USDG" },
    primaryPair: "WETH/USDG",
    x402Settle: false,
  },
};

const NETWORK_ALIASES: Record<string, AuraNetwork> = {
  "base-sepolia": "base-sepolia",
  basesepolia: "base-sepolia",
  "base-mainnet": "base",
  base: "base",
  mainnet: "base",
  bsc: "bsc",
  bnb: "bsc",
  "bnb-chain": "bsc",
  "bnb-smart-chain": "bsc",
  "bnb-mainnet": "bsc",
  binance: "bsc",
  "binance-smart-chain": "bsc",
  opbnb: "opbnb",
  "opbnb-mainnet": "opbnb",
  robinhood: "robinhood",
  "robinhood-mainnet": "robinhood",
  "robinhoodchain": "robinhood",
  rh: "robinhood",
  "robinhood-testnet": "robinhood-testnet",
  "robinhoodtestnet": "robinhood-testnet",
};

export const SUPPORTED_NETWORKS: AuraNetwork[] = [
  "base",
  "base-sepolia",
  "bsc",
  "opbnb",
  "robinhood",
  "robinhood-testnet",
];

export function networkSpec(network: AuraNetwork): NetworkSpec {
  return NETWORKS[network];
}

/** Normalize env strings into a supported Aura network. */
export function resolveNetwork(raw?: string | null): AuraNetwork {
  if (!raw) return "base-sepolia";
  const key = raw.trim().toLowerCase().replace(/\s+/g, "");
  return NETWORK_ALIASES[key] ?? "base-sepolia";
}

export function chainLabel(network: AuraNetwork): string {
  return NETWORKS[network].label;
}

export function chainId(network: AuraNetwork): number {
  return NETWORKS[network].id;
}

export function explorerBaseUrl(network: AuraNetwork): string {
  return NETWORKS[network].explorer;
}

export function nativeSymbol(network: AuraNetwork): "ETH" | "BNB" {
  return NETWORKS[network].nativeSymbol;
}

/** Display symbol for the desk quote stable (USDC or USDG). */
export function stableSymbol(network: AuraNetwork): string {
  return NETWORKS[network].usdcMeta.symbol;
}

/** Alchemy JSON-RPC subdomain (matches alchemy.com network slugs). */
export function alchemySubdomain(network: AuraNetwork): string {
  return NETWORKS[network].alchemySubdomain;
}

/**
 * Resolves the Alchemy RPC URL for a specific network.
 * Never reuses a hardcoded ALCHEMY_RPC_URL for a different chain.
 */
export function alchemyRpcUrl(opts?: {
  apiKey?: string | null;
  network?: string | null;
  baseUrl?: string | null;
}): string | null {
  const network = resolveNetwork(opts?.network ?? process.env["ALCHEMY_NETWORK"]);
  const baseUrl =
    opts?.baseUrl ?? process.env["ALCHEMY_RPC_URL"] ?? process.env["ALCHEMY_BASE_URL"];
  const apiKey = opts?.apiKey ?? process.env["ALCHEMY_API_KEY"];

  if (baseUrl) {
    try {
      const u = new URL(baseUrl);
      const sub = alchemySubdomain(network);
      const hostOk =
        u.hostname.includes("alchemy.com") &&
        (u.hostname.includes(sub) || u.hostname.startsWith(`${network}.`));
      if (hostOk && u.pathname.length > 1) return baseUrl.replace(/\/$/, "");
    } catch {
      /* fall through — build from key + subdomain */
    }
  }

  if (!apiKey) return null;
  return `https://${alchemySubdomain(network)}.g.alchemy.com/v2/${apiKey}`;
}

/**
 * Process default network (legacy env flip).
 * Prefer resolveCompanyDeskNetwork() for wallet/trading so companies can be multichain.
 */
export function activeNetwork(): AuraNetwork {
  return resolveNetwork(
    process.env["ALCHEMY_NETWORK"] ||
      process.env["X402_NETWORK"] ||
      process.env["VITE_CHAIN_NETWORK"] ||
      "base-sepolia",
  );
}

/**
 * Network used for x402 EIP-3009 settlement.
 * Non-Base desks stay tradable via OKX; x402 always settles on Base (or Base Sepolia).
 */
export function x402SettleNetwork(): X402SettleNetwork {
  const raw = process.env["X402_NETWORK"] || activeNetwork();
  const resolved = resolveNetwork(raw);
  if (resolved === "base" || resolved === "base-sepolia") return resolved;
  return "base";
}

export function supportsX402Settle(network: AuraNetwork): boolean {
  return NETWORKS[network].x402Settle;
}

export const USDC_ADDRESSES: Record<AuraNetwork, `0x${string}`> = {
  "base-sepolia": NETWORKS["base-sepolia"].usdc,
  base: NETWORKS.base.usdc,
  bsc: NETWORKS.bsc.usdc,
  opbnb: NETWORKS.opbnb.usdc,
  robinhood: NETWORKS.robinhood.usdc,
  "robinhood-testnet": NETWORKS["robinhood-testnet"].usdc,
};

export const USDC_DECIMALS: Record<AuraNetwork, number> = {
  "base-sepolia": NETWORKS["base-sepolia"].usdcDecimals,
  base: NETWORKS.base.usdcDecimals,
  bsc: NETWORKS.bsc.usdcDecimals,
  opbnb: NETWORKS.opbnb.usdcDecimals,
  robinhood: NETWORKS.robinhood.usdcDecimals,
  "robinhood-testnet": NETWORKS["robinhood-testnet"].usdcDecimals,
};

export const USDC_META: Record<AuraNetwork, { name: string; version: string; symbol: string }> = {
  "base-sepolia": NETWORKS["base-sepolia"].usdcMeta,
  base: NETWORKS.base.usdcMeta,
  bsc: NETWORKS.bsc.usdcMeta,
  opbnb: NETWORKS.opbnb.usdcMeta,
  robinhood: NETWORKS.robinhood.usdcMeta,
  "robinhood-testnet": NETWORKS["robinhood-testnet"].usdcMeta,
};

/** Gas Manager policy — network-specific env wins, then shared fallback. */
export function gasPolicyId(network: AuraNetwork = activeNetwork()): string | null {
  const perNetwork: Partial<Record<AuraNetwork, string | undefined>> = {
    base: process.env["ALCHEMY_GAS_POLICY_ID_BASE"] || process.env["ALCHEMY_GAS_POLICY_ID"],
    "base-sepolia":
      process.env["ALCHEMY_GAS_POLICY_ID_BASE_SEPOLIA"] || process.env["ALCHEMY_GAS_POLICY_ID"],
    bsc: process.env["ALCHEMY_GAS_POLICY_ID_BSC"] || process.env["ALCHEMY_GAS_POLICY_ID"],
    opbnb: process.env["ALCHEMY_GAS_POLICY_ID_OPBNB"] || process.env["ALCHEMY_GAS_POLICY_ID"],
    robinhood:
      process.env["ALCHEMY_GAS_POLICY_ID_ROBINHOOD"] || process.env["ALCHEMY_GAS_POLICY_ID"],
    "robinhood-testnet":
      process.env["ALCHEMY_GAS_POLICY_ID_ROBINHOOD_TESTNET"] ||
      process.env["ALCHEMY_GAS_POLICY_ID"],
  };
  return perNetwork[network] || null;
}

export function gasSponsorshipEnabled(network: AuraNetwork = activeNetwork()): boolean {
  return Boolean(gasPolicyId(network) && alchemyRpcUrl({ network }));
}
