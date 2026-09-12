import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getKycStatus, refreshKycStatus, startKycSession, type KycView } from "@/lib/kyc.functions";

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
    mutationFn: () => startKycSession(),
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
