import { walletOwnsGenesis } from "@/lib/genesis.server";
import { buildHolderPerks, type HolderPerks } from "@/lib/trading/holder-perks";

type Db = { from: (table: string) => any };

export function genesisNftContractEnv(): string | null {
  const raw =
    process.env["VITE_GENESIS_NFT_CONTRACT"]?.trim() ||
    process.env["GENESIS_NFT_CONTRACT"]?.trim() ||
    "";
  return raw || null;
}

export async function loadHasGenesisNft(
  db: Db,
  opts: { userId?: string | null; companyId?: string | null },
): Promise<boolean> {
  try {
    if (opts.companyId) {
      const { data: byCompany } = await db
        .from("genesis_purchases")
        .select("status")
        .eq("company_id", opts.companyId)
        .eq("status", "minted")
        .maybeSingle();
      if (byCompany?.status === "minted") return true;
    }

    let userId = opts.userId ?? null;
    if (!userId && opts.companyId) {
      const { data: company } = await db
        .from("companies")
        .select("owner_id")
        .eq("id", opts.companyId)
        .maybeSingle();
      userId = (company?.owner_id as string | undefined) ?? null;
    }
    if (!userId) return false;

    const { data: handle } = await db
      .from("handles")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (handle?.id) {
      const { data: wallet } = await db
        .from("wallet_bindings")
        .select("address")
        .eq("handle_id", handle.id)
        .eq("kind", "smart")
        .maybeSingle();
      if (wallet?.address && (await walletOwnsGenesis(wallet.address))) return true;
    }

    const { data: purchase } = await db
      .from("genesis_purchases")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    return purchase?.status === "minted";
  } catch (err) {
    console.warn("[holder-perks] genesis check", err);
    return false;
  }
}

export async function loadCompanyHolderPerks(db: Db, companyId: string): Promise<HolderPerks> {
  const { data: sub } = await db
    .from("subscriptions")
    .select("tokens_remaining")
    .eq("company_id", companyId)
    .maybeSingle();
  const hasGenesisNft = await loadHasGenesisNft(db, { companyId });
  return buildHolderPerks({
    auraBalance: Number(sub?.tokens_remaining ?? 0),
    hasGenesisNft,
    genesisNftContract: genesisNftContractEnv(),
  });
}

export async function loadUserHolderPerks(
  db: Db,
  userId: string,
  companyId?: string | null,
): Promise<HolderPerks> {
  let auraBalance = 0;
  let resolvedCompany = companyId ?? null;
  if (!resolvedCompany) {
    const { data: company } = await db
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    resolvedCompany = (company?.id as string | undefined) ?? null;
  }
  if (resolvedCompany) {
    const { data: sub } = await db
      .from("subscriptions")
      .select("tokens_remaining")
      .eq("company_id", resolvedCompany)
      .maybeSingle();
    auraBalance = Number(sub?.tokens_remaining ?? 0);
  }
  const hasGenesisNft = await loadHasGenesisNft(db, { userId, companyId: resolvedCompany });
  return buildHolderPerks({
    auraBalance,
    hasGenesisNft,
    genesisNftContract: genesisNftContractEnv(),
  });
}
