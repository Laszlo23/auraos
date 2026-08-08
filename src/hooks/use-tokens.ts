import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-aura";
import { planById } from "@/lib/plans";
import { cycleWindow } from "@/lib/subscription";

export type Subscription = {
  id: string;
  company_id: string;
  plan: string;
  status: string;
  tokens_per_cycle: number;
  tokens_remaining: number;
  cycle_start: string;
  cycle_end: string;
  payment_mode: string;
  wallet_address: string | null;
  tx_hash: string | null;
  auto_renew: boolean;
};

export type LedgerEntry = {
  id: string;
  kind: string;
  amount: number;
  reason: string;
  created_at: string;
};

export function useSubscription() {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["subscription", company?.id],
    enabled: Boolean(company?.id),
    staleTime: 30_000,
    queryFn: async (): Promise<Subscription> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("company_id", company!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Subscription;

      const plan = planById("company");
      const { data: created, error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          company_id: company!.id,
          plan: plan.id,
          tokens_per_cycle: plan.tokens,
          tokens_remaining: Math.round(plan.tokens * 0.62),
        })
        .select("*")
        .single();
      if (insertError) throw insertError;
      return created as Subscription;
    },
  });
}

export function useTokenLedger(limit = 12) {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["token-ledger", company?.id, limit],
    enabled: Boolean(company?.id),
    staleTime: 20_000,
    queryFn: async (): Promise<LedgerEntry[]> => {
      const { data, error } = await supabase
        .from("token_ledger")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as LedgerEntry[];
    },
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (values: Partial<Subscription>) => {
      const { error } = await supabase
        .from("subscriptions")
        .update(values)
        .eq("company_id", company!.id);
      if (error) throw error;

      // A paid plan is the last referral milestone — credit the inviter once.
      if (values.status === "active" && values.plan) {
        await supabase.rpc("advance_referral", { _stage: "subscribed" });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      void qc.invalidateQueries({ queryKey: ["token-ledger"] });
      void qc.invalidateQueries({ queryKey: ["earnings"] });
    },
  });
}

export function useLogTokens() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (entry: { kind: "grant" | "burn"; amount: number; reason: string }) => {
      const { error } = await supabase
        .from("token_ledger")
        .insert({ ...entry, company_id: company!.id });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["token-ledger"] }),
  });
}

/** Rolls the monthly cycle forward: refills the allowance and records the grant. */
export function useRenewCycle() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (sub: Subscription) => {
      const plan = planById(sub.plan);
      const { error } = await supabase
        .from("subscriptions")
        .update({
          ...cycleWindow(),
          tokens_per_cycle: plan.tokens,
          tokens_remaining: plan.tokens,
          status: "active",
        })
        .eq("company_id", company!.id);
      if (error) throw error;
      await supabase.from("token_ledger").insert({
        company_id: company!.id,
        kind: "grant",
        amount: plan.tokens,
        reason: `Cycle renewed · ${plan.name}`,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      void qc.invalidateQueries({ queryKey: ["token-ledger"] });
    },
  });
}
