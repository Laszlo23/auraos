/**
 * Referral growth tips via Quidli — tip the referrer when invitee activates/subscribes.
 */
import { quidliConfigured, quidliDefaultAmountUsdc } from "@/lib/quidli/env";
import { executeQuidliSend } from "@/lib/quidli/send";

type LooseDb = { from: (table: string) => any };

export type ReferralMilestone = "activated" | "subscribed";

type SocialTarget = { platform: "x" | "farcaster"; handle: string; companyId: string };

async function resolveReferrerSocial(
  db: LooseDb,
  referrerUserId: string,
): Promise<SocialTarget | null> {
  const { data: company } = await db
    .from("companies")
    .select("id")
    .eq("owner_id", referrerUserId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!company?.id) return null;

  const { data: connections } = await db
    .from("channel_connections")
    .select("provider, handle, status")
    .eq("company_id", company.id)
    .in("provider", ["x", "farcaster"])
    .order("created_at", { ascending: true })
    .limit(10);

  const rows = (connections ?? []) as {
    provider: string;
    handle: string | null;
    status: string;
  }[];

  const x = rows.find((r) => r.provider === "x" && r.handle?.trim() && r.status !== "disconnected");
  if (x?.handle) {
    return { platform: "x", handle: x.handle.trim(), companyId: company.id as string };
  }
  const fc = rows.find(
    (r) => r.provider === "farcaster" && r.handle?.trim() && r.status !== "disconnected",
  );
  if (fc?.handle) {
    return {
      platform: "farcaster",
      handle: fc.handle.trim(),
      companyId: company.id as string,
    };
  }
  return null;
}

/**
 * Soft-fail tip: never throws. Returns skipped/failed/ok outcome for logging.
 */
export async function tipReferrerForMilestone(opts: {
  db: LooseDb;
  referredUserId: string;
  stage: ReferralMilestone;
}): Promise<{
  ok: boolean;
  skipped?: string;
  error?: string;
  deliveryId?: string;
}> {
  if (!quidliConfigured()) return { ok: false, skipped: "not_configured" };

  try {
    const { data: ref } = await opts.db
      .from("referrals")
      .select("id, referrer_id, stage, activated_at, subscribed_at")
      .eq("referred_id", opts.referredUserId)
      .maybeSingle();

    if (!ref?.id || !ref.referrer_id) return { ok: false, skipped: "no_referral" };

    if (opts.stage === "activated" && !ref.activated_at) {
      return { ok: false, skipped: "not_yet_activated" };
    }
    if (opts.stage === "subscribed" && !ref.subscribed_at) {
      return { ok: false, skipped: "not_yet_subscribed" };
    }

    const social = await resolveReferrerSocial(opts.db, String(ref.referrer_id));
    if (!social) return { ok: false, skipped: "no_social_handle" };

    const amountUsdc = quidliDefaultAmountUsdc();
    const result = await executeQuidliSend(opts.db, {
      platform: social.platform,
      handle: social.handle,
      amountUsdc,
      campaign: `referral_${opts.stage}`,
      idempotencyKey: `referral:${opts.stage}:${ref.id}`,
      companyId: social.companyId,
      userId: String(ref.referrer_id),
      referralId: String(ref.id),
      memo: `Aura referral ${opts.stage} tip`,
    });

    if (!result.ok) {
      console.warn("[quidli] tipReferrerForMilestone failed", result.error, result.detail);
      return { ok: false, error: result.error };
    }
    return { ok: true, deliveryId: result.deliveryId };
  } catch (err) {
    console.warn(
      "[quidli] tipReferrerForMilestone exception",
      err instanceof Error ? err.message : err,
    );
    return { ok: false, error: "exception" };
  }
}
