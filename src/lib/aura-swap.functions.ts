import { createServerFn } from "@tanstack/react-start";

import {
  AURA_SWAP_ASSETS,
  auraSwapDeskStatus,
  quoteAuraOfficialSwap,
  type AuraSwapAsset,
} from "@/lib/aura-swap.server";

function asAsset(raw: unknown): AuraSwapAsset {
  const value = String(raw ?? "").toUpperCase();
  return (AURA_SWAP_ASSETS as readonly string[]).includes(value)
    ? (value as AuraSwapAsset)
    : "USDC";
}

export const getAuraSwapDesk = createServerFn({ method: "GET" }).handler(async () => {
  return auraSwapDeskStatus();
});

export const quoteAuraSwap = createServerFn({ method: "GET" })
  .validator((data: { from?: string; to?: string; amount?: string }) => ({
    from: asAsset(data?.from),
    to: asAsset(data?.to),
    amount: String(data?.amount ?? "0"),
  }))
  .handler(async ({ data }) => {
    return quoteAuraOfficialSwap(data);
  });
