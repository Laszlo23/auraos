import type { AuraNetwork } from "@/lib/chain-config";
import {
  USDC_ADDRESSES,
  USDC_DECIMALS,
  explorerBaseUrl,
  networkSpec,
} from "@/lib/chain-config";

/** Native asset sentinel used by OKX DEX (ETH or BNB depending on chain). */
export const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;
/** Alias — same OKX sentinel; prefer this in BNB-chain copy. */
export const NATIVE_TOKEN = NATIVE_ETH;

/** Wrapped native (WETH on Base, WBNB on BSC). */
export const WETH_ADDRESSES: Record<AuraNetwork, `0x${string}`> = {
  base: "0x4200000000000000000000000000000000000006",
  "base-sepolia": "0x4200000000000000000000000000000000000006",
  bsc: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  opbnb: "0x4200000000000000000000000000000000000006",
};

export const WBNB_ADDRESSES = {
  bsc: WETH_ADDRESSES.bsc,
  opbnb: WETH_ADDRESSES.opbnb,
} as const;

export type TradableSymbol = "WETH/USDC" | "WBNB/USDC" | "ETH/USDC" | "BNB/USDC";

export function tradableSymbolsFor(network: AuraNetwork): TradableSymbol[] {
  const pair = networkSpec(network).primaryPair;
  if (pair === "WBNB/USDC") return ["WBNB/USDC", "BNB/USDC"];
  return ["WETH/USDC", "ETH/USDC"];
}

/** @deprecated Prefer tradableSymbolsFor(activeNetwork()) — Base default for older callers. */
export const TRADABLE_SYMBOLS: TradableSymbol[] = ["WETH/USDC", "WBNB/USDC"];

export function resolvePairTokens(
  symbol: string,
  network: AuraNetwork,
): { base: `0x${string}`; quote: `0x${string}`; baseDecimals: number; quoteDecimals: number } {
  const usdc = USDC_ADDRESSES[network];
  const wrapped = WETH_ADDRESSES[network];
  const quoteDecimals = USDC_DECIMALS[network];
  const normalized = symbol.toUpperCase().replace(/\s+/g, "");

  if (
    normalized === "WETH/USDC" ||
    normalized === "ETH/USDC" ||
    normalized === "WBNB/USDC" ||
    normalized === "BNB/USDC"
  ) {
    return { base: wrapped, quote: usdc, baseDecimals: 18, quoteDecimals };
  }
  throw new Error(`Unsupported symbol on ${network}: ${symbol}`);
}

export function explorerTxUrl(network: AuraNetwork, txHash: string) {
  return `${explorerBaseUrl(network)}/tx/${txHash}`;
}

export function explorerAddressUrl(network: AuraNetwork, address: string) {
  return `${explorerBaseUrl(network)}/address/${address}`;
}
