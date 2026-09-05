import { createServerFn } from "@tanstack/react-start";
import { formatUnits, parseUnits, type Address, type Hex } from "viem";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { alchemyRpcUrl } from "@/lib/chain-config";
import {
  isBaseAddress,
  isPrivateSaleSender,
  PAURA_SYMBOL,
  PRIVATE_SALE_ABI,
  PRIVATE_SALE_CAP_WHOLE,
  PRIVATE_SALE_MIN_USDC,
  privateSaleContractAddress,
  usdcToPAura,
} from "@/lib/private-sale";

type LooseDb = {
  from: (table: string) => any;
};

async function deskAuth() {
  return import("@/lib/desk-auth.server");
}

async function getSupabaseAdmin(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseDb;
}

function rpcUrl(): string {
  return alchemyRpcUrl({ network: "base" }) || "https://mainnet.base.org";
}

function requireContract(): Address {
  const address = privateSaleContractAddress();
  if (!address) throw new Error("Private sale contract is not configured");
  return address;
}

function deployerKey(): Hex {
  const raw = (
    process.env["PRIVATE_SALE_DEPLOYER_KEY"] ||
    process.env["GENESIS_MINTER_KEY"] ||
    process.env["PRIVATE_KEY"] ||
    ""
  ).trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("PRIVATE_SALE_DEPLOYER_KEY is not configured");
  }
  return raw as Hex;
}

export type PrivateSaleLive = {
  configured: boolean;
  address: string | null;
  sold: number;
  remaining: number;
  cap: number;
  usdcRaised: number;
  saleClosed: boolean;
  paused: boolean;
};

export const getPrivateSaleLive = createServerFn({ method: "GET" }).handler(
  async (): Promise<PrivateSaleLive> => {
    const address = privateSaleContractAddress();
    const empty: PrivateSaleLive = {
      configured: false,
      address: null,
      sold: 0,
      remaining: PRIVATE_SALE_CAP_WHOLE,
      cap: PRIVATE_SALE_CAP_WHOLE,
      usdcRaised: 0,
      saleClosed: false,
      paused: false,
    };
    if (!address) return empty;
    try {
      const client = createPublicClient({ chain: base, transport: http(rpcUrl()) });
      const results = await client.multicall({
        allowFailure: false,
        contracts: [
          { address, abi: PRIVATE_SALE_ABI, functionName: "totalSupply" },
          { address, abi: PRIVATE_SALE_ABI, functionName: "remaining" },
          { address, abi: PRIVATE_SALE_ABI, functionName: "usdcRaised" },
          { address, abi: PRIVATE_SALE_ABI, functionName: "saleClosed" },
          { address, abi: PRIVATE_SALE_ABI, functionName: "paused" },
        ],
      });
      const [soldRaw, remainingRaw, raisedRaw, saleClosed, paused] = results;
      return {
        configured: true,
        address,
        sold: Number(formatUnits(soldRaw, 18)),
        remaining: Number(formatUnits(remainingRaw, 18)),
        cap: PRIVATE_SALE_CAP_WHOLE,
        usdcRaised: Number(formatUnits(raisedRaw, 6)),
        saleClosed,
        paused,
      };
    } catch {
      return { ...empty, configured: true, address };
    }
  },
);

export type PrivateSaleCashOrder = {
  id: string;
  customer_name: string;
  wallet: string;
  amount_usdc: number;
  p_aura_amount: number;
  status: "logged" | "sending" | "sent" | "canceled";
  tx_hash: string | null;
  closer: string;
  notes: string | null;
  sent_by: string | null;
  sent_at: string | null;
  created_at: string;
};

export const listPrivateSaleCashOrders = createServerFn({ method: "GET" })
  .validator((input: { token?: string }) => ({
    token:
      String(input?.token || "")
        .trim()
        .slice(0, 500) || null,
  }))
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    const auth = requireDeskAuth(data.token);
    const db = await getSupabaseAdmin();
    const { data: rows, error } = await db
      .from("private_sale_cash_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) {
      if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
        throw new Error("Private sale cash table missing — apply the latest migration.");
      }
      throw error;
    }
    return {
      canSend: isPrivateSaleSender(auth.displayName),
      displayName: auth.displayName,
      orders: (rows ?? []) as PrivateSaleCashOrder[],
    };
  });

export const logPrivateSaleCash = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token?: string;
      customerName: string;
      wallet: string;
      amountUsdc: number;
      notes?: string;
    }) => ({
      token:
        String(input?.token || "")
          .trim()
          .slice(0, 500) || null,
      customerName: String(input.customerName || "")
        .trim()
        .slice(0, 200),
      wallet: String(input.wallet || "")
        .trim()
        .slice(0, 64),
      amountUsdc: Number(input.amountUsdc),
      notes:
        String(input.notes || "")
          .trim()
          .slice(0, 1000) || null,
    }),
  )
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    const auth = requireDeskAuth(data.token);
    if (!data.customerName) throw new Error("Customer name required");
    if (!isBaseAddress(data.wallet)) throw new Error("Valid Base wallet required");
    if (!Number.isFinite(data.amountUsdc) || data.amountUsdc < PRIVATE_SALE_MIN_USDC) {
      throw new Error(`Minimum cash buy is ${PRIVATE_SALE_MIN_USDC} USDC`);
    }
    const pAura = usdcToPAura(data.amountUsdc);
    if (pAura <= 0) throw new Error("Amount too small");

    const db = await getSupabaseAdmin();
    const { error } = await db.from("private_sale_cash_orders").insert({
      customer_name: data.customerName,
      wallet: data.wallet,
      amount_usdc: data.amountUsdc,
      p_aura_amount: pAura,
      status: "logged",
      closer: auth.displayName,
      notes: data.notes,
    });
    if (error) {
      if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
        throw new Error("Private sale cash table missing — apply the latest migration.");
      }
      throw error;
    }

    await db.from("team_desk_sales").insert({
      closer: auth.displayName,
      product: "private_sale",
      amount_cents: Math.round(data.amountUsdc * 100),
      currency: "USD",
      customer_name: data.customerName,
      notes: `pAURA cash · ${data.wallet} · ${pAura.toFixed(2)} ${PAURA_SYMBOL}`,
    });

    await db.from("team_desk_events").insert({
      closer: auth.displayName,
      kind: "private_sale_cash_logged",
      message: `${auth.displayName} logged cash private sale · ${data.customerName} · ${data.amountUsdc} USDC`,
    });

    return { ok: true, pAura };
  });

export const sendPrivateSaleCash = createServerFn({ method: "POST" })
  .validator((input: { token?: string; orderId: string }) => ({
    token:
      String(input?.token || "")
        .trim()
        .slice(0, 500) || null,
    orderId: String(input.orderId || "").trim(),
  }))
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    const auth = requireDeskAuth(data.token);
    if (!isPrivateSaleSender(auth.displayName)) {
      throw new Error("Only Laszlo can send pAURA for cash buys");
    }
    if (!data.orderId) throw new Error("Order required");

    const db = await getSupabaseAdmin();
    const { data: row, error } = await db
      .from("private_sale_cash_orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (error || !row) throw new Error("Order not found");
    const order = row as PrivateSaleCashOrder;
    if (order.status !== "logged") throw new Error("Order is not waiting to be sent");
    if (!isBaseAddress(order.wallet)) throw new Error("Order wallet is invalid");

    // Claim before chain write so a retry cannot double creditCash.
    const { data: claimed, error: claimError } = await db
      .from("private_sale_cash_orders")
      .update({
        status: "sending",
        sent_by: auth.displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.orderId)
      .eq("status", "logged")
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) throw new Error("Order is already being sent or was completed");

    const contract = requireContract();
    const account = privateKeyToAccount(deployerKey());
    const transport = http(rpcUrl());
    const publicClient = createPublicClient({ chain: base, transport });
    const wallet = createWalletClient({ account, chain: base, transport });
    const amount = parseUnits(String(order.p_aura_amount), 18);

    let hash: `0x${string}`;
    try {
      hash = await wallet.writeContract({
        address: contract,
        abi: PRIVATE_SALE_ABI,
        functionName: "creditCash",
        args: [order.wallet, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (err) {
      await db
        .from("private_sale_cash_orders")
        .update({
          status: "logged",
          sent_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.orderId)
        .eq("status", "sending");
      throw err;
    }

    const { error: updateError } = await db
      .from("private_sale_cash_orders")
      .update({
        status: "sent",
        tx_hash: hash,
        sent_by: auth.displayName,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.orderId)
      .eq("status", "sending");
    if (updateError) throw updateError;

    await db.from("team_desk_events").insert({
      closer: auth.displayName,
      kind: "private_sale_cash_sent",
      message: `${auth.displayName} sent ${order.p_aura_amount} ${PAURA_SYMBOL} to ${order.wallet}`,
      metadata: { order_id: data.orderId, tx_hash: hash },
    });

    return { ok: true, txHash: hash };
  });
