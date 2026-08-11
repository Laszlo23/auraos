/** Read stable (USDC/USDG) balance for a smart-wallet address via Alchemy RPC. */

import type { AuraNetwork } from "@/lib/chain-config";

export async function fetchWalletUsdcBalance(
  address: string,
  networkArg?: AuraNetwork,
): Promise<number> {
  try {
    const { activeNetwork, alchemyRpcUrl, USDC_ADDRESSES, USDC_DECIMALS } = await import(
      "@/lib/chain-config"
    );
    const network = networkArg ?? activeNetwork();
    const url = alchemyRpcUrl({ network });
    if (!url) return 0;
    const balanceOf = `0x70a08231000000000000000000000000${address.slice(2).toLowerCase()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: USDC_ADDRESSES[network], data: balanceOf }, "latest"],
      }),
    });
    const json = (await res.json()) as { result?: string };
    if (!json.result) return 0;
    return Number(BigInt(json.result)) / 10 ** USDC_DECIMALS[network];
  } catch {
    return 0;
  }
}

/** Native ETH/BNB balance (for gas + in-app convert prompts). */
export async function fetchWalletEthBalance(
  address: string,
  networkArg?: AuraNetwork,
): Promise<number> {
  try {
    const { activeNetwork, alchemyRpcUrl } = await import("@/lib/chain-config");
    const network = networkArg ?? activeNetwork();
    const url = alchemyRpcUrl({ network });
    if (!url) return 0;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
    });
    const json = (await res.json()) as { result?: string };
    if (!json.result) return 0;
    return Number(BigInt(json.result)) / 1e18;
  } catch {
    return 0;
  }
}
