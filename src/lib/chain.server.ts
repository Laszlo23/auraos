/** Server-only Alchemy access. The API key never reaches the browser. */

import { activeNetwork, alchemyRpcUrl, alchemySubdomain } from "@/lib/chain-config";

export type AnchorResult = {
  network: string;
  status: "anchored" | "dev";
  block: number | null;
  txHash: string;
};

export async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Reads the head block from Alchemy so every grant carries a verifiable anchor. */
export async function alchemyHead(apiKey: string, network?: string): Promise<number | null> {
  const url =
    alchemyRpcUrl({
      apiKey,
      network: network ?? activeNetwork(),
    }) ?? `https://${alchemySubdomain(activeNetwork())}.g.alchemy.com/v2/${apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string };
    return json.result ? Number.parseInt(json.result, 16) : null;
  } catch {
    return null;
  }
}
