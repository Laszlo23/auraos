import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-aura";
import { levelFromXp } from "@/hooks/use-progress";
import { awardProgress, joinAuraScout, mergeSignupGrowthProgress } from "@/lib/progress/award";
import { questByKey } from "@/lib/progress/registry";

export type UserProgress = {
  user_id: string;
  xp: number;
  level: number;
  rep: number;
  streak_days: number;
  last_active: string | null;
  city_id: string;
  genesis_number: number | null;
  completed_quests: string[];
  joined_at: string;
  updated_at: string;
};

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  glyph: string;
  sort_order: number;
  unlock_event: string | null;
  min_xp: number;
  min_rep: number;
};

export type UserAchievement = {
  achievement_id: string;
  unlocked_at: string;
};

export function useUserProgress() {
  return useQuery({
    queryKey: ["user-progress"],
    staleTime: 15_000,
    queryFn: async (): Promise<UserProgress | null> => {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as UserProgress;

      const { error: ensureErr } = await supabase.rpc("ensure_user_progress");
      if (ensureErr) throw ensureErr;

      const { data: created, error: again } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (again) throw again;
      return created as UserProgress;
    },
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: defs, error: defErr } = await supabase
        .from("achievement_definitions")
        .select("*")
        .order("sort_order");
      if (defErr) throw defErr;

      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      let unlocked: UserAchievement[] = [];
      if (user) {
        const { data: ua, error: uaErr } = await supabase
          .from("user_achievements")
          .select("achievement_id, unlocked_at")
          .eq("user_id", user.id);
        if (uaErr) throw uaErr;
        unlocked = (ua ?? []) as UserAchievement[];
      }

      const unlockedSet = new Set(unlocked.map((u) => u.achievement_id));
      return {
        definitions: (defs ?? []) as AchievementDef[],
        unlocked: unlockedSet,
        unlockedAt: new Map(unlocked.map((u) => [u.achievement_id, u.unlocked_at])),
      };
    },
  });
}

export function useAwardProgress() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async ({
      eventKey,
      xp,
      rep,
      idempotencyKey,
    }: {
      eventKey: string;
      xp?: number;
      rep?: number;
      idempotencyKey?: string;
    }) => {
      const quest = questByKey(eventKey);
      return awardProgress({
        eventKey,
        xp: xp ?? quest?.xp ?? 0,
        rep,
        companyId: company?.id,
        idempotencyKey,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["user-progress"] });
      void qc.invalidateQueries({ queryKey: ["achievements"] });
      void qc.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

export function useMergeSignupGrowth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mergeSignupGrowthProgress,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["user-progress"] });
      void qc.invalidateQueries({ queryKey: ["progress"] });
      void qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export function useJoinScout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => joinAuraScout("wien"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["user-progress"] });
      void qc.invalidateQueries({ queryKey: ["achievements"] });
      void qc.invalidateQueries({ queryKey: ["scout"] });
    },
  });
}

export function useViennaLeaderboard(limit = 20) {
  return useQuery({
    queryKey: ["vienna-leaderboard", limit],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("vienna_city_leaderboard", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as {
        user_id: string;
        display_name: string;
        xp: number;
        rep: number;
        level: number;
        is_scout: boolean;
        businesses_onboarded: number;
      }[];
    },
  });
}

export function userLevelRail(xp: number) {
  return levelFromXp(xp);
}
