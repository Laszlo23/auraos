import { createServerFn } from "@tanstack/react-start";
import type { Address, Hex } from "viem";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  activeNetwork,
  alchemyRpcUrl,
  chainId,
  chainLabel,
  explorerBaseUrl,
  nativeSymbol,
  USDC_ADDRESSES,
  USDC_DECIMALS,
} from "@/lib/chain-config";
import { explorerTxUrl, WETH_ADDRESSES } from "@/lib/trading/tokens";

const ERC20_TRANSFER_SELECTOR = "0xa9059cbb";

function isEvmAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function parseHumanAmount(raw: string, decimals: number): bigint {
  const cleaned = String(raw).trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) throw new Error("Invalid amount.");
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

function encodeErc20Transfer(to: Address, amount: bigint): Hex {
  const toWord = to.slice(2).toLowerCase().padStart(64, "0");
  const amountWord = amount.toString(16).padStart(64, "0");
  return `${ERC20_TRANSFER_SELECTOR}${toWord}${amountWord}` as Hex;
}

function explorerBase(network: ReturnType<typeof activeNetwork>) {
  return explorerBaseUrl(network);
}

async function ethCall(url: string, to: string, data: string): Promise<bigint> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = (await res.json()) as { result?: string };
  if (!json.result || json.result === "0x") return 0n;
  return BigInt(json.result);
}

async function ethBalance(url: string, address: string): Promise<bigint> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  const json = (await res.json()) as { result?: string };
  if (!json.result) return 0n;
  return BigInt(json.result);
}

/** Full treasury snapshot for the founder's smart wallet. */
export const getTreasuryBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { gasSponsorshipEnabled } = await import("./wallet.server");
    const network = activeNetwork();
    const { data: wallet } = await context.supabase
      .from("wallet_bindings")
      .select("id, address, deployed, chain, legacy, custody, provider, verified, created_at")
      .eq("user_id", context.userId)
      .eq("kind", "smart")
      .maybeSingle();

    const usdcAddress = USDC_ADDRESSES[network];
    const wethAddress = WETH_ADDRESSES[network];
    const explorer = explorerBase(network);
    const native = nativeSymbol(network);
    const usdcDecimals = USDC_DECIMALS[network];
    const sponsored = gasSponsorshipEnabled(network);
    const base = {
      address: null as string | null,
      walletId: null as string | null,
      usdc: 0,
      eth: 0,
      weth: 0,
      network,
      chainId: chainId(network),
      label: chainLabel(network),
      nativeSymbol: native,
      deployed: false,
      legacy: false,
      verified: false,
      custody: null as string | null,
      provider: null as string | null,
      sponsored,
      usdcToken: usdcAddress,
      wethToken: wethAddress,
      explorerAddressUrl: null as string | null,
      explorerTokenUrl: `${explorer}/token/${usdcAddress}`,
      depositHint:
        network === "bsc" || network === "opbnb"
          ? `Send USDC or ${native} on ${chainLabel(network)} (chain ID ${chainId(network)}). Convert ${native} → USDC in-app for the trading desk.`
          : network === "base"
            ? "Send USDC or ETH on Base (chain ID 8453). Convert ETH → USDC in-app for the trading desk."
            : "Send USDC or ETH on Base Sepolia (testnet). Convert ETH → USDC in-app for the desk.",
    };

    if (!wallet?.address) return base;

    const url = alchemyRpcUrl({ network });
    let usdc = 0;
    let eth = 0;
    let weth = 0;
    if (url) {
      try {
        const balanceOf = `0x70a08231000000000000000000000000${wallet.address.slice(2).toLowerCase()}`;
        const [usdcRaw, ethRaw, wethRaw] = await Promise.all([
          ethCall(url, usdcAddress, balanceOf),
          ethBalance(url, wallet.address),
          ethCall(url, wethAddress, balanceOf),
        ]);
        usdc = Number(usdcRaw) / 10 ** usdcDecimals;
        eth = Number(ethRaw) / 1e18;
        weth = Number(wethRaw) / 1e18;
      } catch {
        usdc = 0;
        eth = 0;
        weth = 0;
      }
    }

    return {
      ...base,
      address: wallet.address as string,
      walletId: wallet.id as string,
      usdc,
      eth,
      weth,
      deployed: Boolean(wallet.deployed),
      legacy: Boolean(wallet.legacy),
      verified: Boolean(wallet.verified),
      custody: (wallet.custody as string) ?? null,
      provider: (wallet.provider as string) ?? null,
      sponsored,
      explorerAddressUrl: `${explorer}/address/${wallet.address}`,
    };
  });

export type TreasuryActivityItem = {
  id: string;
  kind: "transfer_in" | "transfer_out" | "trade" | "spend" | "system";
  title: string;
  detail: string | null;
  amount: number | null;
  asset: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  at: string;
};

/** Recent onchain + app activity for the treasury. */
export const getTreasuryActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const network = activeNetwork();
    const explorer = explorerBase(network);
    const items: TreasuryActivityItem[] = [];

    const { data: wallet } = await context.supabase
      .from("wallet_bindings")
      .select("address")
      .eq("user_id", context.userId)
      .eq("kind", "smart")
      .maybeSingle();

    const { data: company } = await context.supabase
      .from("companies")
      .select("id")
      .eq("owner_id", context.userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (company?.id) {
      const { data: trades } = await context.supabase
        .from("trades")
        .select("id, symbol, side, size, status, tx_hash, rationale, opened_at, created_at")
        .eq("company_id", company.id)
        .order("opened_at", { ascending: false })
        .limit(12);
      for (const t of trades ?? []) {
        const hash = t.tx_hash as string | null;
        items.push({
          id: `trade-${t.id}`,
          kind: "trade",
          title: `${t.side} ${t.symbol}`,
          detail: (t.rationale as string | null) ?? `Status: ${t.status}`,
          amount: Number(t.size),
          asset: "USDC",
          txHash: hash,
          explorerUrl: hash ? `${explorer}/tx/${hash}` : null,
          at: (t.opened_at as string) || (t.created_at as string),
        });
      }

      const { data: ledger } = await context.supabase
        .from("token_ledger")
        .select("id, kind, amount, reason, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(12);
      for (const row of ledger ?? []) {
        items.push({
          id: `ledger-${row.id}`,
          kind: "spend",
          title: String(row.reason ?? row.kind),
          detail: `AURA ledger · ${row.kind}`,
          amount: Number(row.amount),
          asset: "AURA",
          txHash: null,
          explorerUrl: null,
          at: row.created_at as string,
        });
      }

      const { data: events } = await context.supabase
        .from("activity_events")
        .select("id, kind, message, value, created_at")
        .eq("company_id", company.id)
        .in("kind", ["trade", "hire", "system", "trading", "decision"])
        .order("created_at", { ascending: false })
        .limit(10);
      for (const e of events ?? []) {
        const kind =
          e.kind === "trade" || e.kind === "trading" ? ("trade" as const) : ("system" as const);
        items.push({
          id: `evt-${e.id}`,
          kind,
          title: e.message as string,
          detail: e.kind as string,
          amount: e.value != null ? Number(e.value) : null,
          asset: null,
          txHash: null,
          explorerUrl: null,
          at: e.created_at as string,
        });
      }
    }

    // Live chain transfers (when Alchemy is configured)
    const url = alchemyRpcUrl({ network });
    if (url && wallet?.address) {
      try {
        const fetchTransfers = async (dir: "from" | "to") => {
          const key = dir === "from" ? "fromAddress" : "toAddress";
          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: 1,
              jsonrpc: "2.0",
              method: "alchemy_getAssetTransfers",
              params: [
                {
                  fromBlock: "0x0",
                  toBlock: "latest",
                  category: ["erc20", "external"],
                  withMetadata: true,
                  excludeZeroValue: true,
                  maxCount: "0x10",
                  order: "desc",
                  [key]: wallet.address,
                },
              ],
            }),
          });
          const json = (await res.json()) as {
            result?: { transfers?: Record<string, unknown>[] };
          };
          return json.result?.transfers ?? [];
        };

        const [incoming, outgoing] = await Promise.all([
          fetchTransfers("to"),
          fetchTransfers("from"),
        ]);

        for (const t of incoming) {
          const hash = String(t["hash"] ?? "");
          const asset = String(t["asset"] ?? "TOKEN");
          const value = Number(t["value"] ?? 0);
          const meta = t["metadata"] as { blockTimestamp?: string } | undefined;
          items.push({
            id: `in-${hash}-${asset}`,
            kind: "transfer_in",
            title: `Received ${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset}`,
            detail: `From ${String(t["from"] ?? "").slice(0, 10)}…`,
            amount: value,
            asset,
            txHash: hash || null,
            explorerUrl: hash ? `${explorer}/tx/${hash}` : null,
            at: meta?.blockTimestamp ?? new Date().toISOString(),
          });
        }
        for (const t of outgoing) {
          const hash = String(t["hash"] ?? "");
          const asset = String(t["asset"] ?? "TOKEN");
          const value = Number(t["value"] ?? 0);
          const meta = t["metadata"] as { blockTimestamp?: string } | undefined;
          items.push({
            id: `out-${hash}-${asset}`,
            kind: "transfer_out",
            title: `Sent ${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset}`,
            detail: `To ${String(t["to"] ?? "").slice(0, 10)}…`,
            amount: value,
            asset,
            txHash: hash || null,
            explorerUrl: hash ? `${explorer}/tx/${hash}` : null,
            at: meta?.blockTimestamp ?? new Date().toISOString(),
          });
        }
      } catch {
        // Activity still shows app-side rows
      }
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { items: items.slice(0, 40), network, label: chainLabel(network) };
  });

export type TreasurySendAsset = "eth" | "usdc" | "weth";

/**
 * Send / withdraw native or ERC-20 from the founder's Light Account via UserOp.
 * Leaves a small ETH gas buffer when sending native with amount=max.
 */
export const sendTreasury = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        asset: z.enum(["eth", "usdc", "weth"]),
        to: z.string().min(1).max(128),
        amount: z.string().min(1).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const toRaw = data.to.trim();
    if (!isEvmAddress(toRaw)) {
      throw new Error("Enter a valid 0x address (42 characters).");
    }
    const to = toRaw.toLowerCase() as Address;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      decryptOwnerKey,
      executeContractUserOp,
      gasSponsorshipEnabled,
    } = await import("@/lib/wallet.server");

    const network = activeNetwork();
    const usdc = USDC_ADDRESSES[network] as Address;
    const weth = WETH_ADDRESSES[network] as Address;
    const usdcDecimals = USDC_DECIMALS[network];
    const native = nativeSymbol(network);

    const { data: wallet } = await supabaseAdmin
      .from("wallet_bindings")
      .select("id, address, owner_key_enc, deployed")
      .eq("user_id", context.userId)
      .eq("kind", "smart")
      .maybeSingle();
    if (!wallet?.address || !wallet.owner_key_enc) {
      throw new Error("Provision your smart wallet on /wallet first.");
    }

    const from = String(wallet.address).toLowerCase();
    if (from === to) throw new Error("Cannot send to your own treasury address.");

    const rpc = alchemyRpcUrl({ network });
    if (!rpc) throw new Error("Alchemy RPC is not configured.");

    const balanceOf = async (token: string): Promise<bigint> => {
      const dataHex = `0x70a08231000000000000000000000000${from.slice(2)}`;
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

    const amountRaw = data.amount.trim().toLowerCase();
    let amountWei: bigint;
    let assetLabel: string;
    let call: { target: Address; data: Hex; value?: bigint };

    if (data.asset === "eth") {
      assetLabel = native;
      const bal = await nativeBal();
      const buffer = gasSponsorshipEnabled(network) ? 2n * 10n ** 14n : 10n ** 15n;
      const spendable = bal > buffer ? bal - buffer : 0n;
      if (spendable <= 0n) throw new Error(`Not enough ${native} after gas buffer.`);
      amountWei =
        amountRaw === "max" ? spendable : parseHumanAmount(amountRaw, 18);
      if (amountWei > spendable) amountWei = spendable;
      if (amountWei <= 0n) throw new Error("Amount too small.");
      call = {
        target: to,
        data: "0x" as Hex,
        value: amountWei,
      };
    } else {
      const token = data.asset === "usdc" ? usdc : weth;
      const decimals = data.asset === "usdc" ? usdcDecimals : 18;
      assetLabel = data.asset === "usdc" ? "USDC" : "WETH";
      if (!gasSponsorshipEnabled(network)) {
        const ethBal = await nativeBal();
        if (ethBal < 10n ** 15n) {
          throw new Error(
            `Keep ~0.001 ${native} for gas, or set Alchemy gas sponsorship on the server.`,
          );
        }
      }
      const bal = await balanceOf(token);
      if (bal <= 0n) throw new Error(`No ${assetLabel} balance to send.`);
      amountWei = amountRaw === "max" ? bal : parseHumanAmount(amountRaw, decimals);
      if (amountWei > bal) amountWei = bal;
      if (amountWei <= 0n) throw new Error("Amount too small.");
      call = {
        target: token,
        data: encodeErc20Transfer(to, amountWei),
      };
    }

    const pk = decryptOwnerKey(wallet.owner_key_enc) as Hex;
    const result = await executeContractUserOp(pk, call);

    const humanAmount =
      data.asset === "usdc"
        ? Number(amountWei) / 10 ** usdcDecimals
        : Number(amountWei) / 1e18;

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
        kind: "system",
        message: `Sent ${humanAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${assetLabel} to ${to.slice(0, 8)}…`,
        value: humanAmount,
      });
    }

    return {
      ok: true as const,
      asset: data.asset,
      assetLabel,
      to,
      amount: amountWei.toString(),
      humanAmount,
      userOpHash: result.userOpHash,
      network,
      explorerTxUrl: explorerTxUrl(network, result.userOpHash),
    };
  });
