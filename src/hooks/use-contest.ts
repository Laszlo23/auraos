import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-aura";
import { useMyHandle, useUserId } from "@/hooks/use-identity";

export type Season = {
  id: string;
  slug: string;
  name: string;
  theme: string | null;
  starts_at: string;
  ends_at: string;
  prize_pool: number;
  status: string;
  rules: string | null;
};

export type Entry = {
  id: string;
  season_id: string;
  company_id: string;
  handle_id: string | null;
  pitch: string | null;
  build_score: number;
  revenue_score: number;
  community_score: number;
  momentum_score: number;
  total_score: number;
  staked_total: number;
  companies?: { name: string; emoji: string; tagline: string | null } | null;
  handles?: { handle: string; display_name: string; avatar: string } | null;
};

export type Milestone = {
  id: string;
  company_id: string;
  kind: string;
  title: string;
  body: string | null;
  metric: string | null;
  cheers: number;
  created_at: string;
  handles?: { handle: string; display_name: string; avatar: string } | null;
  companies?: { name: string; emoji: string } | null;
};

export type Challenge = {
  id: string;
  code: string;
  title: string;
  brief: string | null;
  xp_reward: number;
  token_reward: number;
  points: number;
  sort_order: number;
};

export const MILESTONE_KINDS = ["build", "revenue", "launch", "learning", "win"] as const;

export function useSeason() {
  return useQuery({
    queryKey: ["season"],
    staleTime: 60_000,
    queryFn: async (): Promise<Season | null> => {
      const { data, error } = await supabase
        .from("contest_seasons")
        .select("*")
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Season) ?? null;
    },
  });
}

export function useLeaderboard(seasonId?: string, limit = 50) {
  return useQuery({
    queryKey: ["leaderboard", seasonId, limit],
    enabled: Boolean(seasonId),
    staleTime: 20_000,
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from("contest_entries")
        .select("*, companies(name, emoji, tagline), handles(handle, display_name, avatar)")
        .eq("season_id", seasonId!)
        .order("total_score", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });
}

export function useMyEntry(seasonId?: string) {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["entry", seasonId, company?.id],
    enabled: Boolean(seasonId && company?.id),
    queryFn: async (): Promise<Entry | null> => {
      const { data, error } = await supabase
        .from("contest_entries")
        .select("*, companies(name, emoji, tagline), handles(handle, display_name, avatar)")
        .eq("season_id", seasonId!)
        .eq("company_id", company!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Entry) ?? null;
    },
  });
}

export function useEnterSeason() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const { data: handle } = useMyHandle();
  return useMutation({
    mutationFn: async ({ seasonId, pitch }: { seasonId: string; pitch: string }) => {
      const { data, error } = await supabase
        .from("contest_entries")
        .upsert(
          {
            season_id: seasonId,
            company_id: company!.id,
            handle_id: handle?.id ?? null,
            pitch,
          },
          { onConflict: "season_id,company_id" },
        )
        .select("id")
        .single();
      if (error) throw error;
      await supabase.rpc("recompute_entry_score", { _entry_id: data.id });
      return data.id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entry"] });
      void qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useRecomputeScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.rpc("recompute_entry_score", { _entry_id: entryId });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entry"] });
      void qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useMilestones(opts: { companyId?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ["milestones", opts.companyId ?? "all", opts.limit ?? 30],
    staleTime: 15_000,
    queryFn: async (): Promise<Milestone[]> => {
      let q = supabase
        .from("milestones")
        .select("*, handles(handle, display_name, avatar), companies(name, emoji)")
        .order("created_at", { ascending: false })
        .limit(opts.limit ?? 30);
      if (opts.companyId) q = q.eq("company_id", opts.companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Milestone[];
    },
  });
}

export function usePostMilestone() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const { data: handle } = useMyHandle();
  const { data: season } = useSeason();
  return useMutation({
    mutationFn: async (values: { kind: string; title: string; body?: string; metric?: string }) => {
      const { error } = await supabase.from("milestones").insert({
        company_id: company!.id,
        handle_id: handle?.id ?? null,
        season_id: season?.id ?? null,
        kind: values.kind,
        title: values.title,
        body: values.body ?? null,
        metric: values.metric ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["milestones"] }),
  });
}

export function useCheer() {
  const qc = useQueryClient();
  const { data: userId } = useUserId();
  return useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error } = await supabase
        .from("milestone_cheers")
        .insert({ milestone_id: milestoneId, user_id: userId! });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["milestones"] }),
  });
}

export function useChallenges(seasonId?: string) {
  return useQuery({
    queryKey: ["challenges", seasonId],
    enabled: Boolean(seasonId),
    staleTime: 60_000,
    queryFn: async (): Promise<Challenge[]> => {
      const { data, error } = await supabase
        .from("contest_challenges")
        .select("*")
        .eq("season_id", seasonId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Challenge[];
    },
  });
}

export function useCompletions() {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["completions", company?.id],
    enabled: Boolean(company?.id),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("challenge_completions")
        .select("challenge_id")
        .eq("company_id", company!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.challenge_id as string);
    },
  });
}

export function useCompleteChallenge() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (challenge: Challenge) => {
      const { error } = await supabase
        .from("challenge_completions")
        .insert({ challenge_id: challenge.id, company_id: company!.id });
      if (error && error.code !== "23505") throw error;
      if (challenge.token_reward > 0) {
        await supabase.from("token_ledger").insert({
          company_id: company!.id,
          kind: "grant",
          amount: challenge.token_reward,
          reason: `Challenge — ${challenge.title}`,
        });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["completions"] });
      void qc.invalidateQueries({ queryKey: ["token-ledger"] });
    },
  });
}

export function useStakes(seasonId?: string) {
  const { data: userId } = useUserId();
  return useQuery({
    queryKey: ["stakes", seasonId, userId],
    enabled: Boolean(seasonId && userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contest_stakes")
        .select("entry_id, amount")
        .eq("season_id", seasonId!)
        .eq("backer_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStake() {
  const qc = useQueryClient();
  const { data: userId } = useUserId();
  return useMutation({
    mutationFn: async ({
      seasonId,
      entryId,
      amount,
    }: {
      seasonId: string;
      entryId: string;
      amount: number;
    }) => {
      const { error } = await supabase
        .from("contest_stakes")
        .upsert(
          { season_id: seasonId, entry_id: entryId, backer_id: userId!, amount },
          { onConflict: "entry_id,backer_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stakes"] });
      void qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
