import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  chainId,
  chainLabel,
  nativeSymbol,
  resolveNetwork,
  stableSymbol,
  type AuraNetwork,
} from "@/lib/chain-config";
import {
  enabledDeskNetworks,
  isDeskNetwork,
  resolveCompanyDeskNetwork,
} from "@/lib/desk-network.server";

export const getDeskNetworks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const current = await resolveCompanyDeskNetwork(context.supabase, {
      userId: context.userId,
    });
    const networks = enabledDeskNetworks().map((id) => ({
      id,
      label: chainLabel(id),
      chainId: chainId(id),
      nativeSymbol: nativeSymbol(id),
      stableSymbol: stableSymbol(id),
      selected: id === current,
    }));
    return { current, networks };
  });

export const setDeskNetwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { network: string }) => {
    const network = resolveNetwork(input.network);
    if (!isDeskNetwork(network) && network !== "base-sepolia" && network !== "opbnb") {
      throw new Error("Unsupported desk network.");
    }
    return { network };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: handle } = await context.supabase
      .from("handles")
      .select("company_id")
      .eq("user_id", context.userId)
      .not("company_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (!handle?.company_id) throw new Error("Create a company first.");

    const network = data.network as AuraNetwork;
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ desk_network: network })
      .eq("id", handle.company_id);
    if (error) throw new Error(error.message);

    return {
      network,
      label: chainLabel(network),
      chainId: chainId(network),
      nativeSymbol: nativeSymbol(network),
      stableSymbol: stableSymbol(network),
    };
  });
