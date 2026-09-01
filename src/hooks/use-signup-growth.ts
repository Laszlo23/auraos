import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type SignupGrowth = {
  xp: number;
  quests: string[];
  founderGoal: string | null;
};

export function useSignupGrowth({ enabled = true }: { enabled?: boolean } = {}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["signup-growth"],
    enabled,
    staleTime: 10_000,
    queryFn: async (): Promise<SignupGrowth> => {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) {
        return { xp: 0, quests: [], founderGoal: null };
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("growth_xp, growth_quests, founder_goal")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return {
        xp: data?.growth_xp ?? 0,
        quests: data?.growth_quests ?? [],
        founderGoal: data?.founder_goal ?? null,
      };
    },
  });

  const award = useMutation({
    mutationFn: async ({ quest, amount }: { quest: string; amount: number }) => {
      const { data, error } = await supabase.rpc("award_signup_growth", {
        _quest: quest,
        _amount: amount,
      });
      if (error) throw error;
      return data as {
        xp: number;
        quests: string[];
        awarded: number;
        duplicate: boolean;
      };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["signup-growth"] }),
  });

  const saveGoal = useMutation({
    mutationFn: async (goal: string) => {
      const { data, error } = await supabase.rpc("save_founder_goal", { _goal: goal });
      if (error) throw error;
      return data as {
        xp: number;
        quests: string[];
        awarded: number;
        goal: string;
      };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["signup-growth"] }),
  });

  return { ...query, award, saveGoal };
}
