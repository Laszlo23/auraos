import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CCFF00, ccff00NftContractAddress } from "@/lib/ccff00";

/** Auth: CCFF00 holder status for the signed-in user. */
export const getCcff00Status = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadHasCcff00Nft } = await import("@/lib/ccff00.server");
    const status = await loadHasCcff00Nft(context.supabase, { userId: context.userId });
    return {
      ...status,
      contract: ccff00NftContractAddress(),
      mintUrl: CCFF00.mintUrl,
      siteUrl: CCFF00.siteUrl,
    };
  });

/** Verify linked wallet holds CCFF00 NFT, then award the one-time verify quest. */
export const claimCcff00VerifyQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadHasCcff00Nft } = await import("@/lib/ccff00.server");
    const status = await loadHasCcff00Nft(context.supabase, { userId: context.userId });
    if (!status.owns) {
      throw new Error(
        "No CCFF00 NFT on a linked wallet. Mint at hoodstreet.capital/ccff00, then link that wallet under Identity.",
      );
    }

    const { data, error } = await (context.supabase as any).rpc("award_progress", {
      _event_key: "ccff00:verify",
      _xp_amount: 80,
      _rep_amount: 6,
      _company_id: null,
      _idempotency_key: "ccff00:verify",
      _meta: {
        balance: status.balance,
        address: status.address,
        contract: ccff00NftContractAddress(),
      },
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, awarded: data, ...status };
  });
