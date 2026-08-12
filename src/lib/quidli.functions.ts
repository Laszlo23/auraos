/**
 * Quidli ops + referral tip server functions.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tipReferrerForMilestone, type ReferralMilestone } from "@/lib/quidli/campaigns";
import { getDropBalance, lookupHandle } from "@/lib/quidli/client";
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
