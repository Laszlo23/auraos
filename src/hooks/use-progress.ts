import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-aura";

export type Progress = {
  id: string;
  company_id: string;
  xp: number;
  level: number;
  streak_days: number;
  last_active: string;
  onboarded: boolean;
  completed_quests: string[];
  seat_number: number;
};

/** Level curve — each level costs a little more, so momentum always feels earned. */
export const xpForLevel = (level: number) => 400 + (level - 1) * 260;

export function levelFromXp(xp: number) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, into: remaining, needed: xpForLevel(level) };
}

export function useProgress() {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["progress", company?.id],
    enabled: Boolean(company?.id),
    staleTime: 15_000,
    queryFn: async (): Promise<Progress> => {
      const { data, error } = await supabase
        .from("founder_progress")
        .select("*")
        .eq("company_id", company!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Progress;
      const { count } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true });
      const { data: created, error: insertError } = await supabase
        .from("founder_progress")
        .insert({
          company_id: company!.id,
          xp: 0,
          level: 1,
          streak_days: 0,
          seat_number: Math.max(1, count ?? 1),
          onboarded: false,
          completed_quests: [],
        })
        .select("*")
        .single();
      if (insertError) throw insertError;
      return created as Progress;
    },
  });
}

export function useAwardXp() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const { data: progress } = useProgress();
  return useMutation({
    mutationFn: async ({ amount, quest }: { amount: number; quest?: string | undefined }) => {
      if (!company || !progress) return null;
      const quests = new Set(progress.completed_quests ?? []);
      if (quest) {
        if (quests.has(quest)) return null;
        quests.add(quest);
      }
      const xp = progress.xp + amount;
      const { level } = levelFromXp(xp);
      const { error } = await supabase
        .from("founder_progress")
        .update({ xp, level, completed_quests: Array.from(quests) })
        .eq("company_id", company.id);
      if (error) throw error;
      return { xp, level, leveled: level > progress.level };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["progress"] }),
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async () => {
      if (!company) return;
      const { error } = await supabase
        .from("founder_progress")
        .update({ onboarded: true })
        .eq("company_id", company.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["progress"] }),
  });
}
