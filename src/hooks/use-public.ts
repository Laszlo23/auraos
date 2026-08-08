import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeedRow = {
  id: string;
  source: string;
  kind: string | null;
  handle: string | null;
  title: string | null;
  detail: string | null;
  amount: number | null;
  tx_hash: string | null;
  created_at: string | null;
};

/** Anonymised network-wide activity stream. Public, no login. */
export function usePublicFeed(limit = 60) {
  return useQuery({
    queryKey: ["public-feed", limit],
    refetchInterval: 8_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as FeedRow[];
    },
  });
}

export type NetworkTotals = {
  usdc_paid: number | null;
  paid_calls: number | null;
  agents: number | null;
  companies: number | null;
  actions_24h: number | null;
};

/** Live network counters — real numbers, never hand-written. */
export function useNetworkTotals() {
  return useQuery({
    queryKey: ["network-totals"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_network_totals")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as NetworkTotals | null;
    },
  });
}

export type PublicAgent = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  accent: string;
  status: string;
  performance: number;
  revenue_generated: number;
};

export function usePublicAgents(handle?: string) {
  return useQuery({
    queryKey: ["public-agents", handle],
    enabled: Boolean(handle),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_company_agents")
        .select("id, name, role, avatar, accent, status, performance, revenue_generated")
        .eq("handle", handle!)
        .order("revenue_generated", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublicAgent[];
    },
  });
}

export type PublicStats = {
  x402_calls: number | null;
  x402_revenue: number | null;
  agent_revenue: number | null;
  agent_count: number | null;
  wallets_bound: number | null;
};

export function usePublicStats(handle?: string) {
  return useQuery({
    queryKey: ["public-stats", handle],
    enabled: Boolean(handle),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_company_stats")
        .select("x402_calls, x402_revenue, agent_revenue, agent_count, wallets_bound")
        .eq("handle", handle!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PublicStats | null;
    },
  });
}
