/**
 * Chain layer — settlement runs through a server function so the Alchemy key
 * stays server-side. When the key resolves a head block the drop is "anchored"
 * to that block; otherwise it degrades to a deterministic dev hash.
 *
 * Server env: ALCHEMY_API_KEY, ALCHEMY_NETWORK / ALCHEMY_BASE_URL (see chain-config).
 */
import { anchorGrant } from "@/lib/chain.functions";
import { resolveNetwork, chainLabel, explorerBaseUrl } from "@/lib/chain-config";

const NETWORK = resolveNetwork(
  (import.meta.env["VITE_CHAIN_NETWORK"] as string | undefined) ?? "base-sepolia",
);

export const CHAIN = {
  network: NETWORK,
  label: chainLabel(NETWORK),
  /** Resolved per settlement by the server; this is the optimistic default. */
  mode: "live" as "dev" | "live",
  explorer: explorerBaseUrl(NETWORK),
} as const;

export type Settlement = {
  network: string;
  status: "anchored" | "dev";
  block: number | null;
  txHash: string;
};

async function digest(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Settle a token grant against the live chain head via Alchemy. Falls back to a
 * local deterministic hash if the RPC round-trip fails.
 */
export async function settleGrant(payload: {
  ref: string;
  amount: number;
  reason: string;
}): Promise<Settlement> {
  try {
    return await anchorGrant({ data: payload });
  } catch {
    const hash = await digest(
      `${CHAIN.network}:${payload.ref}:${payload.amount}:${payload.reason}`,
    );
    return { network: CHAIN.network, status: "dev", block: null, txHash: `0x${hash}` };
  }
}

export const shortTx = (tx: string) => `${tx.slice(0, 8)}…${tx.slice(-6)}`;
