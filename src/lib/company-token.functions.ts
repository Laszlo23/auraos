import { createServerFn } from "@tanstack/react-start";
import type { Address, Hex } from "viem";
import { formatEther } from "viem";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildClankerSpec,
  clankerChainId,
  clankerEnabled,
  clankerPlatformFeeBps,
  deployCompanyTokenClanker,
  fetchEthBalance,
  platformTreasuryAddress,
} from "@/lib/clanker.server";
import {
  COMPANY_TOKEN_PRESETS,
  companyTokenPresetById,
  suggestTicker,
  type CompanyTokenPresetId,
} from "@/lib/company-token-presets";
import { decryptOwnerKey } from "@/lib/wallet.server";

type Db = { from: (t: string) => any; rpc: (fn: string, args?: object) => any };

async function ownedCompany(supabase: Db, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name, emoji")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as { id: string; name: string; emoji: string | null } | null;
}

async function requireSeat(supabase: Db, userId: string) {
  const { data: hasSeat } = await supabase.rpc("user_has_company_seat", { _uid: userId });
  if (!hasSeat) {
    // Legacy: existing company owners can still draft (not deploy live without seat when CLANKER strict)
    const company = await ownedCompany(supabase, userId);
    if (!company) throw new Error("Buy a founding seat before launching a company token");
  }
}

async function smartWalletRow(supabase: Db, userId: string) {
  const { data: byUser } = await supabase
    .from("wallet_bindings")
    .select("id, address, owner_key_enc, owner_address")
    .eq("user_id", userId)
    .eq("kind", "smart")
    .maybeSingle();
  if (byUser?.address) {
    return byUser as {
      id: string;
      address: string;
      owner_key_enc: string | null;
      owner_address: string | null;
    };
  }

  const { data: handle } = await supabase
    .from("handles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!handle?.id) return null;

  const { data: byHandle } = await supabase
    .from("wallet_bindings")
    .select("id, address, owner_key_enc, owner_address")
    .eq("handle_id", handle.id)
    .eq("kind", "smart")
    .maybeSingle();
  return (
    (byHandle as {
      id: string;
      address: string;
      owner_key_enc: string | null;
      owner_address: string | null;
    } | null) ?? null
  );
}

function normalizeSymbol(raw: string): string {
  const s = raw
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);
  if (s.length < 2) throw new Error("Symbol must be at least 2 characters");
  return s;
}

function normalizeName(raw: string): string {
  const n = raw.trim().slice(0, 64);
  if (n.length < 2) throw new Error("Name must be at least 2 characters");
  return n;
}

export const listCompanyTokenPresets = createServerFn({ method: "GET" }).handler(async () => {
  return COMPANY_TOKEN_PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    vaultPct: p.vaultPct,
    lockupDays: p.lockupDays,
    vestingDays: p.vestingDays,
    devBuyEth: p.devBuyEth,
    vanity: p.vanity,
    feePreset: p.feePreset,
  }));
});

export const getCompanyTokenLaunch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const company = await ownedCompany(context.supabase, context.userId);
    if (!company) {
      return {
        companyId: null as string | null,
        launch: null,
        suggested: { name: "Company", symbol: "COIN" },
        clankerEnabled: clankerEnabled(),
        platformFeeBps: clankerPlatformFeeBps(),
        chainId: clankerChainId(),
        hasWallet: false,
        ethBalanceEth: null as string | null,
        hasSeat: false,
      };
    }

    const { data: hasSeat } = await context.supabase.rpc("user_has_company_seat", {
      _uid: context.userId,
    });
    const wallet = await smartWalletRow(context.supabase, context.userId);

    const { data: launch } = await context.supabase
      .from("company_token_launches")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let ethBalanceEth: string | null = null;
    if (wallet?.owner_address || wallet?.address) {
      try {
        // Prefer owner EOA balance (pays gas); fall back to smart wallet
        const addr = (wallet.owner_address || wallet.address) as Address;
        const wei = await fetchEthBalance(addr);
        ethBalanceEth = formatEther(wei);
      } catch {
        ethBalanceEth = null;
      }
    }

    return {
      companyId: company.id,
      launch: launch ?? null,
      suggested: suggestTicker(company.name),
      clankerEnabled: clankerEnabled(),
      platformFeeBps: clankerPlatformFeeBps(),
      chainId: clankerChainId(),
      hasWallet: Boolean(wallet?.address),
      walletAddress: wallet?.address ?? null,
      ethBalanceEth,
      hasSeat: Boolean(hasSeat),
      presets: COMPANY_TOKEN_PRESETS,
    };
  });

export const draftCompanyToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { name: string; symbol: string; imageUrl?: string; presetId?: string }) => {
    if (!input?.name || !input?.symbol) throw new Error("name and symbol required");
    return {
      name: normalizeName(input.name),
      symbol: normalizeSymbol(input.symbol),
      imageUrl: input.imageUrl?.trim() || null,
      presetId: (input.presetId || "community_standard") as CompanyTokenPresetId,
    };
  })
  .handler(async ({ data, context }) => {
    await requireSeat(context.supabase, context.userId);
    const company = await ownedCompany(context.supabase, context.userId);
    if (!company) throw new Error("Create a company first");

    if (!companyTokenPresetById(data.presetId)) throw new Error("Unknown preset");

    const { data: live } = await context.supabase
      .from("company_token_launches")
      .select("id")
      .eq("company_id", company.id)
      .eq("status", "live")
      .maybeSingle();
    if (live) throw new Error("This company already has a live token");

    const wallet = await smartWalletRow(context.supabase, context.userId);
    const smart = (wallet?.address || "0x0000000000000000000000000000000000000001") as Address;
    const ownerEoa = (wallet?.owner_address || smart) as Address;
    const spec = buildClankerSpec({
      name: data.name,
      symbol: data.symbol,
      imageUrl: data.imageUrl,
      presetId: data.presetId,
      smartWallet: smart,
      ownerEoa,
    });

    const { data: existing } = await context.supabase
      .from("company_token_launches")
      .select("id, status")
      .eq("company_id", company.id)
      .in("status", ["draft", "ready", "failed", "deploying"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing?.id && existing.status !== "deploying") {
      const { data: updated, error } = await context.supabase
        .from("company_token_launches")
        .update({
          name: data.name,
          symbol: data.symbol,
          image_url: data.imageUrl,
          preset_id: data.presetId,
          chain_id: clankerChainId(),
          status: "draft",
          spec,
          error: null,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return { launch: updated };
    }

    const { data: created, error } = await context.supabase
      .from("company_token_launches")
      .insert({
        company_id: company.id,
        name: data.name,
        symbol: data.symbol,
        image_url: data.imageUrl,
        preset_id: data.presetId,
        chain_id: clankerChainId(),
        status: "draft",
        spec,
      })
      .select("*")
      .single();
    if (error) throw error;
    return { launch: created };
  });

export const markCompanyTokenReady = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { launchId: string }) => {
    if (!input?.launchId) throw new Error("launchId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId);
    if (!company) throw new Error("Company not found");

    const { data: row, error } = await context.supabase
      .from("company_token_launches")
      .select("*")
      .eq("id", data.launchId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Launch not found");
    if (!["draft", "failed", "ready"].includes(row.status)) {
      throw new Error(`Cannot preview from status ${row.status}`);
    }

    const wallet = await smartWalletRow(context.supabase, context.userId);
    if (!wallet?.address) throw new Error("Provision a smart wallet before preview");

    const spec = buildClankerSpec({
      name: row.name,
      symbol: row.symbol,
      imageUrl: row.image_url,
      presetId: row.preset_id,
      smartWallet: wallet.address as Address,
      ownerEoa: (wallet.owner_address || wallet.address) as Address,
    });

    const { data: updated, error: upErr } = await context.supabase
      .from("company_token_launches")
      .update({
        status: "ready",
        spec,
        token_admin: wallet.address,
        reward_recipient: wallet.address,
        updated_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (upErr) throw upErr;

    return {
      launch: updated,
      preview: {
        ...spec,
        clankerEnabled: clankerEnabled(),
        platformTreasury: platformTreasuryAddress(),
        honesty:
          "Utility / community token for your company OS — not an investment product. Not the platform AURA launch.",
      },
    };
  });

export const deployCompanyToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { launchId: string; confirm: boolean }) => {
    if (!input?.launchId) throw new Error("launchId required");
    if (!input.confirm) throw new Error("Confirm deploy explicitly");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!clankerEnabled()) {
      throw new Error("Live deploy is off — set CLANKER_ENABLED=true on the server");
    }

    const { data: hasSeat } = await context.supabase.rpc("user_has_company_seat", {
      _uid: context.userId,
    });
    if (!hasSeat) throw new Error("Founding seat required for live token deploy");

    const company = await ownedCompany(context.supabase, context.userId);
    if (!company) throw new Error("Company not found");

    const { data: live } = await context.supabase
      .from("company_token_launches")
      .select("id")
      .eq("company_id", company.id)
      .eq("status", "live")
      .maybeSingle();
    if (live) throw new Error("Already live");

    const { data: row } = await context.supabase
      .from("company_token_launches")
      .select("*")
      .eq("id", data.launchId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (!row) throw new Error("Launch not found");
    if (row.status !== "ready" && row.status !== "failed") {
      throw new Error("Mark the launch Ready (preview) before deploying");
    }

    const wallet = await smartWalletRow(context.supabase, context.userId);
    if (!wallet?.address || !wallet.owner_key_enc) {
      throw new Error("Smart wallet with encrypted owner key required");
    }

    await context.supabase
      .from("company_token_launches")
      .update({ status: "deploying", error: null, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    try {
      const pk = decryptOwnerKey(wallet.owner_key_enc) as Hex;
      const result = await deployCompanyTokenClanker({
        name: row.name,
        symbol: row.symbol,
        imageUrl: row.image_url,
        presetId: row.preset_id as CompanyTokenPresetId,
        smartWallet: wallet.address as Address,
        ownerPrivateKey: pk,
      });

      const now = new Date().toISOString();
      const { data: updated, error } = await context.supabase
        .from("company_token_launches")
        .update({
          status: "live",
          token_address: result.tokenAddress,
          clanker_tx_hash: result.txHash,
          pool_tx_hash: result.txHash,
          token_admin: result.tokenAdmin,
          reward_recipient: result.rewardRecipient,
          chain_id: result.chainId,
          spec: result.spec,
          deployed_at: now,
          updated_at: now,
          error: null,
        })
        .eq("id", row.id)
        .select("*")
        .single();
      if (error) throw error;

      await context.supabase.from("activity_events").insert({
        company_id: company.id,
        kind: "token_launch",
        message: `Company token ${row.symbol} live on Base — ${result.tokenAddress.slice(0, 10)}…`,
      });

      await context.supabase.from("knowledge_items").insert({
        company_id: company.id,
        title: `Token ${row.symbol} launched`,
        summary: `Clanker deploy on Base. CA ${result.tokenAddress}. Utility/community token — not compute AURA, not platform fair launch.`,
        cluster: "Trading",
        source: "Iris",
      });

      return { launch: updated };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await context.supabase
        .from("company_token_launches")
        .update({
          status: "failed",
          error: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      throw new Error(msg);
    }
  });

/** Public helper for company passport badge. */
export async function getLiveCompanyToken(
  supabase: Db,
  companyId: string,
): Promise<{
  symbol: string;
  name: string;
  tokenAddress: string;
  chainId: number;
  txHash: string | null;
} | null> {
  const { data } = await supabase
    .from("company_token_launches")
    .select("symbol, name, token_address, chain_id, clanker_tx_hash")
    .eq("company_id", companyId)
    .eq("status", "live")
    .maybeSingle();
  if (!data?.token_address) return null;
  return {
    symbol: data.symbol as string,
    name: data.name as string,
    tokenAddress: data.token_address as string,
    chainId: Number(data.chain_id) || 8453,
    txHash: (data.clanker_tx_hash as string) || null,
  };
}
