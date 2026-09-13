/**
 * Quidli ops + referral tip server functions.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tipReferrerForMilestone, type ReferralMilestone } from "@/lib/quidli/campaigns";
import { dropToMany, getDropBalance, lookupHandle } from "@/lib/quidli/client";
import {
  quidliConfigured,
  quidliDailySendCapUsd,
  quidliDefaultAmountUsdc,
  quidliMaxPerRecipientUsd,
  quidliPublicWebhookUrl,
  quidliRewardChainId,
  quidliRewardTokenAddress,
} from "@/lib/quidli/env";
import { quidliSpendTodayUsd } from "@/lib/quidli/policy";
import { executeQuidliSend } from "@/lib/quidli/send";
import { isOpsAdminEmail } from "@/lib/ops.functions";
import {
  FOUNDER_FARCASTER_FID,
  FOUNDER_FARCASTER_USERNAME,
  fetchFarcasterFollowerHandles,
  lookupFarcasterUserByFid,
} from "@/lib/farcaster-neynar.server";

export const FOLLOWER_PING_CAMPAIGN = "follower-ping-2026-09-13";
export const FOLLOWER_PING_CONFIRM = "SEND FOLLOWERS";
const FOLLOWER_PING_BATCH = 75;
const FOLLOWER_PING_MAX_EACH = 0.11;

type LooseDb = { from: (table: string) => any };

function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

function adminDb(): LooseDb {
  return asDb(supabaseAdmin);
}

function emailFromContext(context: { claims?: unknown }): string | null {
  const claims = context.claims as Record<string, unknown> | undefined;
  if (typeof claims?.["email"] === "string" && claims["email"]) return claims["email"];
  const meta = claims?.["user_metadata"] as Record<string, unknown> | undefined;
  if (typeof meta?.["email"] === "string" && meta["email"]) return meta["email"];
  return null;
}

export const getQuidliStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler((async ({ context }: any) => {
    const email = emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");

    const db = adminDb();
    let spentToday = 0;
    try {
      spentToday = await quidliSpendTodayUsd(db);
    } catch {
      spentToday = 0;
    }

    return {
      configured: quidliConfigured(),
      webhookUrl: quidliPublicWebhookUrl() ?? "",
      rewardToken: quidliRewardTokenAddress(),
      chainId: quidliRewardChainId(),
      defaultAmountUsdc: quidliDefaultAmountUsdc(),
      dailyCapUsd: quidliDailySendCapUsd(),
      maxPerRecipientUsd: quidliMaxPerRecipientUsd(),
      spentTodayUsd: spentToday,
      balance: await getDropBalance(quidliRewardChainId()),
    };
  }) as any);

export const sendQuidliDrop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      platform: string;
      handle: string;
      amountUsdc?: number | undefined;
      memo?: string | undefined;
      campaign?: string | undefined;
      dryRun?: boolean | undefined;
    }) => ({
      platform: String(input.platform),
      handle: String(input.handle).trim(),
      amountUsdc:
        typeof input.amountUsdc === "number" && Number.isFinite(input.amountUsdc)
          ? input.amountUsdc
          : undefined,
      memo: typeof input.memo === "string" ? input.memo.trim().slice(0, 200) : undefined,
      campaign:
        typeof input.campaign === "string" ? input.campaign.trim().slice(0, 80) : "ops_manual",
      dryRun: Boolean(input.dryRun),
    }),
  )
  .handler(async ({ data, context }) => {
    const email = emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");
    if (!quidliConfigured()) throw new Error("Quidli not configured");

    return executeQuidliSend(adminDb(), {
      platform: data.platform,
      handle: data.handle,
      amountUsdc: data.amountUsdc,
      memo: data.memo,
      campaign: data.campaign,
      dryRun: data.dryRun,
      userId: context.userId,
    });
  });

export const lookupQuidliHandle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { handle: string }) => ({
    handle: String(input.handle).trim(),
  }))
  .handler((async ({ data, context }: any) => {
    const email = emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");
    const platform = data.handle.includes("@") && data.handle.includes(".") ? "email" : "twitter";
    return lookupHandle({
      platform: platform === "email" ? "email" : "twitter",
      handle: data.handle.replace(/^@/, ""),
    });
  }) as any);

function parseExtraHandles(raw: string | undefined): Array<{ platform: "twitter" | "telegram"; handle: string }> {
  if (!raw?.trim()) return [];
  const out: Array<{ platform: "twitter" | "telegram"; handle: string }> = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    let platform: "twitter" | "telegram" = "twitter";
    let handle = trimmed;
    if (trimmed.toLowerCase().startsWith("tg:") || trimmed.toLowerCase().startsWith("telegram:")) {
      platform = "telegram";
      handle = trimmed.split(":").slice(1).join(":").trim();
    } else if (trimmed.toLowerCase().startsWith("x:") || trimmed.toLowerCase().startsWith("twitter:")) {
      handle = trimmed.split(":").slice(1).join(":").trim();
    }
    handle = handle.replace(/^@/, "");
    const key = `${platform}:${handle.toLowerCase()}`;
    if (!handle || seen.has(key)) continue;
    seen.add(key);
    out.push({ platform, handle });
  }
  return out;
}

export const previewFollowerPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input?: { amountUsdc?: number; extraHandles?: string }) => ({
    amountUsdc:
      typeof input?.amountUsdc === "number" && Number.isFinite(input.amountUsdc)
        ? input.amountUsdc
        : 0.01,
    extraHandles: typeof input?.extraHandles === "string" ? input.extraHandles : "",
  }))
  .handler(async ({ data, context }) => {
    const email = emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");

    const amountUsdc = Math.min(FOLLOWER_PING_MAX_EACH, Math.max(0.01, data.amountUsdc));
    const profile = await lookupFarcasterUserByFid(FOUNDER_FARCASTER_FID);
    const extras = parseExtraHandles(data.extraHandles);
    const db = adminDb();
    const { count: already } = await db
      .from("quidli_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("campaign", FOLLOWER_PING_CAMPAIGN)
      .in("status", ["pending", "submitted", "completed"]);

    const fcCount = profile?.followerCount ?? 0;
    const extraCount = extras.length;
    const estimated = fcCount + extraCount;
    const remainingGuess = Math.max(0, estimated - (already ?? 0));
    const costUsd = Number((remainingGuess * amountUsdc).toFixed(2));
    const balance = await getDropBalance(quidliRewardChainId());

    return {
      campaign: FOLLOWER_PING_CAMPAIGN,
      farcaster: FOUNDER_FARCASTER_USERNAME,
      fid: FOUNDER_FARCASTER_FID,
      fcFollowers: fcCount,
      extraHandles: extraCount,
      alreadySent: already ?? 0,
      amountUsdc,
      estimatedRecipients: remainingGuess,
      estimatedCostUsd: costUsd,
      dailyCapUsd: quidliDailySendCapUsd(),
      confirmPhrase: FOLLOWER_PING_CONFIRM,
      balance,
    };
  });

export const runFollowerPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input?: {
    amountUsdc?: number;
    extraHandles?: string;
    confirm?: string;
    dryRun?: boolean;
    batch?: number;
  }) => ({
    amountUsdc:
      typeof input?.amountUsdc === "number" && Number.isFinite(input.amountUsdc)
        ? input.amountUsdc
        : 0.01,
    extraHandles: typeof input?.extraHandles === "string" ? input.extraHandles : "",
    confirm: typeof input?.confirm === "string" ? input.confirm.trim() : "",
    dryRun: Boolean(input?.dryRun),
    batch:
      typeof input?.batch === "number" && Number.isFinite(input.batch)
        ? Math.min(FOLLOWER_PING_BATCH, Math.max(1, Math.floor(input.batch)))
        : FOLLOWER_PING_BATCH,
  }))
  .handler(async ({ data, context }) => {
    const email = emailFromContext(context);
    if (!isOpsAdminEmail(email)) throw new Error("Not authorized for ops");
    if (!quidliConfigured()) throw new Error("Quidli not configured");

    const amountUsdc = Math.min(FOLLOWER_PING_MAX_EACH, Math.max(0.01, data.amountUsdc));
    if (!data.dryRun && data.confirm !== FOLLOWER_PING_CONFIRM) {
      throw new Error(`Type ${FOLLOWER_PING_CONFIRM} to send real USDC`);
    }

    const { handles } = await fetchFarcasterFollowerHandles(FOUNDER_FARCASTER_FID);
    const extras = parseExtraHandles(data.extraHandles);
    const recipients = [
      ...handles.map((handle) => ({ platform: "farcaster" as const, handle })),
      ...extras,
    ];

    const db = adminDb();
    const { data: prior } = await db
      .from("quidli_deliveries")
      .select("idempotency_key")
      .eq("campaign", FOLLOWER_PING_CAMPAIGN)
      .in("status", ["pending", "submitted", "completed"])
      .limit(8_000);
    const sent = new Set(
      ((prior ?? []) as { idempotency_key: string }[]).map((r) => r.idempotency_key),
    );

    const pending = recipients.filter((r) => {
      const key = `${FOLLOWER_PING_CAMPAIGN}:${r.platform}:${r.handle.toLowerCase()}`;
      return !sent.has(key);
    });
    const batch = pending.slice(0, data.batch);
    const costUsd = Number((batch.length * amountUsdc).toFixed(2));

    if (data.dryRun) {
      return {
        dryRun: true,
        queued: batch.length,
        remainingAfter: Math.max(0, pending.length - batch.length),
        totalPending: pending.length,
        amountUsdc,
        costUsd,
        sample: batch.slice(0, 8).map((r) => `${r.platform}:${r.handle}`),
      };
    }

    if (batch.length === 0) {
      return {
        dryRun: false,
        queued: 0,
        remainingAfter: 0,
        totalPending: 0,
        amountUsdc,
        costUsd: 0,
        sample: [],
      };
    }

    const rows = batch.map((r) => ({
      idempotency_key: `${FOLLOWER_PING_CAMPAIGN}:${r.platform}:${r.handle.toLowerCase()}`,
      platform: r.platform,
      handle: r.handle,
      amount_usdc: amountUsdc,
      token_address: quidliRewardTokenAddress(),
      chain_id: quidliRewardChainId(),
      status: "pending",
      campaign: FOLLOWER_PING_CAMPAIGN,
    }));
    const { error: insertError } = await db.from("quidli_deliveries").insert(rows);
    if (insertError) throw new Error(insertError.message);

    const apiResult = await dropToMany({
      recipients: batch,
      amountUsdc,
      idempotencyKey: `${FOLLOWER_PING_CAMPAIGN}#${batch[0]?.platform}:${batch[0]?.handle}:${batch.length}`,
    });

    const status = apiResult.ok ? "submitted" : "failed";
    await db
      .from("quidli_deliveries")
      .update({
        status,
        quidli_ref: apiResult.ok ? apiResult.quidliRef : null,
        error: apiResult.ok ? null : apiResult.error,
        raw: apiResult.ok ? (apiResult.raw ?? {}) : { detail: apiResult.detail ?? null },
        updated_at: new Date().toISOString(),
      })
      .in(
        "idempotency_key",
        rows.map((r) => r.idempotency_key),
      );

    if (!apiResult.ok) throw new Error(apiResult.detail || apiResult.error);

    return {
      dryRun: false,
      queued: batch.length,
      remainingAfter: Math.max(0, pending.length - batch.length),
      totalPending: pending.length,
      amountUsdc,
      costUsd,
      sample: batch.slice(0, 8).map((r) => `${r.platform}:${r.handle}`),
    };
  });

/** Soft tip after referral milestone — safe to call from client or server. */
export const tipReferrerForMilestoneFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { stage: ReferralMilestone }) => ({
    stage: input.stage === "subscribed" ? ("subscribed" as const) : ("activated" as const),
  }))
  .handler(async ({ data, context }) => {
    return tipReferrerForMilestone({
      db: adminDb(),
      referredUserId: context.userId,
      stage: data.stage,
    });
  });
