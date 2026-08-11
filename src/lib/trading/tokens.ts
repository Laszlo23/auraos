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

/** Wrapped native (WETH on Base/Robinhood, WBNB on BSC). */
export const WETH_ADDRESSES: Record<AuraNetwork, `0x${string}`> = {
  base: "0x4200000000000000000000000000000000000006",
  "base-sepolia": "0x4200000000000000000000000000000000000006",
  bsc: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  opbnb: "0x4200000000000000000000000000000000000006",
  robinhood: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  "robinhood-testnet": "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
};

export const WBNB_ADDRESSES = {
  bsc: WETH_ADDRESSES.bsc,
  opbnb: WETH_ADDRESSES.opbnb,
} as const;

export type TradableSymbol =
  | "WETH/USDC"
  | "WBNB/USDC"
  | "ETH/USDC"
  | "BNB/USDC"
  | "WETH/USDG"
  | "ETH/USDG";

export function tradableSymbolsFor(network: AuraNetwork): TradableSymbol[] {
  const pair = networkSpec(network).primaryPair;
  if (pair === "WBNB/USDC") return ["WBNB/USDC", "BNB/USDC"];
  if (pair === "WETH/USDG") return ["WETH/USDG", "ETH/USDG"];
  return ["WETH/USDC", "ETH/USDC"];
}

/** @deprecated Prefer tradableSymbolsFor(network). */
export const TRADABLE_SYMBOLS: TradableSymbol[] = ["WETH/USDC", "WBNB/USDC", "WETH/USDG"];

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
    normalized === "BNB/USDC" ||
    normalized === "WETH/USDG" ||
    normalized === "ETH/USDG"
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
