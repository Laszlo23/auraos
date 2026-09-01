import { supabase } from "@/integrations/supabase/client";
import { repForEvent } from "@/lib/progress/registry";

export type AwardProgressResult = {
  duplicate: boolean;
  xp: number;
  rep: number;
  level: number;
  streak_days?: number;
  awarded_xp?: number;
  awarded_rep?: number;
  achievements?: string[];
};

export async function awardProgress(opts: {
  eventKey: string;
  xp?: number;
  rep?: number;
  companyId?: string;
  idempotencyKey?: string;
  meta?: Record<string, unknown>;
}): Promise<AwardProgressResult> {
  const rep = opts.rep ?? repForEvent(opts.eventKey);
  const { data, error } = await supabase.rpc("award_progress", {
    _event_key: opts.eventKey,
    _xp_amount: opts.xp ?? 0,
    _rep_amount: rep,
    _company_id: opts.companyId ?? undefined,
    _idempotency_key: opts.idempotencyKey ?? undefined,
    _meta: opts.meta ?? {},
  });
  if (error) throw error;
  const row = data as AwardProgressResult & { achievements?: unknown };
  return {
    ...row,
    achievements: Array.isArray(row.achievements)
      ? row.achievements.filter((a): a is string => typeof a === "string")
      : [],
  };
}

export async function mergeSignupGrowthProgress() {
  const { data, error } = await supabase.rpc("merge_signup_growth_progress");
  if (error) throw error;
  return data as { merged: boolean; xp_added?: number };
}

export async function joinAuraScout(territory = "wien") {
  const { data, error } = await supabase.rpc("join_aura_scout", { _territory: territory });
  if (error) throw error;
  return data as AwardProgressResult;
}

export async function discoverAuraPortal(slug: string) {
  const { data, error } = await supabase.rpc("discover_aura_portal", { _slug: slug });
  if (error) throw error;
  return data as AwardProgressResult;
}
