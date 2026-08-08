import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chainId, activeNetwork } from "@/lib/chain-config";
import { USDC_ADDRESSES } from "@/lib/chain-config";

/** Public status of OKX rails (no secrets). */
export const getOkxStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { okxConfigured, okxBuilderCode, okxPayoutAddress } = await import("./okx.server");
  return {
    configured: okxConfigured(),
    builderCode: Boolean(okxBuilderCode()),
    payoutConfigured: Boolean(okxPayoutAddress()),
    network: activeNetwork(),
    label: activeNetwork() === "base" ? "Base" : "Base Sepolia",
    chainId: String(chainId(activeNetwork())),
  };
});

/** Quote a DEX route for the company's smart-wallet treasury. */
export const quoteOkxSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      toTokenAddress: string;
      amount: string;
      fromTokenAddress?: string;
      slippage?: string;
    }) => {
      if (!input.toTokenAddress || !input.amount) throw new Error("Token and amount required.");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { okxDexQuote, okxTokenSecurity, okxConfigured } = await import("./okx.server");
    if (!okxConfigured()) throw new Error("OKX DEX rails are not configured.");

    const network = activeNetwork();
    const cid = String(chainId(network));
    const from = (data.fromTokenAddress || USDC_ADDRESSES[network]) as string;

    const security = await okxTokenSecurity({ chainId: cid, tokenAddress: data.toTokenAddress });
    const quote = await okxDexQuote({
      chainId: cid,
      fromTokenAddress: from,
      toTokenAddress: data.toTokenAddress,
      amount: data.amount,
      ...(data.slippage ? { slippage: data.slippage } : {}),
    });

    return {
      quote: {
        chainId: quote.chainId,
        fromToken: quote.fromToken,
        toToken: quote.toToken,
        amount: quote.amount,
        estimatedAmount: quote.estimatedAmount ?? null,
      },
      securityOk: security.ok,
    };
  });

/** Fetch swap calldata for a treasury address (does not broadcast). */
export const prepareOkxSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      toTokenAddress: string;
      amount: string;
      userWalletAddress: string;
      fromTokenAddress?: string;
      slippage?: string;
    }) => {
      if (!input.toTokenAddress || !input.amount || !input.userWalletAddress) {
        throw new Error("Token, amount and wallet are required.");
      }
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { okxDexSwap, okxTokenSecurity, okxConfigured } = await import("./okx.server");
    if (!okxConfigured()) throw new Error("OKX DEX rails are not configured.");

    const network = activeNetwork();
    const cid = String(chainId(network));
    const from = (data.fromTokenAddress || USDC_ADDRESSES[network]) as string;

    const security = await okxTokenSecurity({ chainId: cid, tokenAddress: data.toTokenAddress });
    if (!security.ok) {
      console.warn("OKX token security check failed", security.raw);
    }

    const swap = await okxDexSwap({
      chainId: cid,
      fromTokenAddress: from,
      toTokenAddress: data.toTokenAddress,
      amount: data.amount,
      userWalletAddress: data.userWalletAddress,
      ...(data.slippage ? { slippage: data.slippage } : {}),
    });

    return {
      swapJson: JSON.stringify(swap ?? null),
      securityOk: security.ok,
      builderAttributed: true as const,
    };
  });
