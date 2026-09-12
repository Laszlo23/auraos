import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getKycStatus, refreshKycStatus, type KycView } from "@/lib/kyc.functions";

async function createVerifySession(): Promise<{ url: string; session_id: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sign in to verify your identity.");
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    url?: string;
    session_id?: string;
    error?: string;
  };
  if (!res.ok || !payload.url || !payload.session_id) {
    throw new Error(payload.error === "kyc_not_configured" ? "KYC is not configured." : "Could not start verification.");
  }
  return { url: payload.url, session_id: payload.session_id };
}

export function useKycPublicConfig() {
  return useQuery({
    queryKey: ["kyc-public"],
    queryFn: async () => {
      const res = await fetch("/api/public/kyc-health");
      if (!res.ok) throw new Error("KYC health check failed");
      return (await res.json()) as { configured: boolean; gates: string[] };
    },
    staleTime: 60_000,
  });
}

export function useKycStatus(enabled = true) {
  return useQuery({
    queryKey: ["kyc-status"],
    queryFn: () => getKycStatus() as Promise<KycView>,
    enabled,
    staleTime: 15_000,
  });
}

export function useStartKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createVerifySession(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["kyc-status"] });
    },
  });
}

export function useRefreshKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refreshKycStatus() as Promise<KycView>,
    onSuccess: async (status) => {
      qc.setQueryData(["kyc-status"], status);
    },
  });
}

/** Hard-require approved KYC when the host gates this action. */
export function requireKycApproved(view: KycView | undefined, gate: "sale" | "trading"): boolean {
  if (!view?.configured) return true;
  if (!view.gates.includes(gate)) return true;
  return view.approved;
}
