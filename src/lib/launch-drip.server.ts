import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SOCIAL_AGENTS } from "@/lib/social-oauth.server";
import {
  buildLaunchDripSchedule,
  buildFarcasterDripSchedule,
  buildMissedDripSlots,
  LAUNCH_DRIP_CAMPAIGN,
  FARCASTER_DRIP_CAMPAIGN,
} from "@/lib/x-launch-campaign";

/**
 * Insert missing fair-launch X slots for one company.
 * Idempotent via (company_id, campaign_key).
 */
export async function seedLaunchDripSlots(
  companyId: string,
): Promise<{ created: number; skipped: number }> {
  const slots = buildLaunchDripSchedule();
  if (!slots.length) throw new Error("No drip slots to schedule.");
  let created = 0;
  let skipped = 0;

  for (const s of slots) {
    const { error } = await supabaseAdmin.from("channel_posts").insert({
      company_id: companyId,
      provider: "x",
      body: s.body,
      status: "scheduled",
      scheduled_at: s.scheduledAt,
      agent_name: SOCIAL_AGENTS.x,
      campaign_key: s.campaignKey,
      share_post_id: s.sharePostId,
      media_kind: "share_clip",
      impressions: 0,
      likes: 0,
      reposts: 0,
    });
    if (error) {
      if (error.code === "23505") skipped += 1;
      else throw error;
    } else {
      created += 1;
    }
  }

  return { created, skipped };
}

/** Seed Farcaster casts (text + embed URL, no video). Idempotent on campaign_key. */
export async function seedFarcasterDripSlots(
  companyId: string,
): Promise<{ created: number; skipped: number }> {
  const slots = buildFarcasterDripSchedule();
  if (!slots.length) return { created: 0, skipped: 0 };
  let created = 0;
  let skipped = 0;

  for (const s of slots) {
    const { error } = await supabaseAdmin.from("channel_posts").insert({
      company_id: companyId,
      provider: "farcaster",
      body: s.body,
      status: "scheduled",
      scheduled_at: s.scheduledAt,
      agent_name: SOCIAL_AGENTS.farcaster,
      campaign_key: s.campaignKey,
      share_post_id: s.sharePostId,
      media_kind: null,
      impressions: 0,
      likes: 0,
      reposts: 0,
    });
    if (error) {
      if (error.code === "23505") skipped += 1;
      else throw error;
    } else {
      created += 1;
    }
  }

  return { created, skipped };
}

const CATCHUP_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const CATCHUP_STAGGER_MS = 3 * 60 * 1000;

/**
 * Backfill X drip slots from the last N days that never landed in channel_posts
 * (worker downtime / late seeding). Missed slots become due ASAP, staggered.
 */
export async function seedMissedLaunchDripCatchUp(
  companyId: string,
  lookbackMs: number = CATCHUP_LOOKBACK_MS,
): Promise<{ created: number; skipped: number }> {
  const toMs = Date.now();
  const fromMs = toMs - lookbackMs;
  const slots = buildMissedDripSlots(fromMs, toMs);
  if (!slots.length) return { created: 0, skipped: 0 };

  let created = 0;
  let skipped = 0;
  let dueOffset = 0;

  for (const s of slots) {
    const scheduledAt = new Date(Date.now() + dueOffset).toISOString();
    const { error } = await supabaseAdmin.from("channel_posts").insert({
      company_id: companyId,
      provider: "x",
      body: s.body,
      status: "scheduled",
      scheduled_at: scheduledAt,
      agent_name: SOCIAL_AGENTS.x,
      campaign_key: s.campaignKey,
      share_post_id: s.sharePostId,
      media_kind: "share_clip",
      impressions: 0,
      likes: 0,
      reposts: 0,
    });
    if (error) {
      if (error.code === "23505") skipped += 1;
      else throw error;
    } else {
      created += 1;
      dueOffset += CATCHUP_STAGGER_MS;
    }
  }

  return { created, skipped };
}

/**
 * Keep rolling drip queues for every connected company with Autopublish on.
 * Call from the worker tick so the drip cannot silently expire.
 */
export async function extendLaunchDrips(): Promise<{
  companies: number;
  created: number;
  skipped: number;
  farcasterCreated: number;
  farcasterSkipped: number;
  catchUpCreated: number;
  catchUpSkipped: number;
}> {
  const { data: conns, error } = await supabaseAdmin
    .from("channel_connections")
    .select("company_id, provider")
    .in("provider", ["x", "farcaster"])
    .eq("status", "connected")
    .eq("auto_publish", true);

  if (error) throw error;

  let created = 0;
  let skipped = 0;
  let farcasterCreated = 0;
  let farcasterSkipped = 0;
  let catchUpCreated = 0;
  let catchUpSkipped = 0;
  const xCompanies = new Set<string>();
  const fcCompanies = new Set<string>();

  for (const row of conns ?? []) {
    const companyId = String(row.company_id ?? "");
    const provider = String(row.provider ?? "");
    if (!companyId) continue;

    if (provider === "x") {
      if (xCompanies.has(companyId)) continue;
      xCompanies.add(companyId);
      const catchUp = await seedMissedLaunchDripCatchUp(companyId);
      catchUpCreated += catchUp.created;
      catchUpSkipped += catchUp.skipped;
      if (catchUp.created > 0) {
        await supabaseAdmin.from("activity_events").insert({
          company_id: companyId,
          kind: "publish",
          message: `Vela catch-up replay (+${catchUp.created} missed X drip slots)`,
        });
      }
      const one = await seedLaunchDripSlots(companyId);
      created += one.created;
      skipped += one.skipped;
      if (one.created > 0) {
        await supabaseAdmin.from("activity_events").insert({
          company_id: companyId,
          kind: "publish",
          message: `Vela extended ${LAUNCH_DRIP_CAMPAIGN} (+${one.created} X slots)`,
        });
      }
    } else if (provider === "farcaster") {
      if (fcCompanies.has(companyId)) continue;
      fcCompanies.add(companyId);
      const one = await seedFarcasterDripSlots(companyId);
      farcasterCreated += one.created;
      farcasterSkipped += one.skipped;
      if (one.created > 0) {
        await supabaseAdmin.from("activity_events").insert({
          company_id: companyId,
          kind: "publish",
          message: `Orin extended ${FARCASTER_DRIP_CAMPAIGN} (+${one.created} casts)`,
        });
      }
    }
  }

  return {
    companies: new Set([...xCompanies, ...fcCompanies]).size,
    created,
    skipped,
    farcasterCreated,
    farcasterSkipped,
    catchUpCreated,
    catchUpSkipped,
  };
}
