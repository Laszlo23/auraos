import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-aura";
import { useMyHandle, useUserId } from "@/hooks/use-identity";
import {
  issueAgentSessionKey,
  provisionSmartWallet,
  revokeAgentSessionKey,
} from "@/lib/wallet.functions";

export type ReferralCode = {
  id: string;
  code: string;
  uses: number;
  active: boolean;
};

export type Referral = {
  id: string;
  code: string;
  referrer_id: string;
  referred_id: string | null;
  referred_email: string | null;
  stage: "joined" | "activated" | "subscribed" | string;
  activated_at: string | null;
  subscribed_at: string | null;
  created_at: string;
};

export type Earning = {
  id: string;
  kind: string;
  amount: number;
  xp: number;
  reason: string;
  status: "claimable" | "claimed" | "pending" | string;
  claimed_at: string | null;
  created_at: string;
};

export type SessionKey = {
  id: string;
  agent_id: string | null;
  wallet_id: string | null;
  key_address: string;
  label: string | null;
  spend_cap: number;
  spent: number;
  allowed_actions: string[];
  status: string;
  expires_at: string | null;
  created_at: string;
};

/** Reward schedule — paid founding-seat conversions only (in-app AURA, not cash / not token launch). */
export const REFERRAL_TIERS = [
  { stage: "joined", label: "They pay the founding seat", aura: 2500, xp: 200 },
  { stage: "activated", label: "They launch + publish a site", aura: 1500, xp: 150 },
  { stage: "subscribed", label: "They start AURA compute", aura: 3500, xp: 400 },
] as const;

export const REFERRAL_MAX = REFERRAL_TIERS.reduce((n, t) => n + t.aura, 0);

export type FoundingInvite = {
  code: string;
  uses: number;
  max_uses: number;
  active: boolean;
  used: boolean;
  paid_at: string | null;
};

/* -------------------------------------------------------------- referrals */

/** Single founding invite after paid seat (synced to referral_codes for share links). */
export function useReferralCode() {
  const { data: userId } = useUserId();
  return useQuery({
    queryKey: ["referral-code", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ReferralCode | null> => {
      const { data: invite } = await supabase.rpc("get_my_founding_invite");
      const founding = invite as FoundingInvite | null;
      if (founding?.code) {
        return {
          id: founding.code,
          code: founding.code,
          uses: founding.uses,
          active: founding.active && !founding.used,
        };
      }
      const { data, error } = await supabase.rpc("ensure_referral_code");
      if (error) {
        if (/founding_seat_required/i.test(error.message)) return null;
        throw error;
      }
      return (data as unknown as ReferralCode) ?? null;
    },
  });
}

export function useFoundingInvite() {
  const { data: userId } = useUserId();
  return useQuery({
    queryKey: ["founding-invite", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FoundingInvite | null> => {
      const { data, error } = await supabase.rpc("get_my_founding_invite");
      if (error) throw error;
      return (data as FoundingInvite | null) ?? null;
    },
  });
}

export function useReferrals() {
  const { data: userId } = useUserId();
  return useQuery({
    queryKey: ["referrals", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Referral[]> => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Referral[];
    },
  });
}

export function useEarnings() {
  const { data: userId } = useUserId();
  return useQuery({
    queryKey: ["earnings", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Earning[]> => {
      const { data, error } = await supabase
        .from("earnings_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Earning[];
    },
  });
}

/** Sweeps every claimable reward into the company AURA reserve in one atomic call. */
export function useClaimEarnings() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("Launch your company first.");
      const { data, error } = await supabase.rpc("claim_earnings", {
        _company_id: company.id,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["earnings"] });
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      void qc.invalidateQueries({ queryKey: ["progress"] });
      void qc.invalidateQueries({ queryKey: ["company-table"] });
    },
  });
}

/** Attaches the signed-in founder to whoever invited them. Safe to call twice. */
export function useAttributeReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("attribute_referral", {
        _code: code,
      });
      if (error) throw error;
      return Boolean(data);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["earnings"] }),
  });
}

/** Moves the founder's own referral forward, paying whoever invited them. */
export function useAdvanceReferral() {
  return useMutation({
    mutationFn: async (stage: "activated" | "subscribed") => {
      const { data, error } = await supabase.rpc("advance_referral", {
        _stage: stage,
      });
      if (error) throw error;
      return Boolean(data);
    },
  });
}

/* ----------------------------------------------------------- smart wallet */

export function useSmartWallet(handleId?: string) {
  return useQuery({
    queryKey: ["smart-wallet", handleId],
    enabled: Boolean(handleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_bindings")
        .select("*")
        .eq("handle_id", handleId!)
        .eq("kind", "smart")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProvisionSmartWallet() {
  const qc = useQueryClient();
  const { data: handle } = useMyHandle();
  return useMutation({
    mutationFn: async (handleId?: string) => {
      const id = handleId ?? handle?.id;
      if (!id) throw new Error("Claim your @handle first.");
      return provisionSmartWallet({ data: { handleId: id } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["smart-wallet"] });
      void qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

/* ---------------------------------------------------------- session keys */

export const AGENT_PERMISSIONS = [
  { id: "trade", label: "Open & close trades" },
  { id: "spend", label: "Spend AURA on compute" },
  { id: "publish", label: "Publish to channels" },
  { id: "outreach", label: "Send outreach" },
  { id: "payout", label: "Move funds to rewards wallet" },
] as const;

export function useSessionKeys() {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ["session-keys", company?.id],
    enabled: Boolean(company?.id),
    queryFn: async (): Promise<SessionKey[]> => {
      const { data, error } = await supabase
        .from("agent_session_keys")
        .select(
          "id, agent_id, wallet_id, key_address, label, spend_cap, spent, allowed_actions, status, expires_at, created_at",
        )
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SessionKey[];
    },
  });
}

export function useIssueSessionKey() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (input: {
      agentId: string | null;
      walletId: string | null;
      label: string;
      spendCap: number;
      allowedActions: string[];
      days: number;
    }) => {
      if (!company?.id) throw new Error("Launch your company first.");
      return issueAgentSessionKey({ data: { ...input, companyId: company.id } });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["session-keys"] }),
  });
}

export function useRevokeSessionKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeAgentSessionKey({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["session-keys"] }),
  });
}
