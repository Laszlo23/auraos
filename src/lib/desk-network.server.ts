/**
 * Per-company desk network resolution (true multichain).
 * x402 settlement stays on Base via x402SettleNetwork() — never use desk network for EIP-3009.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  activeNetwork,
  resolveNetwork,
  type AuraNetwork,
} from "@/lib/chain-config";
import type { Database } from "@/integrations/supabase/types";

/** Chains exposed in the Wallet / Trading switcher by default. */
export const DEFAULT_DESK_NETWORKS: AuraNetwork[] = ["base", "bsc", "robinhood"];

export function enabledDeskNetworks(): AuraNetwork[] {
  const raw = process.env["DESK_NETWORKS"]?.trim();
  if (!raw) return DEFAULT_DESK_NETWORKS;
  const list = raw
    .split(",")
    .map((s) => resolveNetwork(s.trim()))
    .filter((n, i, arr) => arr.indexOf(n) === i);
  return list.length ? list : DEFAULT_DESK_NETWORKS;
}

export function isDeskNetwork(network: string): network is AuraNetwork {
  return enabledDeskNetworks().includes(resolveNetwork(network));
}

/**
 * Resolve which chain a company is operating on.
 * Preference order: companies.desk_network → process activeNetwork() → base.
 */
export async function resolveCompanyDeskNetwork(
  supabase: SupabaseClient<Database>,
  opts: { userId?: string; companyId?: string },
): Promise<AuraNetwork> {
  let companyId = opts.companyId ?? null;

  if (!companyId && opts.userId) {
    const { data: handle } = await supabase
      .from("handles")
      .select("company_id")
      .eq("user_id", opts.userId)
      .not("company_id", "is", null)
      .limit(1)
      .maybeSingle();
    companyId = handle?.company_id ?? null;
  }

  if (companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("desk_network")
      .eq("id", companyId)
      .maybeSingle();
    const raw = (company as { desk_network?: string | null } | null)?.desk_network;
    if (raw) {
      const resolved = resolveNetwork(raw);
      if (enabledDeskNetworks().includes(resolved) || resolved === "base-sepolia" || resolved === "opbnb") {
        return resolved;
      }
    }
  }

  const fallback = activeNetwork();
  return enabledDeskNetworks().includes(fallback) ? fallback : "base";
}
