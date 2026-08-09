/** Read USDC balance for a smart-wallet address via Alchemy RPC. */

export async function fetchWalletUsdcBalance(address: string): Promise<number> {
  try {
    const { activeNetwork, alchemyRpcUrl, USDC_ADDRESSES } = await import(
      "@/lib/chain-config"
    );
    const network = activeNetwork();
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
    return Number(BigInt(json.result)) / 1e6;
  } catch {
    return 0;
  }
}
