import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-aura";
import { confirmWalletBinding, issueWalletChallenge } from "@/lib/identity.functions";
import { attestFio, resolveFio, revalidateFio } from "@/lib/fio.functions";

export type Handle = {
  id: string;
  user_id: string;
  company_id: string | null;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar: string;
  is_public: boolean;
};

export type WalletBinding = {
  id: string;
  handle_id: string;
  slot: number;
  role: "treasury" | "rewards" | "personal";
  chain: string;
  address: string;
  label: string | null;
  verified: boolean;
  verified_at: string | null;
};

export type FioAttestation = {
  id: string;
  handle_id: string;
  wallet_id: string | null;
  fio_handle: string;
  chain_code: string;
  token_code: string;
  resolved_address: string | null;
  verified: boolean;
  attested_at: string | null;
  status: "valid" | "changed" | "unmapped" | string;
  previous_address: string | null;
  last_checked_at: string | null;
};

export function useFioAttestations(handleId?: string) {
  return useQuery({
    queryKey: ["fio", handleId],
    enabled: Boolean(handleId),
    queryFn: async (): Promise<FioAttestation[]> => {
      const { data, error } = await supabase
        .from("fio_attestations")
        .select("*")
        .eq("handle_id", handleId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as FioAttestation[];
    },
  });
}

/** Looks up what a FIO handle currently maps to, without writing anything. */
export function useResolveFio() {
  return useMutation({
    mutationFn: (input: {
      fioHandle: string;
      chainCode?: string;
      tokenCode?: string;
      tryAlternates?: boolean;
    }) =>
      resolveFio({
        data: {
          fioHandle: input.fioHandle,
          chainCode: input.chainCode ?? "ETH",
          tokenCode: input.tokenCode ?? "ETH",
          tryAlternates: input.tryAlternates ?? true,
        },
      }),
  });
}

/** Binds a FIO handle to a signature-verified wallet slot and stores the attestation. */
export function useAttestFio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      fioHandle: string;
      walletId: string;
      chainCode?: string;
      tokenCode?: string;
      tryAlternates?: boolean;
    }) =>
      attestFio({
        data: {
          fioHandle: input.fioHandle,
          walletId: input.walletId,
          chainCode: input.chainCode ?? "ETH",
          tokenCode: input.tokenCode ?? "ETH",
          tryAlternates: input.tryAlternates ?? true,
        },
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fio"] }),
  });
}

export function useRemoveFioAttestation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fio_attestations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fio"] }),
  });
}

/** Re-checks every stored attestation against the FIO chain. */
export function useRevalidateFio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (handleId: string) => revalidateFio({ data: { handleId } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fio"] }),
  });
}

export const WALLET_ROLES = [
  { id: "treasury", label: "Treasury", blurb: "Holds the company reserve and settles cycles." },
  { id: "rewards", label: "Rewards", blurb: "Receives contest payouts, drops and staking yield." },
  { id: "personal", label: "Personal", blurb: "Your founder wallet — identity and signing." },
] as const;

export function useUserId() {
  return useQuery({
    queryKey: ["user-id"],
    staleTime: Infinity,
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
}

export function useMyHandle() {
  const { data: userId } = useUserId();
  return useQuery({
    queryKey: ["handle", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Handle | null> => {
      const { data, error } = await supabase
        .from("handles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Handle) ?? null;
    },
  });
}

export function usePublicHandle(handle: string) {
  return useQuery({
    queryKey: ["public-handle", handle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handles")
        .select("*, companies(name, emoji, tagline, mrr)")
        .eq("handle", handle)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useClaimHandle() {
  const qc = useQueryClient();
  const { data: userId } = useUserId();
  const { data: company } = useCompany();
  return useMutation({
    mutationFn: async (values: {
      handle: string;
      display_name: string;
      bio?: string;
      avatar?: string;
    }) => {
      const { data, error } = await supabase
        .from("handles")
        .insert({
          user_id: userId!,
          company_id: company?.id ?? null,
          handle: values.handle.trim().toLowerCase(),
          display_name: values.display_name.trim(),
          bio: values.bio ?? null,
          avatar: values.avatar ?? company?.emoji ?? "◎",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Handle;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["handle"] }),
  });
}

export function useUpdateHandle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Handle> & { id: string }) => {
      const { error } = await supabase.from("handles").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["handle"] }),
  });
}

export function useWallets(handleId?: string) {
  return useQuery({
    queryKey: ["wallets", handleId],
    enabled: Boolean(handleId),
    queryFn: async (): Promise<WalletBinding[]> => {
      const { data, error } = await supabase
        .from("wallet_bindings")
        .select(
          "id, address, kind, chain, deployed, legacy, custody, label, provider, verified, owner_address, handle_id, role, slot, created_at, user_id",
        )
        .eq("handle_id", handleId!)
        .order("slot");
      if (error) throw error;
      return (data ?? []) as WalletBinding[];
    },
  });
}

export function useBindWallet() {
  const qc = useQueryClient();
  const { data: userId } = useUserId();
  return useMutation({
    mutationFn: async (values: {
      handleId: string;
      slot: number;
      role: WalletBinding["role"];
      address: string;
      chain?: string;
    }) => {
      const { data, error } = await supabase
        .from("wallet_bindings")
        .upsert(
          {
            user_id: userId!,
            handle_id: values.handleId,
            slot: values.slot,
            role: values.role,
            address: values.address,
            chain: values.chain ?? "base-sepolia",
            verified: false,
            verified_at: null,
          },
          { onConflict: "handle_id,slot" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data as WalletBinding;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["wallets"] }),
  });
}

export function useUnbindWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wallet_bindings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["wallets"] }),
  });
}

/** Full signature round-trip: server issues the nonce, the wallet signs, the server verifies. */
export function useVerifyWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wallet: WalletBinding) => {
      const eth = (
        window as unknown as {
          ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<string> };
        }
      ).ethereum;
      if (!eth) throw new Error("No browser wallet found. Install MetaMask or Rabby to verify.");
      const { message } = await issueWalletChallenge({ data: { walletId: wallet.id } });
      const signature = await eth.request({
        method: "personal_sign",
        params: [message, wallet.address],
      });
      return confirmWalletBinding({ data: { walletId: wallet.id, signature } });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["wallets"] }),
  });
}
