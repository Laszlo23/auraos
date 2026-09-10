/**
 * CCFF00 ownership checks on Robinhood Chain (4663).
 */
import { type Address, createPublicClient, http, parseAbi } from "viem";
import { robinhood } from "viem/chains";

import { alchemyRpcUrl } from "@/lib/chain-config";
import { CCFF00, ccff00NftContractAddress } from "@/lib/ccff00";

export const CCFF00_NFT_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
]);

function robinhoodRpcUrl(): string {
  const alchemy = alchemyRpcUrl({ network: "robinhood" });
  if (alchemy) return alchemy;
  return CCFF00.publicRpc;
}

export function publicCcff00Client() {
  return createPublicClient({
    chain: robinhood,
    transport: http(robinhoodRpcUrl()),
  });
}

export async function loadCcff00Balance(wallet: string): Promise<bigint> {
  const contract = ccff00NftContractAddress();
  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return 0n;
  try {
    const client = publicCcff00Client();
    return await client.readContract({
      address: contract,
      abi: CCFF00_NFT_ABI,
      functionName: "balanceOf",
      args: [wallet as Address],
    });
  } catch (err) {
    console.warn("[ccff00] balanceOf failed", err);
    return 0n;
  }
}

export async function walletOwnsCcff00(wallet: string): Promise<boolean> {
  const bal = await loadCcff00Balance(wallet);
  return bal > 0n;
}

type Db = { from: (table: string) => any };

/** Any linked wallet (smart or external) that holds ≥1 CCFF00 NFT. */
export async function loadHasCcff00Nft(
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
      const bal = await loadCcff00Balance(address);
      if (bal > 0n) {
        return { owns: true, balance: Number(bal), address };
      }
    }
    return { owns: false, balance: 0, address: null };
  } catch (err) {
    console.warn("[ccff00] holder check", err);
    return { owns: false, balance: 0, address: null };
  }
}
