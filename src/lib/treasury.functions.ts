import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  activeNetwork,
  alchemyRpcUrl,
  chainId,
  chainLabel,
  USDC_ADDRESSES,
} from "@/lib/chain-config";
import { WETH_ADDRESSES } from "@/lib/trading/tokens";

function explorerBase(network: ReturnType<typeof activeNetwork>) {
  return network === "base" ? "https://basescan.org" : "https://sepolia.basescan.org";
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
    const base = {
      address: null as string | null,
      walletId: null as string | null,
      usdc: 0,
      eth: 0,
      weth: 0,
      network,
      chainId: chainId(network),
      label: chainLabel(network),
      deployed: false,
      legacy: false,
      verified: false,
      custody: null as string | null,
      provider: null as string | null,
      sponsored: Boolean(process.env["ALCHEMY_GAS_POLICY_ID"]),
      usdcToken: usdcAddress,
      wethToken: wethAddress,
      explorerAddressUrl: null as string | null,
      explorerTokenUrl: `${explorer}/token/${usdcAddress}`,
      depositHint:
        network === "base"
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
        usdc = Number(usdcRaw) / 1e6;
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
        items.push({
          id: `evt-${e.id}`,
          kind: "system",
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
