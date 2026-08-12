import { dropToHandles } from "@/lib/quidli/client";
import {
  quidliDefaultAmountUsdc,
  quidliRewardChainId,
  quidliRewardTokenAddress,
} from "@/lib/quidli/env";
import {
  checkQuidliSendPolicy,
  normalizeHandle,
  normalizeQuidliPlatform,
  type QuidliPlatform,
} from "@/lib/quidli/policy";

type LooseDb = { from: (table: string) => any };

export type QuidliSendRequest = {
  platform: string;
  handle: string;
  amountUsdc?: number | undefined;
  memo?: string | undefined;
  idempotencyKey?: string | undefined;
  campaign?: string | undefined;
  companyId?: string | null | undefined;
  userId?: string | null | undefined;
  referralId?: string | null | undefined;
  dryRun?: boolean | undefined;
};

export type QuidliSendOutcome =
  | {
      ok: true;
      deliveryId: string;
      status: string;
      quidliRef: string | null;
      reused?: boolean;
    }
  | { ok: false; error: string; detail?: string | undefined };

function buildIdempotencyKey(
  params: QuidliSendRequest,
  platform: QuidliPlatform,
  handle: string,
): string {
  if (params.idempotencyKey?.trim()) return params.idempotencyKey.trim();
  const slug = params.campaign?.trim() || "send";
  return `${slug}:${platform}:${handle.toLowerCase()}`;
}

export async function executeQuidliSend(
  db: LooseDb,
  params: QuidliSendRequest,
): Promise<QuidliSendOutcome> {
  const platform = normalizeQuidliPlatform(params.platform);
  if (!platform) return { ok: false, error: "invalid_platform" };

  const handle = normalizeHandle(platform, params.handle);
  const amountUsdc =
    typeof params.amountUsdc === "number" && params.amountUsdc > 0
      ? params.amountUsdc
      : quidliDefaultAmountUsdc();
  const idempotencyKey = buildIdempotencyKey(params, platform, handle);

  const { data: existing } = await db
    .from("quidli_deliveries")
    .select("id, status, quidli_ref")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing && existing.status !== "failed") {
    return {
      ok: true,
      deliveryId: existing.id as string,
      status: String(existing.status),
      quidliRef: (existing.quidli_ref as string | null) ?? null,
      reused: true,
    };
  }

  const policy = await checkQuidliSendPolicy(db, { platform, handle, amountUsdc });
  if (!policy.ok) return { ok: false, error: policy.reason };

  if (params.dryRun) {
    return { ok: true, deliveryId: "dry-run", status: "dry_run", quidliRef: null };
  }

  let deliveryId = existing?.id as string | undefined;
  if (!deliveryId) {
    const { data: created, error } = await db
      .from("quidli_deliveries")
      .insert({
        idempotency_key: idempotencyKey,
        platform,
        handle,
        amount_usdc: amountUsdc,
        token_address: quidliRewardTokenAddress(),
        chain_id: quidliRewardChainId(),
        status: "pending",
        campaign: params.campaign?.trim() || null,
        company_id: params.companyId ?? null,
        user_id: params.userId ?? null,
        referral_id: params.referralId ?? null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: "db_insert_failed", detail: error.message };
    deliveryId = created.id as string;
  } else {
    await db
      .from("quidli_deliveries")
      .update({ status: "pending", error: null, updated_at: new Date().toISOString() })
      .eq("id", deliveryId);
  }

  const apiResult = await dropToHandles({
    platform,
    handle,
    amountUsdc,
    memo: params.memo,
    idempotencyKey,
  });

  if (!apiResult.ok) {
    await db
      .from("quidli_deliveries")
      .update({
        status: "failed",
        error: apiResult.error,
        raw: { detail: apiResult.detail ?? null },
        updated_at: new Date().toISOString(),
      })
      .eq("id", deliveryId);
    return { ok: false, error: apiResult.error, detail: apiResult.detail };
  }

  await db
    .from("quidli_deliveries")
    .update({
      status: "submitted",
      quidli_ref: apiResult.quidliRef,
      raw: apiResult.raw ?? {},
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deliveryId);

  return {
    ok: true,
    deliveryId,
    status: "submitted",
    quidliRef: apiResult.quidliRef,
  };
}
