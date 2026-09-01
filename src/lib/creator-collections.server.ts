/**
 * Server-side creator collection deploy on Robinhood Chain.
 */
import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood, robinhoodTestnet } from "viem/chains";

import { alchemyRpcUrl, creatorNetwork, creatorStableAddress } from "@/lib/chain-config";
import {
  CREATOR_FACTORY_ABI,
  creatorFactoryAddress,
  creatorMetadataBaseUri,
  creatorOpsWallet,
  mintAssetToSolidity,
  type CreatorMintAsset,
  type NftCollectionRow,
  slugToHash,
} from "@/lib/creator-contracts";

function deployerKey(): Hex | null {
  const raw = (
    process.env["GENESIS_MINTER_KEY"] ||
    process.env["PRIVATE_SALE_DEPLOYER_KEY"] ||
    process.env["PRIVATE_KEY"] ||
    ""
  ).trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) return null;
  return raw as Hex;
}

function viemChain() {
  return creatorNetwork() === "robinhood-testnet" ? robinhoodTestnet : robinhood;
}

function rpcUrl(): string {
  const url = alchemyRpcUrl({ network: creatorNetwork() });
  if (url) return url;
  return creatorNetwork() === "robinhood-testnet"
    ? "https://testnet-rpc.robinhoodchain.com"
    : "https://rpc.robinhoodchain.com";
}

export function creatorDeployReady(): boolean {
  return Boolean(creatorFactoryAddress() && deployerKey());
}

export async function deployCreatorCollection(row: NftCollectionRow): Promise<{
  contractAddress: Address;
  mintDeskAddress: Address;
  txHash: Hex;
}> {
  const factory = creatorFactoryAddress();
  const key = deployerKey();
  if (!factory || !key) {
    throw new Error("Creator factory or deployer key not configured");
  }

  const payout = (row.payout_wallet?.trim() || "") as Address;
  if (!/^0x[a-fA-F0-9]{40}$/.test(payout)) {
    throw new Error("Creator payout wallet required before deploy");
  }

  const platform = creatorOpsWallet() ?? payout;
  const account = privateKeyToAccount(key);
  const chain = viemChain();
  const transport = http(rpcUrl());
  const publicClient = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ account, chain, transport });

  const baseURI = row.metadata_base_uri || creatorMetadataBaseUri(row.slug);
  const asset = row.mint_asset as CreatorMintAsset;
  const price = BigInt(row.mint_price_wei || "0");

  const hash = await wallet.writeContract({
    address: factory,
    abi: CREATOR_FACTORY_ABI,
    functionName: "createCollection",
    args: [
      {
        name: row.name,
        symbol: row.symbol,
        baseURI,
        maxSupply: BigInt(row.max_supply),
        price,
        asset: mintAssetToSolidity(asset),
        creator: payout,
        royaltyRecipient: payout,
        royaltyBps: row.royalty_bps,
        slugHash: slugToHash(row.slug),
      },
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const logs = parseEventLogs({
    abi: CREATOR_FACTORY_ABI,
    logs: receipt.logs,
    eventName: "CollectionCreated",
  });

  const ev = logs[0];
  if (!ev) {
    throw new Error("Deploy tx succeeded but CollectionCreated event missing");
  }

  return {
    contractAddress: ev.args.collection as Address,
    mintDeskAddress: ev.args.desk as Address,
    txHash: hash,
  };
}

export function creatorStableForNetwork(): Address {
  return creatorStableAddress();
}

const ATLAS_MEMORY =
  "Chief executive. Learns from every approved task. Prefer clear founder direction, compounding channels, and honest metrics over vanity numbers.";

/** Ensure a builders-funnel company exists for the creator hub. */
export async function ensureCreatorCompany(
  supabase: {
    from: (table: string) => any;
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  },
  userId: string,
): Promise<{ id: string; name: string; entry_funnel: string | null } | null> {
  const { data: existing } = await supabase
    .from("companies")
    .select("id, name, entry_funnel")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as { id: string; name: string; entry_funnel: string | null };

  const { data: hasSeat } = await supabase.rpc("user_has_company_seat", { _uid: userId });
  if (!hasSeat) {
    // builders funnel is free-door — allow one company without founding seat
  }

  let seatNumber = 1;
  const { data: taken } = await supabase.rpc("founding_seats_taken");
  if (typeof taken === "number" && Number.isFinite(taken)) {
    seatNumber = Math.max(1, taken + 1);
  }

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      owner_id: userId,
      name: "My collection",
      tagline: null,
      emoji: "◈",
      credits: 0,
      runway_days: 0,
      mrr: 0,
      strategy: null,
      autonomy: 0,
      entry_funnel: "builders",
      ui_locale: "en",
      desk_network: "robinhood",
      trading_paper: true,
      trading_armed: false,
    })
    .select("id, name, entry_funnel")
    .single();

  if (error || !company) {
    const { data: again } = await supabase
      .from("companies")
      .select("id, name, entry_funnel")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return again as { id: string; name: string; entry_funnel: string | null } | null;
  }

  const cid = (company as { id: string }).id;
  await Promise.all([
    supabase.from("agents").insert({
      company_id: cid,
      name: "Atlas",
      role: "Chief Executive",
      avatar: "◎",
      accent: "cyan",
      status: "active",
      current_task: "Waiting for founder direction",
      health: 100,
      performance: 0,
      activity: 0,
      revenue_generated: 0,
      credits_used: 0,
      tasks_completed: 0,
      lessons_count: 0,
      memory: ATLAS_MEMORY,
    }),
    supabase.from("founder_progress").insert({
      company_id: cid,
      xp: 0,
      level: 1,
      streak_days: 0,
      seat_number: seatNumber,
      onboarded: false,
      completed_quests: [],
    }),
    supabase.from("activity_events").insert({
      company_id: cid,
      kind: "system",
      message: "Creator studio ready — deploy your first collection on Robinhood Chain.",
    }),
  ]);

  return company as { id: string; name: string; entry_funnel: string | null };
}
