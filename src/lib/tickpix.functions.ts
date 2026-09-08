import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tickpixContractAddress, tickpixCollectionUrl, TICKPIX } from "@/lib/tickpix";

/** Public/auth: Tickpix holder status for the signed-in user. */
export const getTickpixStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadHasTickpixNft } = await import("@/lib/tickpix.server");
    const status = await loadHasTickpixNft(context.supabase, { userId: context.userId });
    return {
      ...status,
      contract: tickpixContractAddress(),
      mintUrl: TICKPIX.mintUrl,
      collectionUrl: tickpixCollectionUrl(),
      path: TICKPIX.path,
    };
  });

/**
 * Verify linked wallet holds Tickpix, then award the one-time mint quest.
 * Clock-in / share-tape stay honor-system on Community / Quest UI.
 */
export const claimTickpixMintQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadHasTickpixNft } = await import("@/lib/tickpix.server");
    const status = await loadHasTickpixNft(context.supabase, { userId: context.userId });
    if (!status.owns) {
      throw new Error(
        "No Tickpix seat on a linked wallet. Mint at nft.aibusiness.fun, then link that wallet under Identity.",
      );
    }

    // award_progress exists in DB; generated Supabase types lag migrations.
    const { data, error } = await (context.supabase as any).rpc("award_progress", {
      _event_key: "tickpix:mint",
      _xp_amount: 100,
      _rep_amount: 8,
      _company_id: null,
      _idempotency_key: "tickpix:mint",
      _meta: {
        balance: status.balance,
        address: status.address,
        contract: tickpixContractAddress(),
      },
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, awarded: data, ...status };
  });
