import { createServerFn } from "@tanstack/react-start";
import type { Address } from "viem";

export const RELIC_MAX_SUPPLY = 7;

export type RelicVaultStatus = {
  remaining: number;
  minted: number;
  max: number;
  sealed: boolean;
  configured: boolean;
  contract: string | null;
};

export type RelicClaimResult = {
  ok: boolean;
  code: "ok" | "wrong" | "sealed" | "taken" | "unarmed" | "rate" | "bad_wallet" | "mint_failed";
  tokenId: number | null;
  txHash: string | null;
  explorerTx: string | null;
  explorerToken: string | null;
  remaining: number;
  sealed: boolean;
};

type LooseDb = {
  from: (table: string) => any;
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

function normalizeWallet(raw: string): Address | null {
  const w = raw.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(w)) return null;
  return w.toLowerCase() as Address;
}

async function relicServer() {
  return import("@/lib/relic.server");
}

async function db(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseDb;
}

async function dbMinted(): Promise<number> {
  const supabase = await db();
  const { count } = await supabase
    .from("relic_claims")
    .select("id", { count: "exact", head: true });
  return typeof count === "number" ? count : 0;
}

async function vaultSnapshot(): Promise<RelicVaultStatus> {
  const { relicContractAddress, relicMintConfigured, relicAnswerConfigured, onchainRelicMinted } =
    await relicServer();
  const chainMinted = await onchainRelicMinted();
  const tableMinted = await dbMinted();
  const minted = Math.min(RELIC_MAX_SUPPLY, Math.max(chainMinted ?? 0, tableMinted));
  const remaining = Math.max(0, RELIC_MAX_SUPPLY - minted);
  return {
    remaining,
    minted,
    max: RELIC_MAX_SUPPLY,
    sealed: remaining === 0,
    configured: relicMintConfigured() && relicAnswerConfigured(),
    contract: relicContractAddress(),
  };
}

export async function readRelicVaultStatus(): Promise<RelicVaultStatus> {
  try {
    return await vaultSnapshot();
  } catch {
    return {
      remaining: RELIC_MAX_SUPPLY,
      minted: 0,
      max: RELIC_MAX_SUPPLY,
      sealed: false,
      configured: false,
      contract: null,
    };
  }
}

export const getRelicVaultStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<RelicVaultStatus> => readRelicVaultStatus(),
);

export const claimRelic = createServerFn({ method: "POST" })
  .validator((input: { wallet?: string; phrase?: string }) => ({
    wallet: String(input?.wallet ?? "").slice(0, 80),
    phrase: String(input?.phrase ?? "").slice(0, 500),
  }))
  .handler(async ({ data }): Promise<RelicClaimResult> => {
    const fail = async (code: RelicClaimResult["code"]): Promise<RelicClaimResult> => {
      const snap = await vaultSnapshot().catch((): RelicVaultStatus => ({
        remaining: RELIC_MAX_SUPPLY,
        minted: 0,
        max: RELIC_MAX_SUPPLY,
        sealed: code === "sealed",
        configured: false,
        contract: null,
      }));
      return {
        ok: false,
        code,
        tokenId: null,
        txHash: null,
        explorerTx: null,
        explorerToken: null,
        remaining: snap.remaining,
        sealed: snap.sealed || code === "sealed",
      };
    };

    const wallet = normalizeWallet(data.wallet);
    if (!wallet) return fail("bad_wallet");

    const ip = await clientIp();
    if (!allowRate(`ip:${ip}`, MAX_PER_IP) || !allowRate(`w:${wallet}`, MAX_PER_WALLET)) {
      return fail("rate");
    }

    const {
      relicMintConfigured,
      relicAnswerConfigured,
      relicPhraseMatches,
      hashRelicPhrase,
      onchainRelicMinted,
      mintRelicToWallet,
      explorerTxUrl,
      explorerTokenUrl,
    } = await relicServer();

    if (!relicMintConfigured() || !relicAnswerConfigured()) {
      return fail("unarmed");
    }

    if (!relicPhraseMatches(data.phrase)) {
      return fail("wrong");
    }

    const snap = await vaultSnapshot();
    if (snap.sealed) return fail("sealed");

    const supabase = await db();
    const { data: existing } = await supabase
      .from("relic_claims")
      .select("token_id")
      .eq("wallet", wallet)
      .maybeSingle();
    if (existing?.token_id) return fail("taken");

    const chainMinted = (await onchainRelicMinted()) ?? snap.minted;
    const nextId = chainMinted + 1;
    if (nextId < 1 || nextId > RELIC_MAX_SUPPLY) return fail("sealed");

    const phraseHash = hashRelicPhrase(data.phrase);
    const { error: insertError } = await supabase.from("relic_claims").insert({
      wallet,
      token_id: nextId,
      phrase_hash: phraseHash,
    });
    if (insertError) {
      if (insertError.code === "23505") {
        const { data: byWallet } = await supabase
          .from("relic_claims")
          .select("token_id")
          .eq("wallet", wallet)
          .maybeSingle();
        if (byWallet) return fail("taken");
      }
      console.warn("[relic] claim insert failed");
      return fail("mint_failed");
    }

    try {
      const minted = await mintRelicToWallet({ to: wallet, tokenId: nextId });
      await supabase
        .from("relic_claims")
        .update({ tx_hash: minted.txHash })
        .eq("wallet", wallet)
        .eq("token_id", nextId);
      console.info(`[relic] minted #${nextId}`);
      const remaining = Math.max(0, RELIC_MAX_SUPPLY - nextId);
      return {
        ok: true,
        code: "ok",
        tokenId: nextId,
        txHash: minted.txHash,
        explorerTx: explorerTxUrl(minted.txHash),
        explorerToken: explorerTokenUrl(nextId),
        remaining,
        sealed: remaining === 0,
      };
    } catch (err) {
      void err;
      await supabase.from("relic_claims").delete().eq("wallet", wallet).eq("token_id", nextId);
      console.warn("[relic] mint failed");
      return fail("mint_failed");
    }
  });
