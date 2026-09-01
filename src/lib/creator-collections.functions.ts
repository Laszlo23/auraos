import { createServerFn } from "@tanstack/react-start";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  collectionMintUrl,
  creatorChainId,
  creatorFactoryAddress,
  creatorMetadataBaseUri,
  normalizeCollectionSlug,
  normalizeCollectionSymbol,
  parseMintPriceToWei,
  type CreatorMintAsset,
  type NftCollectionRow,
} from "@/lib/creator-contracts";
import {
  creatorDeployReady,
  deployCreatorCollection,
  ensureCreatorCompany,
} from "@/lib/creator-collections.server";

async function ownedCompany(supabase: any, userId: string) {
  return ensureCreatorCompany(supabase, userId);
}

const FREE_TIER_MAX_SUPPLY = 100;

export const listMyCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const company = await ownedCompany(context.supabase, context.userId);
    if (!company)
      return { collections: [] as NftCollectionRow[], deployReady: creatorDeployReady() };

    const { data } = await context.supabase
      .from("nft_collections")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });

    return {
      companyId: company.id,
      collections: (data ?? []) as NftCollectionRow[],
      deployReady: creatorDeployReady(),
      factoryAddress: creatorFactoryAddress(),
      chainId: creatorChainId(),
    };
  });

export const getPublicCollection = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const slug = normalizeCollectionSlug(data.slug);
    const { data: row } = await supabaseAdmin
      .from("nft_collections")
      .select("*")
      .eq("slug", slug)
      .in("status", ["live", "paused", "sold_out"])
      .maybeSingle();

    if (!row) return { collection: null };
    return {
      collection: {
        ...(row as NftCollectionRow),
        mintUrl: collectionMintUrl(slug),
      },
    };
  });

export const createCollectionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      name: string;
      symbol: string;
      slug: string;
      description?: string;
      maxSupply: number;
      mintPrice: number;
      mintAsset: CreatorMintAsset;
      royaltyBps?: number;
      payoutWallet?: string;
      coverImageUrl?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId);
    if (!company) throw new Error("Could not open your creator studio — try again");

    const slug = normalizeCollectionSlug(data.slug);
    const symbol = normalizeCollectionSymbol(data.symbol);
    const name = data.name.trim().slice(0, 64);
    if (name.length < 2) throw new Error("Name must be at least 2 characters");

    const { data: hasSeat } = await context.supabase.rpc("user_has_company_seat", {
      _uid: context.userId,
    });
    const maxSupply = Math.min(Math.max(Math.floor(data.maxSupply), 1), 10_000);
    if (!hasSeat && maxSupply > FREE_TIER_MAX_SUPPLY) {
      throw new Error(
        `Free creator tier supports up to ${FREE_TIER_MAX_SUPPLY} supply. Buy a founding seat for larger collections.`,
      );
    }

    const { count } = await context.supabase
      .from("nft_collections")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);

    if (!hasSeat && (count ?? 0) >= 1) {
      throw new Error("Free creator tier allows one collection. Upgrade for more.");
    }

    const mintAsset = data.mintAsset === "eth" ? "eth" : "usdg";
    const mintPriceWei = parseMintPriceToWei(data.mintPrice, mintAsset).toString();

    const { data: row, error } = await context.supabase
      .from("nft_collections")
      .insert({
        company_id: company.id,
        slug,
        name,
        symbol,
        description: data.description?.trim() || null,
        chain_id: creatorChainId(),
        max_supply: maxSupply,
        mint_price_wei: mintPriceWei,
        mint_asset: mintAsset,
        royalty_bps: Math.min(Math.max(data.royaltyBps ?? 500, 0), 1000),
        payout_wallet: data.payoutWallet?.trim() || null,
        cover_image_url: data.coverImageUrl?.trim() || null,
        metadata_base_uri: creatorMetadataBaseUri(slug),
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      if (/unique|duplicate/i.test(error.message)) {
        throw new Error("That mint page slug is already taken");
      }
      throw error;
    }

    return { collection: row as NftCollectionRow };
  });

export const publishCreatorCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { collectionId: string }) => d)
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId);
    if (!company) throw new Error("No company");

    const { data: row } = await context.supabase
      .from("nft_collections")
      .select("*")
      .eq("id", data.collectionId)
      .eq("company_id", company.id)
      .maybeSingle();

    if (!row) throw new Error("Collection not found");
    const collection = row as NftCollectionRow;
    if (collection.status !== "draft" && collection.status !== "failed") {
      throw new Error("Collection already published or deploying");
    }
    if (!collection.payout_wallet) {
      throw new Error("Set a payout wallet before publishing");
    }

    await context.supabase
      .from("nft_collections")
      .update({ status: "deploying", error: null, updated_at: new Date().toISOString() })
      .eq("id", collection.id);

    try {
      const deployed = await deployCreatorCollection(collection);
      const { data: updated } = await context.supabase
        .from("nft_collections")
        .update({
          status: "live",
          contract_address: deployed.contractAddress,
          mint_desk_address: deployed.mintDeskAddress,
          deploy_tx_hash: deployed.txHash,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", collection.id)
        .select("*")
        .single();

      return {
        collection: updated as NftCollectionRow,
        mintUrl: collectionMintUrl(collection.slug),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deploy failed";
      await context.supabase
        .from("nft_collections")
        .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
        .eq("id", collection.id);
      throw new Error(message);
    }
  });

export const recordCollectionMint = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      slug: string;
      tokenId: number;
      minterWallet: string;
      txHash: string;
      pricePaidWei?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const slug = normalizeCollectionSlug(data.slug);
    const { data: collection } = await supabaseAdmin
      .from("nft_collections")
      .select("id, max_supply, status")
      .eq("slug", slug)
      .eq("status", "live")
      .maybeSingle();

    if (!collection) throw new Error("Collection not found");

    await supabaseAdmin.from("nft_collection_mints").upsert(
      {
        collection_id: collection.id,
        token_id: data.tokenId,
        minter_wallet: data.minterWallet.toLowerCase(),
        tx_hash: data.txHash,
        price_paid_wei: data.pricePaidWei ?? null,
      },
      { onConflict: "collection_id,token_id" },
    );

    const { count } = await supabaseAdmin
      .from("nft_collection_mints")
      .select("id", { count: "exact", head: true })
      .eq("collection_id", collection.id);

    if ((count ?? 0) >= collection.max_supply) {
      await supabaseAdmin
        .from("nft_collections")
        .update({ status: "sold_out", updated_at: new Date().toISOString() })
        .eq("id", collection.id);
    }

    return { ok: true };
  });
