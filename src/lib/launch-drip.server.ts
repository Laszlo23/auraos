import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SOCIAL_AGENTS } from "@/lib/social-oauth.server";
import {
  buildLaunchDripSchedule,
  buildFarcasterDripSchedule,
  buildLinkedInDripSchedule,
  buildMissedDripSlots,
  buildT0AnnounceSlots,
  LAUNCH_DRIP_CAMPAIGN,
  FARCASTER_DRIP_CAMPAIGN,
  LINKEDIN_DRIP_CAMPAIGN,
  T0_ANNOUNCE_CAMPAIGN,
  buildOsMessageSlots,
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
      if (error.code === "23505") {
        skipped += 1;
        if (s.sharePostId === "tickpix-pit") {
          await supabaseAdmin
            .from("channel_posts")
            .update({ body: s.body })
            .eq("company_id", companyId)
            .eq("campaign_key", s.campaignKey)
            .eq("provider", "x")
            .eq("status", "scheduled");
        }
      } else throw error;
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
      if (error.code === "23505") {
        skipped += 1;
        if (s.sharePostId === "tickpix-pit") {
          await supabaseAdmin
            .from("channel_posts")
            .update({ body: s.body })
            .eq("company_id", companyId)
            .eq("campaign_key", s.campaignKey)
            .eq("provider", "farcaster")
            .eq("status", "scheduled");
        }
      } else throw error;
    } else {
      created += 1;
    }
  }

  return { created, skipped };
}

/** Seed LinkedIn founder posts (text only, 1/day). Idempotent on campaign_key. */
export async function seedLinkedInDripSlots(
  companyId: string,
): Promise<{ created: number; skipped: number }> {
  const slots = buildLinkedInDripSchedule();
  if (!slots.length) return { created: 0, skipped: 0 };
  let created = 0;
  let skipped = 0;

  for (const s of slots) {
    const { error } = await supabaseAdmin.from("channel_posts").insert({
      company_id: companyId,
      provider: "linkedin",
      body: s.body,
      status: "scheduled",
      scheduled_at: s.scheduledAt,
      agent_name: SOCIAL_AGENTS.linkedin,
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

function linkedInCanPublish(scopes: string | null | undefined): boolean {
  const parts = String(scopes ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return parts.includes("w_member_social") && process.env["LINKEDIN_SHARE_SCOPE"] === "1";
}

/**
 * Queue the 48h T-0 announce (no CA) as due-now posts.
 * Idempotent via (company_id, campaign_key).
 */
export async function seedT0AnnouncePosts(
  companyId: string,
  opts: { x?: boolean; farcaster?: boolean; linkedIn?: boolean } = {},
): Promise<{ created: number; skipped: number }> {
  const allow = {
    x: Boolean(opts.x),
    farcaster: Boolean(opts.farcaster),
    linkedin: Boolean(opts.linkedIn),
  };
  const slots = buildT0AnnounceSlots().filter((s) => allow[s.provider]);
  let created = 0;
  let skipped = 0;

  for (const s of slots) {
    const { error } = await supabaseAdmin.from("channel_posts").insert({
      company_id: companyId,
      provider: s.provider,
      body: s.body,
      status: "scheduled",
      scheduled_at: s.scheduledAt,
      agent_name: SOCIAL_AGENTS[s.provider],
      campaign_key: s.campaignKey,
      share_post_id: null,
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

/**
 * Queue the OS message blast (7 clips × X + Farcaster), staggered ~25 min.
 * Idempotent via (company_id, campaign_key). X attaches share_clip; FC is text + watch URL.
 */
export async function seedOsMessageCampaign(
  companyId: string,
  opts: { x?: boolean; farcaster?: boolean } = {},
): Promise<{ created: number; skipped: number }> {
  const allow = {
    x: opts.x !== false,
    farcaster: opts.farcaster !== false,
  };
  const slots = buildOsMessageSlots().filter((s) => allow[s.provider]);
  let created = 0;
  let skipped = 0;

  for (const s of slots) {
    const { error } = await supabaseAdmin.from("channel_posts").insert({
      company_id: companyId,
      provider: s.provider,
      body: s.body,
      status: "scheduled",
      scheduled_at: s.scheduledAt,
      agent_name: SOCIAL_AGENTS[s.provider],
      campaign_key: s.campaignKey,
      share_post_id: s.sharePostId,
      media_kind: s.provider === "x" ? "share_clip" : null,
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
  linkedinCreated: number;
  linkedinSkipped: number;
  catchUpCreated: number;
  catchUpSkipped: number;
  t0Created: number;
  t0Skipped: number;
}> {
  const { data: conns, error } = await supabaseAdmin
    .from("channel_connections")
    .select("company_id, provider, scopes")
    .in("provider", ["x", "farcaster", "linkedin"])
    .eq("status", "connected")
    .eq("auto_publish", true);

  if (error) throw error;

  let created = 0;
  let skipped = 0;
  let farcasterCreated = 0;
  let farcasterSkipped = 0;
  let linkedinCreated = 0;
  let linkedinSkipped = 0;
  let catchUpCreated = 0;
  let catchUpSkipped = 0;
  let t0Created = 0;
  let t0Skipped = 0;
  const xCompanies = new Set<string>();
  const fcCompanies = new Set<string>();
  const liCompanies = new Set<string>();
  const announceCompanies = new Set<string>();

  for (const row of conns ?? []) {
    const companyId = String(row.company_id ?? "");
    const provider = String(row.provider ?? "");
    if (!companyId) continue;

    if (provider === "x" || provider === "farcaster" || provider === "linkedin") {
      if (!announceCompanies.has(companyId)) {
        announceCompanies.add(companyId);
        const mine = (conns ?? []).filter((c) => String(c.company_id) === companyId);
        const t0 = await seedT0AnnouncePosts(companyId, {
          x: mine.some((c) => String(c.provider) === "x"),
          farcaster: mine.some((c) => String(c.provider) === "farcaster"),
          linkedIn: mine.some(
            (c) =>
              String(c.provider) === "linkedin" && linkedInCanPublish(c.scopes as string | null),
          ),
        });
        t0Created += t0.created;
        t0Skipped += t0.skipped;
        if (t0.created > 0) {
          await supabaseAdmin.from("activity_events").insert({
            company_id: companyId,
            kind: "publish",
            message: `T-0 48h announce queued (${T0_ANNOUNCE_CAMPAIGN}, +${t0.created})`,
          });
        }
      }
    }

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
    } else if (provider === "linkedin") {
      if (liCompanies.has(companyId)) continue;
      liCompanies.add(companyId);
      if (!linkedInCanPublish(row.scopes as string | null)) continue;
      const one = await seedLinkedInDripSlots(companyId);
      linkedinCreated += one.created;
      linkedinSkipped += one.skipped;
      if (one.created > 0) {
        await supabaseAdmin.from("activity_events").insert({
          company_id: companyId,
          kind: "publish",
          message: `Orin extended ${LINKEDIN_DRIP_CAMPAIGN} (+${one.created} LinkedIn posts)`,
        });
      }
    }
  }

  return {
    companies: new Set([...xCompanies, ...fcCompanies, ...liCompanies]).size,
    created,
    skipped,
    farcasterCreated,
    farcasterSkipped,
    linkedinCreated,
    linkedinSkipped,
    catchUpCreated,
    catchUpSkipped,
    t0Created,
    t0Skipped,
  };
}
