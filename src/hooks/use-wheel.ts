import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-aura";
import { settleGrant } from "@/lib/chain";
import { utcDay } from "@/lib/gamify";

export type Spin = {
  id: string;
  spun_on: string;
  prize_kind: string;
  amount: number;
  label: string;
  xp_awarded: number;
  rare: boolean;
  chain_network: string | null;
  chain_status: string;
  tx_hash: string | null;
  settled_at: string | null;
  created_at: string;
};

/** Untyped RPC bridge — the generated types lag behind new database routines. */
const callRpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export function useTodaySpin() {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["wheel-spin", company?.id, utcDay()],
    enabled: Boolean(company?.id),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Spin | null> => {
      const { data, error } = await supabase
        .from("wheel_spins")
        .select("*")
        .eq("company_id", company!.id)
        .eq("spun_on", utcDay())
        .maybeSingle();
      if (error) throw error;
      return (data as Spin | null) ?? null;
    },
  });
}

/** Recent drops with their (dev-mode) settlement hashes. */
export function useSpinHistory(limit = 6) {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["wheel-history", company?.id, limit],
    enabled: Boolean(company?.id),
    staleTime: 60_000,
    queryFn: async (): Promise<Spin[]> => {
      const { data, error } = await supabase
        .from("wheel_spins")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Spin[];
    },
  });
}

/**
 * One atomic database routine draws the prize, credits AURA, writes the ledger
 * and awards XP — the client can neither pick nor replay a prize. The chain
 * settlement then stamps a (dev-mode) tx hash onto the stored spin.
 */
export function useSpinWheel() {
  const qc = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (): Promise<Spin> => {
      if (!company) throw new Error("No company yet");
      const { data, error } = await callRpc("spin_daily_wheel", { _company_id: company.id });
      if (error) {
        if (error.message.includes("already_spun_today")) throw new Error("Already spun today");
        throw new Error(error.message);
      }
      const spin = data as Spin;

      // Settle on-chain in the background so the wheel can spin immediately.
      void (async () => {
        try {
          const receipt = await settleGrant({
            ref: spin.id,
            amount: spin.amount,
            reason: spin.label,
          });
          await supabase
            .from("wheel_spins")
            .update({
              tx_hash: receipt.txHash,
              chain_network: receipt.network,
              chain_status: receipt.status === "anchored" ? "anchored" : "dev-settled",
              settled_at: new Date().toISOString(),
            })
            .eq("id", spin.id);
          void qc.invalidateQueries({ queryKey: ["wheel-spin"] });
          void qc.invalidateQueries({ queryKey: ["wheel-history"] });
        } catch {
          /* grant already credited in DB — chain stamp is best-effort */
        }
      })();

      return spin;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["wheel-spin"] });
      void qc.invalidateQueries({ queryKey: ["wheel-history"] });
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      void qc.invalidateQueries({ queryKey: ["token-ledger"] });
      void qc.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}
