import { createServerFn } from "@tanstack/react-start";
import type { Address } from "viem";
import { verifyMessage } from "viem";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  HOOD_GIVEAWAY_BATCH_MAX,
  clampGiveawayBatch,
  hoodRedeemMessage,
  normalizeHoodCode,
  randomHoodCode,
  type HoodRedeemCode,
} from "@/lib/hood-giveaway.server";
import { isOpsAdminEmail } from "@/lib/ops.functions";
import { normalizeAddress } from "@/lib/siwe.server";

type LooseDb = {
  from: (t: string) => any;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 8;
const MAX_PER_WALLET = 3;
const rateBuckets = new Map<string, { n: number; reset: number }>();

function allowRate(key: string, max: number): boolean {
  const now = Date.now();
  const cur = rateBuckets.get(key);
  if (!cur || now > cur.reset) {
    rateBuckets.set(key, { n: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (cur.n >= max) return false;
  cur.n += 1;
  return true;
}

async function clientIp(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const forwarded = request.headers.get("x-forwarded-for") || "";
    const first = forwarded.split(",")[0]?.trim();
    return first || request.headers.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

async function db(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseDb;
}

async function emailFromContext(context: { claims?: unknown }): Promise<string | null> {
  const claims = context.claims as Record<string, unknown> | undefined;
  if (typeof claims?.["email"] === "string" && claims["email"]) return claims["email"];
  const meta = claims?.["user_metadata"] as Record<string, unknown> | undefined;
  if (typeof meta?.["email"] === "string" && meta["email"]) return meta["email"];
  return null;
}

export type HoodGiveawayStatus = {
  code: string | null;
  status: "invalid" | "issued" | "redeemed" | "void";
  mintConfigured: boolean;
  wallet: string | null;
  tokenId: number | null;
  txHash: string | null;
  explorerTx: string | null;
};

export const getHoodGiveawayStatus = createServerFn({ method: "GET" })
  .validator((input?: { code?: string }) => ({
    code: typeof input?.code === "string" ? input.code : "",
  }))
  .handler(async ({ data }): Promise<HoodGiveawayStatus> => {
    const { genesisContractAddress } = await import("@/lib/genesis.server");
    const mintConfigured = Boolean(
      genesisContractAddress() &&
      process.env["GENESIS_MINTER_KEY"]?.trim()?.match(/^0x[0-9a-fA-F]{64}$/),
    );
    const code = normalizeHoodCode(data.code);
    if (!code) {
      return {
        code: null,
        status: "invalid",
        mintConfigured,
        wallet: null,
        tokenId: null,
        txHash: null,
        explorerTx: null,
      };
    }
    const admin = await db();
    const { data: row } = await admin
      .from("hood_giveaway_codes")
      .select("code, status, redeemed_wallet, token_id, tx_hash")
      .eq("code", code)
      .maybeSingle();
    if (!row) {
      return {
        code,
        status: "invalid",
        mintConfigured,
        wallet: null,
        tokenId: null,
        txHash: null,
        explorerTx: null,
      };
    }
    const { explorerTxUrl } = await import("@/lib/genesis.server");
    return {
      code,
      status: row.status as HoodGiveawayStatus["status"],
      mintConfigured,
      wallet: row.redeemed_wallet ?? null,
      tokenId: row.token_id ?? null,
      txHash: row.tx_hash ?? null,
      explorerTx: row.tx_hash ? explorerTxUrl(row.tx_hash) : null,
    };
  });

export const listHoodGiveawayCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = await emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");
    const admin = await db();
    const { data, error } = await admin
      .from("hood_giveaway_codes")
      .select("code, status, issued_at, redeemed_at, redeemed_wallet, token_id, tx_hash")
      .order("issued_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return { codes: data ?? [] };
  });

export const issueHoodGiveawayBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input?: { count?: number }) => ({
    count: clampGiveawayBatch(input?.count ?? HOOD_GIVEAWAY_BATCH_MAX),
  }))
  .handler(async ({ data, context }) => {
    const email = await emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");

    const admin = await db();
    const codes: string[] = [];
    for (let i = 0; i < data.count; i++) {
      let inserted = false;
      for (let attempt = 0; attempt < 6 && !inserted; attempt++) {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        const code = randomHoodCode(bytes);
        const { error } = await admin.from("hood_giveaway_codes").insert({
          code,
          status: "issued",
          issued_by: context.userId,
        });
        if (!error) {
          codes.push(code);
          inserted = true;
        } else if (!/duplicate|unique/i.test(error.message)) {
          throw new Error(error.message);
        }
      }
      if (!inserted) throw new Error("Could not mint a unique giveaway code.");
    }
    return { codes };
  });

const redeemNonces = new Map<string, { nonce: string; exp: number }>();

export const issueHoodRedeemChallenge = createServerFn({ method: "POST" })
  .validator((input: { code: string; address: string }) => ({
    code: String(input.code ?? ""),
    address: String(input.address ?? ""),
  }))
  .handler(async ({ data }) => {
    const code = normalizeHoodCode(data.code);
    const address = normalizeAddress(data.address);
    if (!code) throw new Error("That giveaway code is not valid.");
    if (!address) throw new Error("Invalid wallet address.");

    const ip = await clientIp();
    if (
      !allowRate(`hood:c:ip:${ip}`, MAX_PER_IP) ||
      !allowRate(`hood:c:w:${address}`, MAX_PER_WALLET)
    ) {
      throw new Error("Too many attempts. Wait a few minutes.");
    }

    const admin = await db();
    const { data: row } = await admin
      .from("hood_giveaway_codes")
      .select("status")
      .eq("code", code)
      .maybeSingle();
    if (!row) throw new Error("That giveaway code is not valid.");
    if (row.status === "redeemed") throw new Error("This Hood was already claimed.");
    if (row.status === "void") throw new Error("This giveaway code was voided.");

    const nonce = crypto.randomUUID();
    const key = `${code}:${address}`;
    redeemNonces.set(key, { nonce, exp: Date.now() + 2 * 60 * 1000 });
    return { message: hoodRedeemMessage(code, address, nonce), nonce };
  });

export type HoodRedeemResult = {
  ok: boolean;
  code: HoodRedeemCode;
  tokenId: number | null;
  txHash: string | null;
  explorerTx: string | null;
  wallet: string | null;
};

export const redeemHoodGiveaway = createServerFn({ method: "POST" })
  .validator((input: { code: string; address: string; signature: string }) => ({
    code: String(input.code ?? ""),
    address: String(input.address ?? ""),
    signature: String(input.signature ?? ""),
  }))
  .handler(async ({ data }): Promise<HoodRedeemResult> => {
    const code = normalizeHoodCode(data.code);
    const address = normalizeAddress(data.address);
    if (!code || !address) {
      return {
        ok: false,
        code: code ? "bad_wallet" : "invalid",
        tokenId: null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }

    const ip = await clientIp();
    if (
      !allowRate(`hood:r:ip:${ip}`, MAX_PER_IP) ||
      !allowRate(`hood:r:w:${address}`, MAX_PER_WALLET)
    ) {
      return {
        ok: false,
        code: "rate",
        tokenId: null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }

    const key = `${code}:${address}`;
    const stored = redeemNonces.get(key);
    if (!stored || Date.now() > stored.exp) {
      return {
        ok: false,
        code: "bad_sig",
        tokenId: null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }
    redeemNonces.delete(key);

    const message = hoodRedeemMessage(code, address, stored.nonce);
    let sigOk = false;
    try {
      sigOk = await verifyMessage({
        address,
        message,
        signature: data.signature as `0x${string}`,
      });
    } catch {
      sigOk = false;
    }
    if (!sigOk) {
      return {
        ok: false,
        code: "bad_sig",
        tokenId: null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }

    const { genesisContractAddress, genesisMaxSupply, mintGenesisToWallet, explorerTxUrl } =
      await import("@/lib/genesis.server");
    const mintConfigured = Boolean(
      genesisContractAddress() &&
      process.env["GENESIS_MINTER_KEY"]?.trim()?.match(/^0x[0-9a-fA-F]{64}$/),
    );
    if (!mintConfigured) {
      return {
        ok: false,
        code: "unarmed",
        tokenId: null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }

    const admin = await db();
    const { data: row } = await admin
      .from("hood_giveaway_codes")
      .select("id, status, token_id")
      .eq("code", code)
      .maybeSingle();
    if (!row) {
      return {
        ok: false,
        code: "invalid",
        tokenId: null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }
    if (row.status === "redeemed") {
      return {
        ok: false,
        code: "redeemed",
        tokenId: row.token_id ?? null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }
    if (row.status === "void") {
      return {
        ok: false,
        code: "void",
        tokenId: null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }

    const { count: mintedPurchases } = await admin
      .from("genesis_purchases")
      .select("id", { count: "exact", head: true })
      .eq("status", "minted");
    const { count: mintedGiveaways } = await admin
      .from("hood_giveaway_codes")
      .select("id", { count: "exact", head: true })
      .eq("status", "redeemed");
    const nextId = Math.max(1, (mintedPurchases ?? 0) + (mintedGiveaways ?? 0) + 1);
    if (nextId > genesisMaxSupply()) {
      return {
        ok: false,
        code: "sold_out",
        tokenId: null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }

    try {
      const minted = await mintGenesisToWallet({
        to: address as Address,
        tokenId: nextId,
        gift: true,
      });
      await admin
        .from("hood_giveaway_codes")
        .update({
          status: "redeemed",
          redeemed_at: new Date().toISOString(),
          redeemed_wallet: address,
          token_id: minted.tokenId,
          tx_hash: minted.txHash,
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      return {
        ok: true,
        code: "ok",
        tokenId: minted.tokenId,
        txHash: minted.txHash,
        explorerTx: explorerTxUrl(minted.txHash),
        wallet: address,
      };
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Mint failed";
      await admin
        .from("hood_giveaway_codes")
        .update({
          error: messageText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      return {
        ok: false,
        code: "mint_failed",
        tokenId: null,
        txHash: null,
        explorerTx: null,
        wallet: address,
      };
    }
  });
