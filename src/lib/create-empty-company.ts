import { supabase } from "@/integrations/supabase/client";
import { peekFunnel, peekLocale, rememberLocale, takeFunnel } from "@/lib/attribution";
import { isFunnelId, type FunnelId } from "@/lib/funnels";

const ATLAS_MEMORY =
  "Chief executive. Learns from every approved task. Prefer clear founder direction, compounding channels, and honest metrics over vanity numbers.";

/**
 * Bootstrap a real empty company for a new founder.
 * No fake MRR, deals, campaigns, channels, or seed activity.
 */
export async function createEmptyCompany(ownerId: string, entryFunnel?: FunnelId) {
  // Prefer indexed seat counter over a full companies table scan.
  let seatNumber = 1;
  const { data: taken } = await supabase.rpc("founding_seats_taken");
  if (typeof taken === "number" && Number.isFinite(taken)) {
    seatNumber = Math.max(1, taken + 1);
  } else {
    const { count } = await supabase
      .from("founder_progress")
      .select("id", { count: "exact", head: true });
    seatNumber = Math.max(1, (count ?? 0) + 1);
  }

  const funnelRaw = entryFunnel ?? peekFunnel();
  const funnel: FunnelId = isFunnelId(funnelRaw) ? funnelRaw : "os";
  const uiLocale = peekLocale() === "de" ? "de" : "en";
  const lokalDefaultName = uiLocale === "de" ? "Mein Betrieb" : "My shop";

  // Funnel free-door: never invent a second company for the same owner.
  const { data: existing } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      owner_id: ownerId,
      name: funnel === "local" ? lokalDefaultName : "Untitled company",
      tagline: null,
      emoji: "◎",
      credits: 0,
      runway_days: 0,
      mrr: 0,
      strategy: null,
      autonomy: 0,
      entry_funnel: funnel,
      ui_locale: uiLocale,
      ...(funnel === "local"
        ? { is_local_business: true, network_backlink: true }
        : {}),
    })
    .select()
    .single();
  if (error || !company) {
    const msg = error?.message ?? "Could not create company";
    if (/funnel_company_limit/i.test(msg)) {
      const { data: again } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (again) return again;
    }
    if (/row-level security|policy|42501/i.test(msg)) {
      throw new Error(
        funnel === "os"
          ? "Invite required — buy a founding seat with a valid invite before creating a company."
          : "Could not create company — check your connection and try again.",
      );
    }
    throw error ?? new Error(msg);
  }

  const cid = company.id;

  if (funnel === "local") {
    const { error: cohortErr } = await supabase.rpc("assign_local_cohort", {
      _company_id: cid,
    });
    if (cohortErr) {
      console.warn("[createEmptyCompany] local cohort", cohortErr.message);
    }
  }

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

  takeFunnel();
  rememberLocale(uiLocale);
  return company;
}
