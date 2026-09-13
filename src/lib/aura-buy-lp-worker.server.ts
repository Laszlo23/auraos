/**
 * Phase A card-pack LP worker: fulfillment-wallet USDC float → official book swap.
 * Phase B (Treasury USDC) and Phase C (Circle/Bridge) stay documented rails, not blockers.
 */
import type { Address } from "viem";

import {
  auraBuyFulfillDecision,
  centsToUsd,
  nextAuraBuyLpStatus,
  stripeNetCents,
  usdcUnitsFromNetCents,
  type AuraBuyLpStatus,
} from "@/lib/aura-buy-lp";
import { auraPoolUsdcId } from "@/lib/aura-curve";
import { auraCaLive } from "@/lib/aura-token";
import { fulfillmentUsdcBalance, swapUsdcForAuraOnOfficialBook } from "@/lib/aura-v4-fulfill.server";
import { isBaseAddress } from "@/lib/private-sale";
import { retrieveStripeCheckoutSession } from "@/lib/stripe-checkout";
import { stripeCheckoutExpandQuery, stripePackNetFromCheckout } from "@/lib/stripe-pack-net";

type LooseDb = { from: (table: string) => any };

export type AuraBuyLpTickResult = {
  rail: "float" | "treasury" | "circle";
  scanned: number;
  reserved: number;
  floated: number;
  fulfilled: number;
  held: number;
  errors: string[];
  floatUsdc: string | null;
};

export function auraBuyUsdcRail(): "float" | "treasury" | "circle" {
  const raw = (process.env["AURA_BUY_USDC_RAIL"] || "float").trim().toLowerCase();
  if (raw === "treasury") return "treasury";
  if (raw === "circle") return "circle";
  return "float";
}

export function auraBuyHoldUntilStripeAvailable(): boolean {
  const raw = (process.env["AURA_BUY_HOLD_UNTIL_AVAILABLE"] || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

export function auraBuyFloatCoversEnabled(): boolean {
  const raw = (process.env["AURA_BUY_FLOAT_COVERS"] || "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

async function getDb(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseDb;
}

export async function refreshAuraBuyPackNet(row: {
  id: string;
  stripe_session: string;
  amount_usd: number;
}): Promise<void> {
  const secret = process.env["STRIPE_SECRET_KEY"]?.trim();
  if (!secret) return;
  const session = await retrieveStripeCheckoutSession(
    secret,
    row.stripe_session,
    stripeCheckoutExpandQuery(),
  );
  const net = stripePackNetFromCheckout(session);
  const amountCents = net.amountCents || Math.round(Number(row.amount_usd) * 100);
  const feeCents = net.feeCents;
  const netCents = net.netCents || stripeNetCents(amountCents, feeCents);
  const db = await getDb();
  await db
    .from("aura_buy_orders")
    .update({
      amount_cents: amountCents,
      fee_cents: feeCents,
      net_usd: centsToUsd(netCents),
      fee_usd: centsToUsd(feeCents),
      fee_estimated: net.feeEstimated,
      usdc_units: usdcUnitsFromNetCents(netCents).toString(),
      payment_intent: net.paymentIntent,
      funds_available: net.fundsAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
}

function parseUsdcUnits(value: unknown, amountUsd: number): bigint {
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.round(value));
  return usdcUnitsFromNetCents(Math.round(Number(amountUsd) * 100));
}

export async function runAuraBuyLpTick(limit = 8): Promise<AuraBuyLpTickResult> {
  const result: AuraBuyLpTickResult = {
    rail: auraBuyUsdcRail(),
    scanned: 0,
    reserved: 0,
    floated: 0,
    fulfilled: 0,
    held: 0,
    errors: [],
    floatUsdc: null,
  };

  const db = await getDb();
  const { data, error } = await db
    .from("aura_buy_orders")
    .select(
      "id, wallet, pack, amount_usd, stripe_session, status, lp_status, usdc_units, funds_available, fee_cents, net_usd",
    )
    .eq("status", "paid")
    .in("lp_status", ["reserved", "usdc_onchain", "swapped"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    if (error.message?.includes("does not exist") || error.message?.includes("column")) {
      result.errors.push("lp ledger migration missing");
      return result;
    }
    result.errors.push(error.message);
    return result;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    wallet: string;
    pack: string;
    amount_usd: number;
    stripe_session: string;
    status: string;
    lp_status: string;
    usdc_units: string | number | null;
    funds_available: boolean | null;
    fee_cents: number | null;
    net_usd: number | null;
  }>;
  result.scanned = rows.length;

  let floatLeft: bigint | null = null;
  if (auraBuyFloatCoversEnabled()) {
    try {
      floatLeft = await fulfillmentUsdcBalance();
      result.floatUsdc = floatLeft.toString();
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : "float unread");
    }
  }

  const hook = (process.env["AURA_V4_HOOK"] || process.env["AURA_POOL_HOOK"] || "").trim();
  const gateBase = {
    caPublished: auraCaLive(),
    poolId: auraPoolUsdcId(),
    hook: hook || null,
  };
  const holdUntilAvailable = auraBuyHoldUntilStripeAvailable();

  for (const row of rows) {
    const lpStatus = (row.lp_status || "reserved") as AuraBuyLpStatus;
    const usdcUnits = parseUsdcUnits(row.usdc_units, row.amount_usd);
    if (row.fee_cents == null || row.net_usd == null) {
      try {
        await refreshAuraBuyPackNet(row);
      } catch (err) {
        result.errors.push(`${row.id}: ${err instanceof Error ? err.message : "net refresh"}`);
      }
    }

    const fundsAvailable = Boolean(row.funds_available);
    const floatCovers = Boolean(
      auraBuyFloatCoversEnabled() && floatLeft != null && floatLeft >= usdcUnits,
    );
    if (holdUntilAvailable && !fundsAvailable && !floatCovers) {
      result.held += 1;
      continue;
    }
    const decision = auraBuyFulfillDecision({
      caPublished: gateBase.caPublished,
      poolId: gateBase.poolId,
      hook: gateBase.hook,
      fundsAvailable,
      floatCovers,
    });

    if (lpStatus === "reserved") {
      result.reserved += 1;
      if (!floatCovers) {
        if (!decision.ok) result.held += 1;
        continue;
      }
      const next = nextAuraBuyLpStatus("reserved", "float");
      const { error: floatErr } = await db
        .from("aura_buy_orders")
        .update({
          lp_status: next,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("lp_status", "reserved");
      if (floatErr) {
        result.errors.push(`${row.id}: ${floatErr.message}`);
        continue;
      }
      result.floated += 1;
    }

    if (!decision.ok) {
      if (decision.reason === "funds_held") result.held += 1;
      continue;
    }

    if (!isBaseAddress(row.wallet)) {
      result.errors.push(`${row.id}: invalid wallet`);
      continue;
    }

    try {
      const sent = await swapUsdcForAuraOnOfficialBook({
        amountIn: usdcUnits,
        buyer: row.wallet as Address,
      });
      if (floatLeft != null) floatLeft -= usdcUnits;
      const { error: sendErr } = await db
        .from("aura_buy_orders")
        .update({
          lp_status: "sent",
          status: "sent",
          usdc_tx_hash: sent.swapTxHash,
          swap_tx_hash: sent.swapTxHash,
          tx_hash: sent.sendTxHash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .in("lp_status", ["reserved", "usdc_onchain", "swapped"]);
      if (sendErr) {
        result.errors.push(`${row.id}: ${sendErr.message}`);
        continue;
      }
      result.fulfilled += 1;
    } catch (err) {
      result.errors.push(`${row.id}: ${err instanceof Error ? err.message : "swap"}`);
    }
  }

  return result;
}
