import { supabase } from "@/integrations/supabase/client";

const ATLAS_MEMORY =
  "Chief executive. Learns from every approved task. Prefer clear founder direction, compounding channels, and honest metrics over vanity numbers.";

/**
 * Bootstrap a real empty company for a new founder.
 * No fake MRR, deals, campaigns, channels, or seed activity.
 */
export async function createEmptyCompany(ownerId: string) {
  const { count } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true });
  const seatNumber = Math.max(1, (count ?? 0) + 1);

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      owner_id: ownerId,
      name: "Untitled company",
      tagline: null,
      emoji: "◎",
      credits: 0,
      runway_days: 0,
      mrr: 0,
      strategy: null,
      autonomy: 0,
    })
    .select()
    .single();
  if (error || !company) throw error ?? new Error("Could not create company");

  const cid = company.id;

  await Promise.all([
    supabase.from("agents").insert({
      company_id: cid,
      name: "Atlas",
      role: "Chief Executive",
      avatar: "◎",
      accent: "cyan",
      status: "active",
      current_task: "Waiting for founder direction",
      health: 100,
      performance: 0,
      activity: 0,
      revenue_generated: 0,
      credits_used: 0,
      tasks_completed: 0,
      lessons_count: 0,
      memory: ATLAS_MEMORY,
    }),
    supabase.from("founder_progress").insert({
      company_id: cid,
      xp: 0,
      level: 1,
      streak_days: 0,
      seat_number: seatNumber,
      onboarded: false,
      completed_quests: [],
    }),
    supabase.from("activity_events").insert({
      company_id: cid,
      kind: "system",
      message: "Company created. Atlas is ready — approve the first proposal to begin.",
    }),
  ]);

  return company;
}
