import type { AuraNetwork } from "@/lib/chain-config";
import { USDC_ADDRESSES } from "@/lib/chain-config";

/** Native ETH sentinel used by OKX DEX. */
export const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

export const WETH_ADDRESSES: Record<AuraNetwork, `0x${string}`> = {
  base: "0x4200000000000000000000000000000000000006",
  "base-sepolia": "0x4200000000000000000000000000000000000006",
};

export type TradableSymbol = "WETH/USDC";

export const TRADABLE_SYMBOLS: TradableSymbol[] = ["WETH/USDC"];

export function resolvePairTokens(
  symbol: string,
  network: AuraNetwork,
): { base: `0x${string}`; quote: `0x${string}`; baseDecimals: number; quoteDecimals: number } {
  const usdc = USDC_ADDRESSES[network];
  const weth = WETH_ADDRESSES[network];
  if (symbol === "WETH/USDC" || symbol === "ETH/USDC") {
    return { base: weth, quote: usdc, baseDecimals: 18, quoteDecimals: 6 };
  }
  throw new Error(`Unsupported symbol: ${symbol}`);
}

export function explorerTxUrl(network: AuraNetwork, txHash: string) {
  const host = network === "base" ? "https://basescan.org" : "https://sepolia.basescan.org";
  return `${host}/tx/${txHash}`;
}
