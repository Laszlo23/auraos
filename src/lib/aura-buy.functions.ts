import { createServerFn } from "@tanstack/react-start";
import type { Hex } from "viem";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  centsToUsd,
  stripeCardFeeCentsEstimate,
  stripeNetCents,
  toAuraBuyPublicReceipt,
  usdcUnitsFromNetCents,
} from "@/lib/aura-buy-lp";
import {
  INVESTOR_COMPANY_NAME,
  INVESTOR_DESK_REQUIRES_FOUNDING_SEAT,
  investorHandleForUser,
  isAuraBuyPackId,
  parseAuraBuyUsd,
} from "@/lib/aura-buy-guide";
import { gasSponsorshipEnabled } from "@/lib/chain-config";
import { isBaseAddress } from "@/lib/private-sale";

type LooseDb = { from: (table: string) => any };

export type InvestorDesk = {
  companyId: string;
  handleId: string;
  handle: string;
  wallet: string | null;
  deployed: boolean;
  createdCompany: boolean;
  createdHandle: boolean;
  requiresFoundingSeat: boolean;
};

export type AuraBuyOrderRow = {
  id: string;
  user_id: string;
  company_id: string | null;
  wallet: string;
  pack: string;
  amount_usd: number;
  net_usd: number | null;
  stripe_session: string;
  status: "paid" | "sent" | "failed";
  lp_status: "reserved" | "usdc_onchain" | "swapped" | "sent";
  tx_hash: string | null;
  swap_tx_hash: string | null;
  created_at: string;
  updated_at: string;
};

const AURA_BUY_ORDER_COLUMNS =
  "id, user_id, company_id, wallet, pack, amount_usd, net_usd, stripe_session, status, lp_status, tx_hash, swap_tx_hash, created_at, updated_at";

async function getSupabaseAdmin(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseDb;
}

async function deskAuth() {
  return import("@/lib/desk-auth.server");
}

function mergeDeployedChains(
  existing: unknown,
  network: string,
  deployed: boolean,
): Record<string, boolean> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, boolean>) }
      : {};
  base[network] = deployed;
  return base;
}

async function uniqueInvestorHandle(db: LooseDb, userId: string): Promise<string> {
  const seed = investorHandleForUser(userId);
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? seed : `${seed}${i + 1}`;
    const { data } = await db.from("handles").select("id").eq("handle", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${seed}${Date.now().toString(36).slice(-4)}`;
}

async function provisionInvestorWallet(opts: {
  db: LooseDb;
  userId: string;
  handleId: string;
  network: string;
}): Promise<{ address: string; deployed: boolean }> {
  const {
    mintOwnerPrivateKey,
    encryptOwnerKey,
    decryptOwnerKey,
    ownerFromPrivateKey,
    predictAddress,
    isDeployed,
    deploySmartAccount,
  } = await import("@/lib/wallet.server");

  const { data: existing } = await opts.db
    .from("wallet_bindings")
    .select("id, address, owner_key_enc, deployed, deployed_chains")
    .eq("handle_id", opts.handleId)
    .eq("kind", "smart")
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (existing?.owner_key_enc && existing.address) {
    const pk = decryptOwnerKey(existing.owner_key_enc) as Hex;
    const owner = ownerFromPrivateKey(pk);
    const address = predictAddress(owner.address, opts.network);
    let deployed = await isDeployed(address, opts.network);
    if (!deployed && gasSponsorshipEnabled(opts.network)) {
      const result = await deploySmartAccount(pk, opts.network);
      deployed = result.deployed;
    }
    const deployedChains = mergeDeployedChains(existing.deployed_chains, opts.network, deployed);
    await opts.db
      .from("wallet_bindings")
      .update({
        address,
        deployed,
        deployed_chains: deployedChains,
        owner_address: owner.address,
        chain: opts.network,
        custody: "account_kit",
        provider: "alchemy",
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return { address, deployed };
  }

  if (!process.env["APP_USER_CONNECTION_KEY_SECRET"]) {
    throw new Error("APP_USER_CONNECTION_KEY_SECRET is required to provision smart wallets.");
  }

  const pk = mintOwnerPrivateKey();
  const owner = ownerFromPrivateKey(pk);
  const address = predictAddress(owner.address, opts.network);
  const enc = encryptOwnerKey(pk);
  let deployed = await isDeployed(address, opts.network);
  if (!deployed && gasSponsorshipEnabled(opts.network)) {
    const result = await deploySmartAccount(pk, opts.network);
    deployed = result.deployed;
  }
  const deployedChains = mergeDeployedChains(null, opts.network, deployed);
  const { error } = await opts.db.from("wallet_bindings").insert({
    user_id: opts.userId,
    handle_id: opts.handleId,
    slot: 1,
    role: "treasury",
    chain: opts.network,
    address,
    kind: "smart",
    provider: "alchemy",
    owner_address: owner.address,
    owner_key_enc: enc,
    deployed,
    deployed_chains: deployedChains,
    custody: "account_kit",
    legacy: false,
    label: "Aura Smart Wallet",
    verified: true,
    verified_at: new Date().toISOString(),
  });
  if (error) throw error;
  return { address, deployed };
}

/**
 * Minimal investor desk: company + handle + Alchemy Light Account.
 * Admin insert — no founding seat, no business brief, no Atlas bootstrap.
 */
export const ensureInvestorDesk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InvestorDesk> => {
    if (INVESTOR_DESK_REQUIRES_FOUNDING_SEAT) {
      throw new Error("Investor desk must not require a founding seat.");
    }

    const db = await getSupabaseAdmin();
    const userId = context.userId;

    const { data: existingCompany } = await db
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let companyId = existingCompany?.id as string | undefined;
    let createdCompany = false;
    if (!companyId) {
      const { data: company, error } = await db
        .from("companies")
        .insert({
          owner_id: userId,
          name: INVESTOR_COMPANY_NAME,
          tagline: null,
          emoji: "◎",
          credits: 0,
          runway_days: 0,
          mrr: 0,
          strategy: null,
          autonomy: 0,
          entry_funnel: "os",
          trading_paper: true,
          trading_armed: false,
        })
        .select("id")
        .single();
      if (error || !company?.id) {
        throw new Error(error?.message ?? "Could not open an investor desk.");
      }
      companyId = company.id;
      createdCompany = true;
    }

    const { data: existingHandle } = await db
      .from("handles")
      .select("id, handle")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let handleId = existingHandle?.id as string | undefined;
    let handle = existingHandle?.handle as string | undefined;
    let createdHandle = false;
    if (!handleId) {
      handle = await uniqueInvestorHandle(db, userId);
      const { data: row, error } = await db
        .from("handles")
        .insert({
          user_id: userId,
          company_id: companyId,
          handle,
          display_name: "AURA",
          avatar: "◎",
          is_public: false,
        })
        .select("id, handle")
        .single();
      if (error || !row?.id) {
        throw new Error(error?.message ?? "Could not claim an investor handle.");
      }
      handleId = row.id;
      handle = row.handle;
      createdHandle = true;
    } else if (companyId && existingHandle) {
      await db.from("handles").update({ company_id: companyId }).eq("id", handleId).is("company_id", null);
    }

    const wallet = await provisionInvestorWallet({
      db,
      userId,
      handleId: handleId!,
      network: "base",
    });

    await db
      .from("subscriptions")
      .update({ wallet_address: wallet.address })
      .eq("company_id", companyId);

    return {
      companyId: companyId!,
      handleId: handleId!,
      handle: handle!,
      wallet: wallet.address,
      deployed: wallet.deployed,
      createdCompany,
      createdHandle,
      requiresFoundingSeat: INVESTOR_DESK_REQUIRES_FOUNDING_SEAT,
    };
  });

export const listMyAuraBuyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ orders: AuraBuyOrderRow[] }> => {
    const db = await getSupabaseAdmin();
    const { data, error } = await db
      .from("aura_buy_orders")
      .select(AURA_BUY_ORDER_COLUMNS)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
        return { orders: [] };
      }
      throw error;
    }
    return { orders: (data ?? []) as AuraBuyOrderRow[] };
  });

export const listAuraBuyOrders = createServerFn({ method: "POST" })
  .validator((input: { token?: string }) => ({
    token:
      String(input?.token || "")
        .trim()
        .slice(0, 500) || null,
  }))
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    const { isPrivateSaleSender } = await import("@/lib/private-sale");
    const session = requireDeskAuth(data.token);
    const db = await getSupabaseAdmin();
    const { data: rows, error } = await db
      .from("aura_buy_orders")
      .select(AURA_BUY_ORDER_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) {
      if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
        throw new Error("AURA card-order table missing — apply the latest migration.");
      }
      throw error;
    }
    return {
      orders: (rows ?? []) as AuraBuyOrderRow[],
      canMarkSent: isPrivateSaleSender(session.displayName),
    };
  });

export const markAuraBuySent = createServerFn({ method: "POST" })
  .validator((input: { token?: string; orderId: string; txHash: string }) => ({
    token:
      String(input?.token || "")
        .trim()
        .slice(0, 500) || null,
    orderId: String(input.orderId || "").trim(),
    txHash: String(input.txHash || "").trim(),
  }))
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    const { isPrivateSaleSender } = await import("@/lib/private-sale");
    const session = requireDeskAuth(data.token);
    if (!isPrivateSaleSender(session.displayName)) {
      throw new Error("Only Laszlo can mark AURA card orders as sent.");
    }
    if (!data.orderId) throw new Error("Order required");
    if (!/^0x[0-9a-fA-F]{64}$/.test(data.txHash)) {
      throw new Error("Valid Base transaction hash required");
    }

    const db = await getSupabaseAdmin();
    const { data: row, error } = await db
      .from("aura_buy_orders")
      .select("id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !row) throw new Error("Order not found");
    if (row.status !== "paid") throw new Error("Order is not waiting to be sent");

    const { error: updateError } = await db
      .from("aura_buy_orders")
      .update({
        status: "sent",
        lp_status: "sent",
        tx_hash: data.txHash,
        swap_tx_hash: data.txHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.orderId)
      .eq("status", "paid");
    if (updateError) throw updateError;

    await db.from("team_desk_events").insert({
      closer: session.displayName,
      kind: "aura_buy_sent",
      message: `${session.displayName} marked AURA card order sent · ${data.orderId}`,
      metadata: { order_id: data.orderId, tx_hash: data.txHash },
    });

    return { ok: true, txHash: data.txHash };
  });

/** Smart wallet for a paid card pack when Payment Link metadata omitted it. */
export async function resolveAuraBuyWalletForUser(
  userId: string,
  hinted?: string | null,
): Promise<string | null> {
  if (hinted && isBaseAddress(hinted)) return hinted;
  const db = await getSupabaseAdmin();
  const { data } = await db
    .from("wallet_bindings")
    .select("address")
    .eq("user_id", userId)
    .eq("kind", "smart")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const address = typeof data?.address === "string" ? data.address : "";
  return isBaseAddress(address) ? address : null;
}

export async function recordAuraBuyOrderFromStripe(opts: {
  userId: string;
  companyId?: string | null;
  wallet: string;
  pack: string;
  amountUsd: number;
  stripeSession: string;
  amountCents?: number;
  feeCents?: number;
  netCents?: number;
  feeEstimated?: boolean;
  paymentIntent?: string | null;
  fundsAvailable?: boolean;
}): Promise<{ inserted: boolean }> {
  if (!opts.userId || !opts.stripeSession) {
    throw new Error("Missing user or Stripe session");
  }
  if (!isAuraBuyPackId(opts.pack)) {
    throw new Error("Unknown AURA buy pack");
  }
  const amountUsd = parseAuraBuyUsd(opts.amountUsd) ?? parseAuraBuyUsd(opts.pack);
  if (amountUsd == null) {
    throw new Error("AURA buy amount out of range");
  }
  if (!isBaseAddress(opts.wallet)) {
    throw new Error("Valid Base wallet required");
  }
  const db = await getSupabaseAdmin();
  const { data: existing } = await db
    .from("aura_buy_orders")
    .select("id")
    .eq("stripe_session", opts.stripeSession)
    .maybeSingle();
  if (existing?.id) return { inserted: false };

  const amountCents = opts.amountCents ?? Math.round(amountUsd * 100);
  const feeCents = opts.feeCents ?? stripeCardFeeCentsEstimate(amountCents);
  const netCents = opts.netCents ?? stripeNetCents(amountCents, feeCents);

  const { error } = await db.from("aura_buy_orders").insert({
    user_id: opts.userId,
    company_id: opts.companyId || null,
    wallet: opts.wallet,
    pack: opts.pack,
    amount_usd: amountUsd,
    amount_cents: amountCents,
    fee_cents: feeCents,
    net_usd: centsToUsd(netCents),
    fee_usd: centsToUsd(feeCents),
    fee_estimated: opts.feeEstimated ?? opts.feeCents == null,
    usdc_units: usdcUnitsFromNetCents(netCents).toString(),
    payment_intent: opts.paymentIntent || null,
    funds_available: Boolean(opts.fundsAvailable),
    stripe_session: opts.stripeSession,
    status: "paid",
    lp_status: "reserved",
  });
  if (error) {
    if (error.code === "23505") return { inserted: false };
    throw error;
  }
  return { inserted: true };
}

export async function listAuraBuyPublicReceipts(limit = 40) {
  const db = await getSupabaseAdmin();
  const { data, error } = await db
    .from("aura_buy_orders")
    .select(
      "id, pack, amount_usd, net_usd, wallet, usdc_tx_hash, swap_tx_hash, tx_hash, created_at, lp_status",
    )
    .eq("lp_status", "sent")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.message?.includes("does not exist") || error.message?.includes("column")) {
      return [];
    }
    throw error;
  }
  return (data ?? [])
    .map((row) => toAuraBuyPublicReceipt(row as never))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}
