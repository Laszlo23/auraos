import {
  quidliDailySendCapUsd,
  quidliMaxPerRecipientUsd,
  quidliRewardTokenAddress,
} from "@/lib/quidli/env";

export type QuidliPlatform = "twitter" | "farcaster" | "telegram" | "email" | "github";

type LooseDb = { from: (table: string) => any };

const ALLOWED = new Set<QuidliPlatform>(["twitter", "farcaster", "telegram", "email", "github"]);

export function normalizeQuidliPlatform(raw: string): QuidliPlatform | null {
  const p = raw.trim().toLowerCase();
  if (p === "x" || p === "twitter") return "twitter";
  if (p === "farcaster" || p === "fc") return "farcaster";
  if (p === "telegram" || p === "tg") return "telegram";
  if (p === "email") return "email";
  if (p === "github" || p === "gh") return "github";
  return null;
}

export function isAllowedQuidliPlatform(platform: QuidliPlatform): boolean {
  return ALLOWED.has(platform);
}

export function normalizeHandle(platform: QuidliPlatform, handle: string): string {
  const h = handle.trim();
  if (platform === "twitter" || platform === "farcaster" || platform === "telegram") {
    return h.replace(/^@/, "");
  }
  return h;
}

export type PolicyCheckResult = { ok: true } | { ok: false; reason: string };

export async function quidliSpendTodayUsd(db: LooseDb): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { data: rows } = await db
    .from("quidli_deliveries")
    .select("amount_usdc, token_address, status, created_at")
    .gte("created_at", start.toISOString())
    .in("status", ["pending", "submitted", "completed"])
    .eq("token_address", quidliRewardTokenAddress())
    .limit(500);
  return ((rows ?? []) as { amount_usdc: number | string }[]).reduce((sum, r) => {
    const n = Number(r.amount_usdc);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export async function quidliRecipientSpendTodayUsd(
  db: LooseDb,
  platform: QuidliPlatform,
  handle: string,
): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { data: rows } = await db
    .from("quidli_deliveries")
    .select("amount_usdc")
    .eq("platform", platform)
    .ilike("handle", handle)
    .gte("created_at", start.toISOString())
    .in("status", ["pending", "submitted", "completed"])
    .limit(100);
  return ((rows ?? []) as { amount_usdc: number | string }[]).reduce((sum, r) => {
    const n = Number(r.amount_usdc);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export async function checkQuidliSendPolicy(
  db: LooseDb,
  params: { platform: QuidliPlatform; handle: string; amountUsdc: number },
): Promise<PolicyCheckResult> {
  if (!isAllowedQuidliPlatform(params.platform)) {
    return { ok: false, reason: "platform_not_allowed" };
  }
  if (!params.handle.trim()) {
    return { ok: false, reason: "handle_required" };
  }
  if (!(params.amountUsdc > 0)) {
    return { ok: false, reason: "amount_invalid" };
  }
  if (params.amountUsdc > quidliMaxPerRecipientUsd()) {
    return { ok: false, reason: "per_recipient_cap_exceeded" };
  }

  const recipientToday = await quidliRecipientSpendTodayUsd(db, params.platform, params.handle);
  if (recipientToday + params.amountUsdc > quidliMaxPerRecipientUsd()) {
    return { ok: false, reason: "per_recipient_daily_cap_exceeded" };
  }

  const spentToday = await quidliSpendTodayUsd(db);
  if (spentToday + params.amountUsdc > quidliDailySendCapUsd()) {
    return { ok: false, reason: "daily_cap_exceeded" };
  }

  return { ok: true };
}
