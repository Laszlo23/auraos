import { createServerFn } from "@tanstack/react-start";
import type { Address } from "viem";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  explorerTokenUrl,
  explorerTxUrl,
  genesisContractAddress,
  genesisMaxSupply,
  genesisPriceUsdc,
  mintGenesisToWallet,
  walletOwnsGenesis,
} from "@/lib/genesis.server";
import { SITE_URL } from "@/lib/site";

export type GenesisPurchaseStatus = {
  status: "none" | "pending" | "paid" | "minted" | "failed";
  wallet: string | null;
  tokenId: number | null;
  txHash: string | null;
  explorerTx: string | null;
  explorerToken: string | null;
  contract: string | null;
  priceUsdc: number;
  maxSupply: number;
  ownsOnchain: boolean;
  canCheckout: boolean;
  canClaim: boolean;
  mintConfigured: boolean;
  stripeConfigured: boolean;
  error: string | null;
};

async function ownedCompany(supabase: { from: (t: string) => any }, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as { id: string; name: string } | null;
}

async function founderWallet(supabase: { from: (t: string) => any }, userId: string) {
  const { data: handle } = await supabase
    .from("handles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!handle?.id) return null;
  const { data: wallet } = await supabase
    .from("wallet_bindings")
    .select("address")
    .eq("handle_id", handle.id)
    .eq("kind", "smart")
    .maybeSingle();
  return (wallet?.address as string | null) ?? null;
}

export const getGenesisStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GenesisPurchaseStatus> => {
    const supabase = context.supabase;
    const { data: hasSeat } = await supabase.rpc("user_has_company_seat", {
      _uid: context.userId,
    });
    const { data: row } = await supabase
      .from("genesis_purchases")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    const wallet = row?.wallet || (await founderWallet(supabase, context.userId));
    const ownsOnchain = wallet ? await walletOwnsGenesis(wallet) : false;
    const contract = genesisContractAddress();
    const mintConfigured = Boolean(
      contract && process.env["GENESIS_MINTER_KEY"]?.trim()?.match(/^0x[0-9a-fA-F]{64}$/),
    );
    const stripeConfigured = Boolean(process.env["STRIPE_PRICE_GENESIS_NFT"]?.trim());

    let status: GenesisPurchaseStatus["status"] = "none";
    if (row?.status === "pending") status = "pending";
    else if (row?.status === "paid") status = "paid";
    else if (row?.status === "minted" || ownsOnchain) status = "minted";
    else if (row?.status === "failed") status = "failed";

    const tokenId = row?.token_id ?? null;
    const txHash = row?.tx_hash ?? null;

    return {
      status,
      wallet: wallet ?? null,
      tokenId,
      txHash,
      explorerTx: txHash ? explorerTxUrl(txHash) : null,
      explorerToken: tokenId != null ? explorerTokenUrl(tokenId) : null,
      contract,
      priceUsdc: genesisPriceUsdc(),
      maxSupply: genesisMaxSupply(),
      ownsOnchain,
      canCheckout: Boolean(hasSeat) && status !== "minted" && status !== "paid",
      canClaim: status === "paid" && Boolean(wallet) && mintConfigured,
      mintConfigured,
      stripeConfigured,
      error: row?.error ?? null,
    };
  });

export const createGenesisCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const secret = process.env["STRIPE_SECRET_KEY"];
    const priceId = process.env["STRIPE_PRICE_GENESIS_NFT"]?.trim();
    if (!secret || !priceId) {
      throw new Error("Genesis NFT Stripe checkout is not configured (STRIPE_PRICE_GENESIS_NFT).");
    }

    const { data: hasSeat } = await context.supabase.rpc("user_has_company_seat", {
      _uid: context.userId,
    });
    if (!hasSeat) throw new Error("A founding seat is required before buying the Genesis Passport.");

    const company = await ownedCompany(context.supabase, context.userId);
    const wallet = await founderWallet(context.supabase, context.userId);

    const { data: existing } = await context.supabase
      .from("genesis_purchases")
      .select("status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing?.status === "minted" || existing?.status === "paid") {
      throw new Error("You already purchased the Genesis Passport.");
    }

    const priceUsdc = genesisPriceUsdc();
    const amountCents = Math.round(priceUsdc * 100);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("genesis_purchases").upsert(
      {
        user_id: context.userId,
        company_id: company?.id ?? null,
        wallet,
        status: "pending",
        amount_cents: amountCents,
        amount_usdc: priceUsdc,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    const {
      data: { user },
    } = await context.supabase.auth.getUser();
    const site = process.env["SITE_URL"] || SITE_URL;
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${site}/wallet?genesis=success`);
    params.set("cancel_url", `${site}/wallet?genesis=cancel`);
    params.set("client_reference_id", context.userId);
    params.set("metadata[kind]", "genesis_nft");
    params.set("metadata[user_id]", context.userId);
    if (company?.id) params.set("metadata[company_id]", company.id);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    if (user?.email) params.set("customer_email", user.email);
    params.set("payment_method_types[0]", "card");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = (await stripeRes.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };
    if (!stripeRes.ok || !session.url || !session.id) {
      throw new Error(session.error?.message || "Could not create Genesis checkout");
    }

    await supabaseAdmin
      .from("genesis_purchases")
      .update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);

    return { url: session.url, id: session.id };
  });

/** Mark purchase paid after a settled x402 genesis-passport call for this company. */
export const markGenesisPaidFromX402 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { paymentId?: string }) => ({
    paymentId: input?.paymentId ? String(input.paymentId).slice(0, 128) : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { data: hasSeat } = await context.supabase.rpc("user_has_company_seat", {
      _uid: context.userId,
    });
    if (!hasSeat) throw new Error("Founding seat required.");

    const company = await ownedCompany(context.supabase, context.userId);
    if (!company) throw new Error("Create your company first.");

    const wallet = await founderWallet(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("genesis_purchases")
      .select("status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing?.status === "minted") return { status: "minted" as const };
    if (existing?.status === "paid") return { status: "paid" as const };

    let call:
      | {
          id: string;
          status: string;
          tx_hash: string | null;
          amount_usdc: number;
          company_id: string | null;
          slug: string;
        }
      | null = null;

    if (data.paymentId) {
      const { data: rows } = await supabaseAdmin
        .from("x402_calls")
        .select("id, status, tx_hash, amount_usdc, company_id, slug")
        .eq("id", data.paymentId)
        .eq("company_id", company.id)
        .limit(1);
      call = rows?.[0] ?? null;
    } else {
      const { data: rows } = await supabaseAdmin
        .from("x402_calls")
        .select("id, status, tx_hash, amount_usdc, company_id, slug")
        .eq("company_id", company.id)
        .eq("slug", "genesis-passport")
        .in("status", ["settled", "dev"])
        .order("created_at", { ascending: false })
        .limit(1);
      call = rows?.[0] ?? null;
    }

    if (!call || (call.status !== "settled" && call.status !== "dev")) {
      throw new Error("No settled genesis-passport x402 payment found for your company.");
    }

    const price = genesisPriceUsdc();
    if (Number(call.amount_usdc ?? 0) + 1e-9 < price) {
      throw new Error(`Payment amount too low — need ${price} USDC.`);
    }

    await supabaseAdmin.from("genesis_purchases").upsert(
      {
        user_id: context.userId,
        company_id: company.id,
        wallet,
        status: "paid",
        x402_payment_id: call.id,
        amount_usdc: price,
        amount_cents: Math.round(price * 100),
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(call.tx_hash ? { tx_hash: call.tx_hash as string } : {}),
      },
      { onConflict: "user_id" },
    );

    return { status: "paid" as const };
  });

export const claimGenesisNft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("genesis_purchases")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!row || row.status !== "paid") {
      throw new Error("Pay for the Genesis Passport before claiming.");
    }

    let wallet = row.wallet as string | null;
    if (!wallet) {
      wallet = await founderWallet(context.supabase, context.userId);
      if (!wallet) throw new Error("Create your smart wallet first (Wallet page).");
      await supabaseAdmin
        .from("genesis_purchases")
        .update({ wallet, updated_at: new Date().toISOString() })
        .eq("user_id", context.userId);
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      throw new Error("Invalid wallet address.");
    }

    if (await walletOwnsGenesis(wallet)) {
      await supabaseAdmin
        .from("genesis_purchases")
        .update({
          status: "minted",
          minted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", context.userId);
      return { already: true, wallet, tokenId: row.token_id, txHash: row.tx_hash };
    }

    const { count } = await supabaseAdmin
      .from("genesis_purchases")
      .select("id", { count: "exact", head: true })
      .eq("status", "minted");
    const nextId = Math.max(1, (count ?? 0) + 1);
    if (nextId > genesisMaxSupply()) throw new Error("Genesis Passport sold out.");

    try {
      const minted = await mintGenesisToWallet({
        to: wallet as Address,
        tokenId: row.token_id ?? nextId,
      });
      await supabaseAdmin
        .from("genesis_purchases")
        .update({
          status: "minted",
          token_id: minted.tokenId,
          tx_hash: minted.txHash,
          wallet,
          minted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error: null,
        })
        .eq("user_id", context.userId);

      return {
        already: false,
        wallet,
        tokenId: minted.tokenId,
        txHash: minted.txHash,
        explorerTx: explorerTxUrl(minted.txHash),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mint failed";
      await supabaseAdmin
        .from("genesis_purchases")
        .update({
          error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", context.userId);
      throw new Error(message);
    }
  });

/** Service helper for Stripe webhook — mark paid by user id. */
export async function markGenesisPaidFromStripe(opts: {
  userId: string;
  sessionId: string;
  amountCents?: number;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const priceUsdc = genesisPriceUsdc();
  await supabaseAdmin.from("genesis_purchases").upsert(
    {
      user_id: opts.userId,
      status: "paid",
      stripe_session_id: opts.sessionId,
      amount_cents: opts.amountCents ?? Math.round(priceUsdc * 100),
      amount_usdc: priceUsdc,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}
