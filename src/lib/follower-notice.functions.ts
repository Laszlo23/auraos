import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FOLLOWER_NOTICE_IMPORT_MAX,
  parseFollowerNoticeCsv,
  normalizeFollowerWallet,
} from "@/lib/follower-notice";
import { isOpsAdminEmail } from "@/lib/ops.functions";
import { clientIpFromRequest, rateLimitConsume } from "@/lib/rate-limit.server";

type LooseDb = {
  from: (t: string) => any;
};

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

async function requireOps(context: { claims?: unknown }): Promise<string> {
  const email = await emailFromContext(context);
  if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");
  return email as string;
}

export type FollowerNoticeSummary = {
  total: number;
  seen: number;
};

export const getFollowerNoticeSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FollowerNoticeSummary> => {
    await requireOps(context);
    const admin = await db();
    const totalRes = await admin.from("follower_notices").select("wallet", { count: "exact", head: true });
    if (totalRes.error) throw new Error(totalRes.error.message);
    const seenRes = await admin
      .from("follower_notices")
      .select("wallet", { count: "exact", head: true })
      .not("seen_at", "is", null);
    if (seenRes.error) throw new Error(seenRes.error.message);
    return {
      total: totalRes.count ?? 0,
      seen: seenRes.count ?? 0,
    };
  });

export const importFollowerNoticeCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input?: { csv?: string; batch?: string }) => {
    const csv = typeof input?.csv === "string" ? input.csv : "";
    if (!csv.trim()) throw new Error("CSV is empty");
    if (csv.length > 2_000_000) throw new Error("CSV too large (2 MB max)");
    const batchRaw = typeof input?.batch === "string" ? input.batch.trim() : "csv";
    return { csv, batch: batchRaw.slice(0, 80) || "csv" };
  })
  .handler(async ({ data, context }) => {
    const email = await requireOps(context);
    const parsed = parseFollowerNoticeCsv(data.csv);
    if (parsed.wallets.length === 0) {
      throw new Error("No wallet addresses found in that file");
    }
    if (parsed.wallets.length > FOLLOWER_NOTICE_IMPORT_MAX) {
      throw new Error(`Too many wallets (max ${FOLLOWER_NOTICE_IMPORT_MAX})`);
    }

    const admin = await db();
    let inserted = 0;
    const chunkSize = 400;
    for (let i = 0; i < parsed.wallets.length; i += chunkSize) {
      const chunk = parsed.wallets.slice(i, i + chunkSize).map((wallet) => ({
        wallet,
        batch: data.batch,
        imported_by: email,
      }));
      const { data: rows, error } = await admin
        .from("follower_notices")
        .upsert(chunk, { onConflict: "wallet", ignoreDuplicates: true })
        .select("wallet");
      if (error) throw new Error(error.message);
      inserted += rows?.length ?? 0;
    }

    return {
      parsed: parsed.wallets.length,
      inserted,
      already: parsed.wallets.length - inserted,
      duplicates: parsed.duplicates,
      invalidCount: parsed.invalidCount,
      invalid: parsed.invalid,
    };
  });

export type FollowerNoticeCheck = {
  listed: boolean;
  seenBefore: boolean;
};

export const checkFollowerNotice = createServerFn({ method: "POST" })
  .validator((input?: { wallet?: string }) => ({
    wallet: typeof input?.wallet === "string" ? input.wallet : "",
  }))
  .handler(async ({ data }): Promise<FollowerNoticeCheck> => {
    const wallet = normalizeFollowerWallet(data.wallet);
    if (!wallet) throw new Error("Need a valid 0x wallet");

    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const ip = clientIpFromRequest(getRequest());
      const limited = rateLimitConsume(`follower-notice:${ip}`, {
        limit: 40,
        windowMs: 60 * 60 * 1000,
      });
      if (!limited.ok) throw new Error("Too many checks — try again later.");
    } catch (e) {
      if (e instanceof Error && /too many/i.test(e.message)) throw e;
    }

    const admin = await db();
    const { data: row, error } = await admin
      .from("follower_notices")
      .select("wallet, seen_at")
      .eq("wallet", wallet)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { listed: false, seenBefore: false };

    const seenBefore = Boolean(row.seen_at);
    if (!seenBefore) {
      await admin.from("follower_notices").update({ seen_at: new Date().toISOString() }).eq("wallet", wallet);
    }
    return { listed: true, seenBefore };
  });
