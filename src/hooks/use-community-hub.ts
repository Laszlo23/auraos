import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type SquadMember = {
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string;
  avatar: string;
  level: number;
  rep: number;
};

export type SquadTask = {
  id: string;
  title: string;
  status: string;
  xp_reward: number;
  created_at: string;
  completed_at: string | null;
};

export type SquadPost = {
  id: string;
  author_name: string;
  author_avatar: string;
  body: string;
  share_world: boolean;
  created_at: string;
};

export type MySquad = {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  invite_code: string;
  squad_xp: number;
  member_count: number;
  role: string;
};

export type TopSquad = {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  squad_xp: number;
  member_count: number;
};

export type WorldPulsePost = {
  id: string;
  squad_name: string;
  squad_emoji: string;
  author_name: string;
  body: string;
  created_at: string;
};

export type CommunityHub = {
  my_squad: MySquad | null;
  members: SquadMember[];
  tasks: SquadTask[];
  posts: SquadPost[];
  top_squads: TopSquad[];
  world_pulse: WorldPulsePost[];
};

export function useCommunityHub() {
  return useQuery({
    queryKey: ["community-hub"],
    staleTime: 8_000,
    refetchInterval: 12_000,
    queryFn: async (): Promise<CommunityHub> => {
      const { data, error } = await supabase.rpc("get_community_hub", { _squad_limit: 12 });
      if (error) throw error;
      const hub = data as CommunityHub;
      return {
        my_squad: hub.my_squad ?? null,
        members: hub.members ?? [],
        tasks: hub.tasks ?? [],
        posts: hub.posts ?? [],
        top_squads: hub.top_squads ?? [],
        world_pulse: hub.world_pulse ?? [],
      };
    },
  });
}

export function useCreateSquad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, emoji }: { name: string; emoji?: string }) => {
      const { data, error } = await supabase.rpc("create_aura_squad", {
        _name: name,
        _emoji: emoji ?? "◈",
      });
      if (error) throw error;
      return data as { squad_id: string; slug: string; invite_code: string; name: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community-hub"] });
      void qc.invalidateQueries({ queryKey: ["user-progress"] });
      void qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export function useJoinSquad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("join_aura_squad", {
        _invite_code: code.trim().toUpperCase(),
      });
      if (error) throw error;
      return data as { squad_id: string; slug: string; name: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community-hub"] });
      void qc.invalidateQueries({ queryKey: ["user-progress"] });
      void qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export function usePostSquadUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      squadId,
      body,
      shareWorld,
    }: {
      squadId: string;
      body: string;
      shareWorld?: boolean;
    }) => {
      const { data, error } = await supabase.rpc("post_squad_update", {
        _squad_id: squadId,
        _body: body,
        _share_world: shareWorld ?? false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community-hub"] });
      void qc.invalidateQueries({ queryKey: ["user-progress"] });
    },
  });
}

export function useCreateSquadTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ squadId, title }: { squadId: string; title: string }) => {
      const { data, error } = await supabase.rpc("create_squad_task", {
        _squad_id: squadId,
        _title: title,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["community-hub"] }),
  });
}

export function useCompleteSquadTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase.rpc("complete_squad_task", { _task_id: taskId });
      if (error) throw error;
      return data as { ok: boolean; xp: number };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community-hub"] });
      void qc.invalidateQueries({ queryKey: ["user-progress"] });
      void qc.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}
