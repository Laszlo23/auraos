import { createServerFn } from "@tanstack/react-start";
import type { Address, Hex } from "viem";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  alchemyRpcUrl,
  chainId,
  activeNetwork,
  chainLabel,
  USDC_ADDRESSES,
  USDC_DECIMALS,
  nativeSymbol,
} from "@/lib/chain-config";
import { NATIVE_ETH, WETH_ADDRESSES, explorerTxUrl as buildExplorerTxUrl } from "@/lib/trading/tokens";

/** Public status of OKX rails (no secrets). */
export const getOkxStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { okxConfigured, okxBuilderCode, okxPayoutAddress } = await import("./okx.server");
  const { gasSponsorshipEnabled } = await import("./wallet.server");
  const network = activeNetwork();
  return {
    configured: okxConfigured(),
    builderCode: Boolean(okxBuilderCode()),
    payoutConfigured: Boolean(okxPayoutAddress()),
    gasSponsored: gasSponsorshipEnabled(network),
    network,
    label: chainLabel(network),
    chainId: String(chainId(network)),
    nativeSymbol: nativeSymbol(network),
  };
});

export type TreasurySwapDirection =
  | "eth_to_usdc"
  | "eth_to_weth"
  | "weth_to_usdc"
  | "weth_to_eth"
  | "usdc_to_eth"
  | "usdc_to_weth";

const SWAP_DIRECTIONS = new Set<TreasurySwapDirection>([
  "eth_to_usdc",
  "eth_to_weth",
  "weth_to_usdc",
  "weth_to_eth",
  "usdc_to_eth",
  "usdc_to_weth",
]);

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

function clampSlippagePercent(raw: string | undefined): string {
  const n = Number.parseFloat(String(raw ?? "0.5"));
  if (!Number.isFinite(n)) return "0.5";
  return String(Math.min(3, Math.max(0.1, n)));
}

function friendlyUserOpError(err: unknown, sponsored: boolean, native: string): Error {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    !sponsored &&
    (lower.includes("gas") ||
      lower.includes("fund") ||
      lower.includes("insufficient") ||
      lower.includes("aa21") ||
      lower.includes("aa31"))
  ) {
    return new Error(
      `Need a little ${native} on this wallet for gas (sponsorship is off). Deposit ~0.001 ${native}, then retry.`,
    );
  }
  return err instanceof Error ? err : new Error(msg || "Swap failed");
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
      slippage: clampSlippagePercent(data.slippage),
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
      slippage: clampSlippagePercent(data.slippage),
    });

    return {
      swapJson: JSON.stringify(swap ?? null),
      securityOk: security.ok,
      builderAttributed: true as const,
    };
  });

/**
 * In-app treasury convert via OKX DEX.
 * Broadcasts from the founder's Light Account — leaves a small ETH gas buffer.
 */
export const executeTreasurySwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { direction: string; amount?: string; slippage?: string }) => {
    const direction = String(input.direction || "") as TreasurySwapDirection;
    if (!SWAP_DIRECTIONS.has(direction)) {
      throw new Error("Choose eth↔usdc, eth↔weth, weth↔usdc, or usdc↔eth / usdc↔weth.");
    }
    return {
      direction,
      amount: input.amount ? String(input.amount).trim() : "max",
      slippage: clampSlippagePercent(input.slippage),
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
    const usdcDecimals = USDC_DECIMALS[network];
    const native = nativeSymbol(network);
    const sponsored = gasSponsorshipEnabled(network);

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

    const route: Record<
      TreasurySwapDirection,
      { fromToken: string; toToken: string; fromLabel: string; toLabel: string; decimals: number }
    > = {
      eth_to_usdc: {
        fromToken: NATIVE_ETH,
        toToken: usdc,
        fromLabel: native,
        toLabel: "USDC",
        decimals: 18,
      },
      eth_to_weth: {
        fromToken: NATIVE_ETH,
        toToken: weth,
        fromLabel: native,
        toLabel: "WETH",
        decimals: 18,
      },
      weth_to_usdc: {
        fromToken: weth,
        toToken: usdc,
        fromLabel: "WETH",
        toLabel: "USDC",
        decimals: 18,
      },
      weth_to_eth: {
        fromToken: weth,
        toToken: NATIVE_ETH,
        fromLabel: "WETH",
        toLabel: native,
        decimals: 18,
      },
      usdc_to_eth: {
        fromToken: usdc,
        toToken: NATIVE_ETH,
        fromLabel: "USDC",
        toLabel: native,
        decimals: usdcDecimals,
      },
      usdc_to_weth: {
        fromToken: usdc,
        toToken: weth,
        fromLabel: "USDC",
        toLabel: "WETH",
        decimals: usdcDecimals,
      },
    };

    const spec = route[data.direction];
    const { fromToken, toToken, fromLabel, toLabel, decimals } = spec;

    let amountWei: bigint;
    if (fromToken === NATIVE_ETH) {
      const bal = await nativeBal();
      const buffer = sponsored ? 2n * 10n ** 14n : 10n ** 15n;
      const spendable = bal > buffer ? bal - buffer : 0n;
      if (spendable <= 0n) {
        throw new Error(
          sponsored
            ? `Not enough ${native} to convert.`
            : `Not enough ${native} after gas buffer. Keep ~0.001 ${native} for fees.`,
        );
      }
      amountWei =
        data.amount === "max" || data.amount === ""
          ? spendable
          : parseHumanAmount(data.amount, 18);
      if (amountWei > spendable) amountWei = spendable;
      if (amountWei < 10n ** 12n) throw new Error("Amount too small.");
    } else {
      const bal = await balanceOf(fromToken);
      if (bal <= 0n) throw new Error(`No ${fromLabel} balance to convert.`);
      amountWei =
        data.amount === "max" || data.amount === ""
          ? bal
          : parseHumanAmount(data.amount, decimals);
      if (amountWei > bal) amountWei = bal;
      const minAmt = decimals === 6 ? 10_000n : 10n ** 12n;
      if (amountWei < minAmt) throw new Error("Amount too small.");
      if (!sponsored) {
        const eth = await nativeBal();
        if (eth < 5n * 10n ** 14n) {
          throw new Error(
            `Deposit a little ${native} for gas before exchanging (sponsorship is off).`,
          );
        }
      }
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

    let result: { userOpHash: string; address: Address };
    try {
      result =
        calls.length > 1
          ? await executeBatchUserOps(pk, calls)
          : await executeContractUserOp(pk, calls[0]!);
    } catch (err) {
      throw friendlyUserOpError(err, sponsored, native);
    }

    const { data: company } = await context.supabase
      .from("companies")
      .select("id")
      .eq("owner_id", context.userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (company?.id) {
      const human =
        decimals === 6 ? Number(amountWei) / 10 ** usdcDecimals : Number(amountWei) / 1e18;
      await supabaseAdmin.from("activity_events").insert({
        company_id: company.id,
        kind: "trade",
        message: `Treasury swap ${fromLabel} → ${toLabel} via OKX`,
        value: human,
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
      explorerTxUrl: buildExplorerTxUrl(network, result.userOpHash),
    };
  });
