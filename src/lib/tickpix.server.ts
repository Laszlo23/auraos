/**
 * Tickpix ownership checks on Robinhood Chain (4663).
 */
import { type Address, createPublicClient, http, parseAbi } from "viem";
import { robinhood } from "viem/chains";

import { alchemyRpcUrl } from "@/lib/chain-config";
import { TICKPIX, tickpixContractAddress } from "@/lib/tickpix";

export const TICKPIX_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
]);

function robinhoodRpcUrl(): string {
  const alchemy = alchemyRpcUrl({ network: "robinhood" });
  if (alchemy) return alchemy;
  return TICKPIX.publicRpc;
}

export function publicTickpixClient() {
  return createPublicClient({
    chain: robinhood,
    transport: http(robinhoodRpcUrl()),
  });
}

export async function loadTickpixBalance(wallet: string): Promise<bigint> {
  const contract = tickpixContractAddress();
  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return 0n;
  try {
    const client = publicTickpixClient();
    return await client.readContract({
      address: contract,
      abi: TICKPIX_ABI,
      functionName: "balanceOf",
      args: [wallet as Address],
    });
  } catch (err) {
    console.warn("[tickpix] balanceOf failed", err);
    return 0n;
  }
}

export async function walletOwnsTickpix(wallet: string): Promise<boolean> {
  const bal = await loadTickpixBalance(wallet);
  return bal > 0n;
}

type Db = { from: (table: string) => any };

/** Any linked wallet (smart or external) that holds ≥1 Tickpix. */
export async function loadHasTickpixNft(
  db: Db,
  opts: { userId?: string | null; companyId?: string | null },
): Promise<{ owns: boolean; balance: number; address: string | null }> {
  try {
    let userId = opts.userId ?? null;
    if (!userId && opts.companyId) {
      const { data: company } = await db
        .from("companies")
        .select("owner_id")
        .eq("id", opts.companyId)
        .maybeSingle();
      userId = (company?.owner_id as string | undefined) ?? null;
    }
    if (!userId) return { owns: false, balance: 0, address: null };

    const { data: wallets } = await db
      .from("wallet_bindings")
      .select("address, kind")
      .eq("user_id", userId);

    for (const row of wallets ?? []) {
      const address = String(row.address ?? "");
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) continue;
      const bal = await loadTickpixBalance(address);
      if (bal > 0n) {
        return { owns: true, balance: Number(bal), address };
      }
    }
    return { owns: false, balance: 0, address: null };
  } catch (err) {
    console.warn("[tickpix] holder check", err);
    return { owns: false, balance: 0, address: null };
  }
}
