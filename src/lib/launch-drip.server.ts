import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SOCIAL_AGENTS } from "@/lib/social-oauth.server";
import { buildLaunchDripSchedule, LAUNCH_DRIP_CAMPAIGN } from "@/lib/x-launch-campaign";

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

/**
 * Keep a rolling 14-day X queue for every connected company with Autopublish on.
 * Call from the worker tick so the drip cannot silently expire.
 */
export async function extendLaunchDrips(): Promise<{
  companies: number;
  created: number;
  skipped: number;
}> {
  const { data: conns, error } = await supabaseAdmin
    .from("channel_connections")
    .select("company_id")
    .eq("provider", "x")
    .eq("status", "connected")
    .eq("auto_publish", true);

  if (error) throw error;

  let created = 0;
  let skipped = 0;
  const companies = new Set<string>();

  for (const row of conns ?? []) {
    const companyId = String(row.company_id ?? "");
    if (!companyId || companies.has(companyId)) continue;
    companies.add(companyId);
    const one = await seedLaunchDripSlots(companyId);
    created += one.created;
    skipped += one.skipped;
    if (one.created > 0) {
      await supabaseAdmin.from("activity_events").insert({
        company_id: companyId,
        kind: "publish",
        message: `Vela extended ${LAUNCH_DRIP_CAMPAIGN} (+${one.created} slots)`,
      });
    }
  }

  return { companies: companies.size, created, skipped };
}
