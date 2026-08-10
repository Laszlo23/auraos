import { createServerFn } from "@tanstack/react-start";
import type { Address, Hex } from "viem";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { alchemyRpcUrl, chainId, activeNetwork, USDC_ADDRESSES } from "@/lib/chain-config";
import { NATIVE_ETH, WETH_ADDRESSES } from "@/lib/trading/tokens";

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

export type TreasurySwapDirection = "eth_to_usdc" | "eth_to_weth" | "weth_to_usdc";

const ERC20_APPROVE_SELECTOR = "0x095ea7b3";

function encodeApprove(spender: Address, amount: bigint): Hex {
  const spenderWord = spender.slice(2).toLowerCase().padStart(64, "0");
  const amountWord = amount.toString(16).padStart(64, "0");
  return `${ERC20_APPROVE_SELECTOR}${spenderWord}${amountWord}` as Hex;
}

function parseHumanAmount(raw: string, decimals: number): bigint {
  const cleaned = String(raw).trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) throw new Error("Invalid amount.");
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

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

/**
 * In-app treasury convert via OKX DEX (ETH ↔ desk inventory).
 * Broadcasts from the founder's Light Account — leaves a small ETH gas buffer.
 */
export const executeTreasurySwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { direction: string; amount?: string; slippage?: string }) => {
    const direction = String(input.direction || "") as TreasurySwapDirection;
    if (direction !== "eth_to_usdc" && direction !== "eth_to_weth" && direction !== "weth_to_usdc") {
      throw new Error("Choose eth_to_usdc, eth_to_weth, or weth_to_usdc.");
    }
    return {
      direction,
      amount: input.amount ? String(input.amount).trim() : "max",
      slippage: input.slippage ? String(input.slippage) : "0.5",
    };
  })
  .handler(async ({ data, context }) => {
    const { okxConfigured, okxDexSwap, parseOkxSwapCalldata } = await import("./okx.server");
    if (!okxConfigured()) throw new Error("OKX DEX rails are not configured on the server.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      decryptOwnerKey,
      executeBatchUserOps,
      executeContractUserOp,
      gasSponsorshipEnabled,
    } = await import("./wallet.server");

    const network = activeNetwork();
    const cid = String(chainId(network));
    const usdc = USDC_ADDRESSES[network];
    const weth = WETH_ADDRESSES[network];

    const { data: wallet } = await supabaseAdmin
      .from("wallet_bindings")
      .select("id, address, owner_key_enc, deployed")
      .eq("user_id", context.userId)
      .eq("kind", "smart")
      .maybeSingle();
    if (!wallet?.address || !wallet.owner_key_enc) {
      throw new Error("Provision your smart wallet on /wallet first.");
    }

    const rpc = alchemyRpcUrl({ network });
    if (!rpc) throw new Error("Alchemy RPC is not configured.");

    const balanceOf = async (token: string): Promise<bigint> => {
      const dataHex = `0x70a08231000000000000000000000000${wallet.address!.slice(2).toLowerCase()}`;
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_call",
          params: [{ to: token, data: dataHex }, "latest"],
        }),
      });
      const json = (await res.json()) as { result?: string };
      return json.result && json.result !== "0x" ? BigInt(json.result) : 0n;
    };
    const nativeBal = async (): Promise<bigint> => {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [wallet.address, "latest"],
        }),
      });
      const json = (await res.json()) as { result?: string };
      return json.result ? BigInt(json.result) : 0n;
    };

    let fromToken: string;
    let toToken: string;
    let amountWei: bigint;
    let fromLabel: string;
    let toLabel: string;

    if (data.direction === "eth_to_usdc" || data.direction === "eth_to_weth") {
      fromToken = NATIVE_ETH;
      toToken = data.direction === "eth_to_usdc" ? usdc : weth;
      fromLabel = "ETH";
      toLabel = data.direction === "eth_to_usdc" ? "USDC" : "WETH";
      const bal = await nativeBal();
      const buffer = gasSponsorshipEnabled() ? 2n * 10n ** 14n : 10n ** 15n;
      const spendable = bal > buffer ? bal - buffer : 0n;
      if (spendable <= 0n) throw new Error("Not enough ETH after gas buffer.");
      amountWei =
        data.amount === "max" || data.amount === ""
          ? spendable
          : parseHumanAmount(data.amount, 18);
      if (amountWei > spendable) amountWei = spendable;
      if (amountWei < 10n ** 12n) throw new Error("Amount too small.");
    } else {
      fromToken = weth;
      toToken = usdc;
      fromLabel = "WETH";
      toLabel = "USDC";
      const bal = await balanceOf(weth);
      if (bal <= 0n) throw new Error("No WETH balance to convert.");
      amountWei =
        data.amount === "max" || data.amount === "" ? bal : parseHumanAmount(data.amount, 18);
      if (amountWei > bal) amountWei = bal;
      if (amountWei < 10n ** 12n) throw new Error("Amount too small.");
    }

    const swapRaw = await okxDexSwap({
      chainId: cid,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount: amountWei.toString(),
      userWalletAddress: wallet.address,
      slippage: data.slippage,
    });
    const parsed = parseOkxSwapCalldata(swapRaw);
    const pk = decryptOwnerKey(wallet.owner_key_enc) as Hex;

    const calls: { target: Address; data: Hex; value?: bigint }[] = [];
    if (fromToken !== NATIVE_ETH) {
      const spender = (parsed.approveTo || parsed.to) as Address;
      calls.push({ target: fromToken as Address, data: encodeApprove(spender, amountWei * 2n) });
    }
    calls.push({
      target: parsed.to,
      data: parsed.data,
      value: parsed.value > 0n ? parsed.value : fromToken === NATIVE_ETH ? amountWei : 0n,
    });

    const result =
      calls.length > 1
        ? await executeBatchUserOps(pk, calls)
        : await executeContractUserOp(pk, calls[0]!);

    const { data: company } = await context.supabase
      .from("companies")
      .select("id")
      .eq("owner_id", context.userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (company?.id) {
      await supabaseAdmin.from("activity_events").insert({
        company_id: company.id,
        kind: "trade",
        message: `Treasury swap ${fromLabel} → ${toLabel} via OKX`,
        value: Number(amountWei) / 1e18,
      });
    }

    return {
      ok: true as const,
      direction: data.direction,
      fromLabel,
      toLabel,
      amountIn: amountWei.toString(),
      estimatedOut: parsed.toAmount ?? null,
      userOpHash: result.userOpHash,
      network,
      explorerTxUrl:
        network === "base"
          ? `https://basescan.org/tx/${result.userOpHash}`
          : `https://sepolia.basescan.org/tx/${result.userOpHash}`,
    };
  });
