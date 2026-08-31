import { createServerFn } from "@tanstack/react-start";
import { verifyMessage } from "viem";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SIWE_BIND_STATEMENT,
  SIWE_CHAIN_ID,
  SIWE_STATEMENT,
  SIWE_TTL_MS,
  buildSiweMessage,
  nonceExpired,
  normalizeAddress,
  resolveSiweHost,
  siweEmailFor,
} from "@/lib/siwe.server";

type LooseDb = {
  from: (t: string) => any;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 8;
const MAX_PER_ADDR = 5;
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

async function requestOrigin(): Promise<string | null> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const origin = request.headers.get("origin");
    if (origin) return origin;
    const referer = request.headers.get("referer");
    if (referer) return new URL(referer).origin;
  } catch {
    /* ignore */
  }
  return null;
}

async function db(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseDb;
}

async function issueChallenge(input: { address: string; statement: string }) {
  const address = normalizeAddress(input.address);
  if (!address) throw new Error("Invalid wallet address.");

  const ip = await clientIp();
  if (!allowRate(`siwe:ip:${ip}`, MAX_PER_IP) || !allowRate(`siwe:addr:${address}`, MAX_PER_ADDR)) {
    throw new Error("Too many sign-in attempts. Wait a few minutes.");
  }

  const host = resolveSiweHost(await requestOrigin());
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const issued = new Date();
  const expires = new Date(issued.getTime() + SIWE_TTL_MS);
  const uri = `${host.origin}/auth`;
  const issuedAt = issued.toISOString();
  const expirationTime = expires.toISOString();

  const message = buildSiweMessage({
    address,
    nonce,
    domain: host.host,
    uri,
    chainId: SIWE_CHAIN_ID,
    issuedAt,
    expirationTime,
    statement: input.statement,
  });

  const admin = await db();
  const { error } = await admin.from("siwe_challenges").insert({
    address,
    nonce,
    domain: host.host,
    uri,
    chain_id: SIWE_CHAIN_ID,
    issued_at: issuedAt,
    expires_at: expirationTime,
  });
  if (error) throw new Error(error.message);

  return { message, nonce, expiresAt: expirationTime, address };
}

type ChallengeRow = {
  id: string;
  address: string;
  nonce: string;
  domain: string;
  uri: string;
  chain_id: number;
  issued_at: string;
  expires_at: string;
  consumed_at: string | null;
};

async function loadFreshChallenge(address: string): Promise<ChallengeRow> {
  const admin = await db();
  const { data, error } = await admin
    .from("siwe_challenges")
    .select("id, address, nonce, domain, uri, chain_id, issued_at, expires_at, consumed_at")
    .eq("address", address)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Request a new signing challenge first.");
  if (nonceExpired(data.expires_at)) {
    throw new Error("That sign-in expired. Request a new one.");
  }
  return data as ChallengeRow;
}

async function consumeChallenge(id: string) {
  const admin = await db();
  await admin
    .from("siwe_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id);
}

async function verifySignedChallenge(input: {
  address: string;
  message: string;
  signature: string;
  statement: string;
}): Promise<ChallengeRow> {
  const address = normalizeAddress(input.address);
  if (!address) throw new Error("Invalid wallet address.");
  if (!input.signature || input.signature.length < 80) throw new Error("Missing signature.");

  const ip = await clientIp();
  if (
    !allowRate(`siwe:v:ip:${ip}`, MAX_PER_IP) ||
    !allowRate(`siwe:v:addr:${address}`, MAX_PER_ADDR)
  ) {
    throw new Error("Too many sign-in attempts. Wait a few minutes.");
  }

  const row = await loadFreshChallenge(address);
  const expected = buildSiweMessage({
    address,
    nonce: row.nonce,
    domain: row.domain,
    uri: row.uri,
    chainId: row.chain_id,
    issuedAt: row.issued_at,
    expirationTime: row.expires_at,
    statement: input.statement,
  });
  if (input.message.trim() !== expected) {
    throw new Error("Signed message does not match the challenge.");
  }

  let ok = false;
  try {
    ok = await verifyMessage({
      address,
      message: expected,
      signature: input.signature as `0x${string}`,
    });
  } catch {
    ok = false;
  }
  if (!ok) throw new Error("That signature does not match the wallet address.");

  await consumeChallenge(row.id);
  return row;
}

export const issueSiweChallenge = createServerFn({ method: "POST" })
  .validator((input: { address: string; bind?: boolean }) => ({
    address: String(input.address ?? ""),
    bind: Boolean(input.bind),
  }))
  .handler(async ({ data }) => {
    return issueChallenge({
      address: data.address,
      statement: data.bind ? SIWE_BIND_STATEMENT : SIWE_STATEMENT,
    });
  });

export const verifySiweAndSession = createServerFn({ method: "POST" })
  .validator((input: { address: string; message: string; signature: string }) => ({
    address: String(input.address ?? ""),
    message: String(input.message ?? ""),
    signature: String(input.signature ?? ""),
  }))
  .handler(async ({ data }) => {
    const address = normalizeAddress(data.address);
    if (!address) throw new Error("Invalid wallet address.");
    await verifySignedChallenge({
      address,
      message: data.message,
      signature: data.signature,
      statement: SIWE_STATEMENT,
    });

    const admin = await db();
    const { data: identity } = await admin
      .from("wallet_identities")
      .select("user_id, address")
      .eq("address", address)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId = identity?.user_id as string | undefined;
    let email = siweEmailFor(address);

    if (!userId) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { auth_method: "siwe", wallet: address },
      });
      if (created.error || !created.data.user) {
        const { data: raced } = await admin
          .from("wallet_identities")
          .select("user_id")
          .eq("address", address)
          .maybeSingle();
        if (!raced?.user_id) {
          throw new Error(created.error?.message || "Could not create wallet account.");
        }
        userId = raced.user_id as string;
      } else {
        userId = created.data.user.id;
      }

      const { error: idErr } = await admin.from("wallet_identities").upsert(
        {
          user_id: userId,
          address,
          verified_at: new Date().toISOString(),
          last_nonce: data.message.slice(0, 64),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (idErr) {
        if (/wallet_identities_address/i.test(idErr.message) || /duplicate/i.test(idErr.message)) {
          throw new Error("This wallet is already linked to another account.");
        }
        throw new Error(idErr.message);
      }
    } else {
      const existingUser = await supabaseAdmin.auth.admin.getUserById(userId);
      if (existingUser.data.user?.email) email = existingUser.data.user.email;
      await admin
        .from("wallet_identities")
        .update({
          last_nonce: data.message.slice(0, 64),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    const link = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const tokenHash = link.data.properties?.hashed_token;
    if (link.error || !tokenHash) {
      throw new Error(link.error?.message || "Could not start wallet session.");
    }

    return { tokenHash, address, email };
  });

export const verifySiweAndBind = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { address: string; message: string; signature: string }) => ({
    address: String(input.address ?? ""),
    message: String(input.message ?? ""),
    signature: String(input.signature ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const address = normalizeAddress(data.address);
    if (!address) throw new Error("Invalid wallet address.");
    await verifySignedChallenge({
      address,
      message: data.message,
      signature: data.signature,
      statement: SIWE_BIND_STATEMENT,
    });

    const admin = await db();
    const { data: taken } = await admin
      .from("wallet_identities")
      .select("user_id")
      .eq("address", address)
      .maybeSingle();
    if (taken && taken.user_id !== context.userId) {
      throw new Error("This wallet is already linked to another account.");
    }

    const { data: mine } = await admin
      .from("wallet_identities")
      .select("address")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (mine && mine.address !== address) {
      throw new Error("This account already has a different wallet. Sign in with that wallet.");
    }

    const { error } = await admin.from("wallet_identities").upsert(
      {
        user_id: context.userId,
        address,
        verified_at: new Date().toISOString(),
        last_nonce: data.message.slice(0, 64),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { bound: true, address };
  });

export const getMyWalletIdentity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await db();
    const { data } = await admin
      .from("wallet_identities")
      .select("address, verified_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      address: (data?.address as string | undefined) ?? null,
      verifiedAt: (data?.verified_at as string | undefined) ?? null,
    };
  });

/** Copy SIWE wallet onto the personal handle slot after handle claim. */
export const syncSiweWalletBinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await db();
    const { data: identity } = await admin
      .from("wallet_identities")
      .select("address")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!identity?.address) return { synced: false as const };

    const { data: handle } = await admin
      .from("handles")
      .select("id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!handle?.id) return { synced: false as const };

    const { data: existing } = await admin
      .from("wallet_bindings")
      .select("id")
      .eq("handle_id", handle.id)
      .eq("slot", 3)
      .maybeSingle();
    if (existing) return { synced: true as const, already: true };

    const { error } = await admin.from("wallet_bindings").insert({
      user_id: context.userId,
      handle_id: handle.id,
      slot: 3,
      role: "personal",
      address: identity.address,
      chain: "base",
      kind: "eoa",
      provider: "siwe",
      verified: true,
      verified_at: new Date().toISOString(),
      label: "SIWE wallet",
    });
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    return { synced: true as const, address: identity.address as string };
  });
