import type { Address, Hex } from "viem";

import { mergeAgentMemory } from "@/lib/agent-memory";
import { activeNetwork, alchemyRpcUrl, chainId, USDC_ADDRESSES } from "@/lib/chain-config";
import { recomputeTradingArena } from "@/lib/trading/arena.server";
import { validateStrategySpec, type StrategySpec } from "@/lib/trading/backtest.server";
import { fetchCandles, fetchMarkPrice } from "@/lib/trading/market-data.server";
import { sizeTradeNotional, unrealizedPnl } from "@/lib/trading/sizing";
import { resolvePairTokens, WETH_ADDRESSES } from "@/lib/trading/tokens";

const ERC20_APPROVE_SELECTOR = "0x095ea7b3";

function encodeApprove(spender: Address, amount: bigint): Hex {
  const spenderWord = spender.slice(2).toLowerCase().padStart(64, "0");
  const amountWord = amount.toString(16).padStart(64, "0");
  return `${ERC20_APPROVE_SELECTOR}${spenderWord}${amountWord}` as Hex;
}

function parseOkxSwap(raw: unknown): {
  to: Address;
  data: Hex;
  value: bigint;
  toAmount?: string;
  approveTo?: Address;
} {
  const root = Array.isArray(raw) ? raw[0] : raw;
  const obj = (root ?? {}) as Record<string, unknown>;
  const tx = (obj["tx"] ?? obj) as Record<string, unknown>;
  const to = String(tx["to"] ?? "");
  const data = String(tx["data"] ?? "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(to) || !data.startsWith("0x")) {
    throw new Error("OKX swap response missing calldata");
  }
  const valueRaw = tx["value"];
  const value =
    typeof valueRaw === "string" || typeof valueRaw === "number"
      ? BigInt(valueRaw)
      : 0n;
  const router = obj["routerResult"] as Record<string, unknown> | undefined;
  const toAmount =
    router && typeof router["toTokenAmount"] === "string"
      ? router["toTokenAmount"]
      : undefined;
  const approveTx = obj["approveTransaction"] ?? obj["approveData"];
  let approveTo: Address | undefined;
  if (approveTx && typeof approveTx === "object") {
    const a = approveTx as Record<string, unknown>;
    if (typeof a["to"] === "string") approveTo = a["to"] as Address;
  }
  return {
    to: to as Address,
    data: data as Hex,
    value,
    ...(toAmount ? { toAmount } : {}),
    ...(approveTo ? { approveTo } : {}),
  };
}

type Admin = {
  from: (table: string) => any;
};

async function companyNotionalBoost(db: Admin, companyId: string): Promise<number> {
  const { data: company } = await db
    .from("companies")
    .select("quant_boost_until, quant_boost_pct, owner_id")
    .eq("id", companyId)
    .maybeSingle();
  let boost = 0;
  if (
    company?.quant_boost_until &&
    new Date(company.quant_boost_until).getTime() > Date.now()
  ) {
    boost += Number(company.quant_boost_pct ?? 10);
  }
  // Holder tier boost from AURA balance
  if (company?.owner_id) {
    const { data: sub } = await db
      .from("subscriptions")
      .select("tokens_remaining")
      .eq("company_id", companyId)
      .maybeSingle();
    const aura = Number(sub?.tokens_remaining ?? 0);
    if (aura >= 3000) boost += 25;
    else if (aura >= 1200) boost += 15;
  }
  return boost;
}

async function spentTodayUsdc(db: Admin, companyId: string): Promise<number> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { data: dayOrders } = await db
    .from("trading_orders")
    .select("amount_in, status, side")
    .eq("company_id", companyId)
    .gte("created_at", dayStart.toISOString())
    .in("status", ["submitted", "confirmed"]);
  // Only count entry buys (USDC out) toward daily notional
  return ((dayOrders ?? []) as { amount_in?: string; side?: string }[]).reduce((a, o) => {
    if (o.side === "flat" || o.side === "sell" || o.side === "close") return a;
    return a + Number(o.amount_in ?? 0) / 1e6;
  }, 0);
}

async function deskEquityUsdc(
  db: Admin,
  company: { id: string; owner_id?: string; max_notional_usdc_day?: number },
): Promise<number> {
  const dayCap = Number(company.max_notional_usdc_day ?? 250);
  if (!company.owner_id) return dayCap;
  const { data: wallet } = await db
    .from("wallet_bindings")
    .select("address")
    .eq("user_id", company.owner_id)
    .eq("kind", "smart")
    .maybeSingle();
  if (!wallet?.address) return dayCap;
  const { fetchWalletUsdcBalance } = await import("@/lib/trading/wallet-equity.server");
  const usdc = await fetchWalletUsdcBalance(wallet.address);
  return usdc > 0 ? usdc : dayCap;
}

/** Ingest large USDC/WETH transfers for followed wallets via Alchemy. */
export async function ingestSmartMoney(limitCompanies = 30) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Admin;
  const network = activeNetwork();
  const url = alchemyRpcUrl({ network });
  if (!url) return { events: 0, error: "no_alchemy" };

  const { data: wallets } = await db
    .from("smart_money_wallets")
    .select("id, company_id, address, label, follow")
    .eq("follow", true)
    .not("company_id", "is", null)
    .limit(limitCompanies * 5);

  if (!wallets?.length) return { events: 0 };

  const usdc = USDC_ADDRESSES[network].toLowerCase();
  const weth = WETH_ADDRESSES[network].toLowerCase();
  let events = 0;

  for (const w of wallets as {
    id: string;
    company_id: string;
    address: string;
    label: string;
  }[]) {
    try {
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
              maxCount: "0x14",
              order: "desc",
              toAddress: w.address,
            },
          ],
        }),
      });
      const json = (await res.json()) as {
        result?: { transfers?: Record<string, unknown>[] };
      };
      const transfers = json.result?.transfers ?? [];

      const resOut = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: 2,
          jsonrpc: "2.0",
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromBlock: "0x0",
              toBlock: "latest",
              category: ["erc20", "external"],
              withMetadata: true,
              excludeZeroValue: true,
              maxCount: "0x14",
              order: "desc",
              fromAddress: w.address,
            },
          ],
        }),
      });
      const jsonOut = (await resOut.json()) as {
        result?: { transfers?: Record<string, unknown>[] };
      };
      const all: (Record<string, unknown> & { _dir: "in" | "out" })[] = [
        ...transfers.map((t) => ({ ...t, _dir: "in" as const })),
        ...(jsonOut.result?.transfers ?? []).map((t) => ({ ...t, _dir: "out" as const })),
      ];

      for (const t of all) {
        const rawContract = t["rawContract"] as { address?: string } | undefined;
        const assetAddr = (rawContract?.address ?? "").toLowerCase();
        const asset =
          assetAddr === usdc
            ? "USDC"
            : assetAddr === weth || !assetAddr
              ? "WETH"
              : String(t["asset"] ?? "TOKEN");
        if (asset !== "USDC" && asset !== "WETH" && asset !== "ETH") continue;

        const value = Number(t["value"] ?? 0);
        if (!Number.isFinite(value) || value < 500) continue;

        const txHash = String(t["hash"] ?? "");
        const summary = `${w.label} ${t._dir === "in" ? "received" : "sent"} ${value.toFixed(2)} ${asset}`;

        const { error } = await db.from("smart_money_events").insert({
          company_id: w.company_id,
          wallet_id: w.id,
          wallet_address: w.address,
          direction: t._dir,
          asset,
          amount: value,
          amount_usd: asset === "USDC" ? value : null,
          counterparty: String((t._dir === "in" ? t["from"] : t["to"]) ?? ""),
          tx_hash: txHash || null,
          summary,
        });
        if (!error) {
          events += 1;
          const { data: company } = await db
            .from("companies")
            .select("id, trading_armed, max_notional_usdc_day, max_risk_pct, owner_id")
            .eq("id", w.company_id)
            .maybeSingle();
          if (company?.trading_armed && t._dir === "in" && asset !== "USDC") {
            const { data: strat } = await db
              .from("trading_strategies")
              .select("id, spec")
              .eq("company_id", company.id)
              .eq("status", "approved")
              .limit(10);
            const followStrat = ((strat ?? []) as { id: string; spec: unknown }[]).find((s) => {
              try {
                return validateStrategySpec(s.spec).entry.type === "smart_money_follow";
              } catch {
                return false;
              }
            });
            if (followStrat) {
              const boost = await companyNotionalBoost(db, company.id);
              const spent = await spentTodayUsdc(db, company.id);
              const equityUsdc = await deskEquityUsdc(db, company);
              const spec = validateStrategySpec(followStrat.spec);
              const notional = sizeTradeNotional({
                requested: Number(company.max_notional_usdc_day ?? 250) * 0.15,
                specMaxNotional: Number(spec.sizing.max_notional_usdc),
                maxNotionalDay: Number(company.max_notional_usdc_day ?? 250),
                spentToday: spent,
                maxRiskPct: Number(company.max_risk_pct ?? 0.5),
                equityUsdc,
                notionalBoostPct: boost,
              });
              if (notional >= 5) {
                await db.from("trading_signals").insert({
                  company_id: company.id,
                  strategy_id: followStrat.id,
                  symbol: "WETH/USDC",
                  side: "long",
                  confidence: 0.6,
                  notional_usdc: notional,
                  source: "smart_money",
                  status: "approved",
                  rationale: summary,
                  metadata: { tx_hash: txHash, wallet: w.address },
                });
              }
            }
          }
        }
      }
    } catch {
      // continue
    }
  }

  return { events };
}

/** Evaluate approved MA/breakout strategies → signals. */
export async function evaluateStrategies(limit = 20) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Admin;
  const { data: companies } = await db
    .from("companies")
    .select("id, trading_armed, max_risk_pct, max_notional_usdc_day, owner_id")
    .eq("trading_armed", true)
    .limit(limit);

  let signals = 0;
  for (const company of (companies ?? []) as {
    id: string;
    max_notional_usdc_day?: number;
    max_risk_pct?: number;
    owner_id?: string;
  }[]) {
    const boost = await companyNotionalBoost(db, company.id);
    const spent = await spentTodayUsdc(db, company.id);
    const equityUsdc = await deskEquityUsdc(db, company);
    const { data: strategies } = await db
      .from("trading_strategies")
      .select("*")
      .eq("company_id", company.id)
      .eq("status", "approved");

    for (const s of (strategies ?? []) as { id: string; name: string; spec: unknown }[]) {
      let spec: StrategySpec;
      try {
        spec = validateStrategySpec(s.spec);
      } catch {
        continue;
      }
      if (spec.entry.type === "smart_money_follow") continue;

      try {
        const { candles } = await fetchCandles({
          symbol: spec.symbols[0] ?? "WETH/USDC",
          timeframe: spec.timeframe,
          limit: 80,
        });
        const closes = candles.map((c) => c.c);
        const i = closes.length - 1;
        if (i < 30) continue;
        const price = closes[i]!;
        let fire = false;
        if (spec.entry.type === "ma_cross") {
          const fast = Number(spec.entry.params?.["fast"] ?? 12);
          const slow = Number(spec.entry.params?.["slow"] ?? 26);
          const sma = (period: number, idx: number) => {
            let sum = 0;
            for (let j = idx - period + 1; j <= idx; j++) sum += closes[j]!;
            return sum / period;
          };
          const f = sma(fast, i);
          const sl = sma(slow, i);
          const pf = sma(fast, i - 1);
          const psl = sma(slow, i - 1);
          fire = pf <= psl && f > sl;
        } else if (spec.entry.type === "breakout") {
          const lookback = Number(spec.entry.params?.["lookback"] ?? 20);
          let high = -Infinity;
          for (let j = i - lookback; j < i; j++) high = Math.max(high, candles[j]!.h);
          fire = price > high;
        }
        if (!fire) continue;

        const since = new Date(Date.now() - 6 * 3600_000).toISOString();
        const { data: recent } = await db
          .from("trading_signals")
          .select("id")
          .eq("strategy_id", s.id)
          .gte("created_at", since)
          .limit(1);
        if (recent?.length) continue;

        const notional = sizeTradeNotional({
          requested: Number(spec.sizing.max_notional_usdc),
          specMaxNotional: Number(spec.sizing.max_notional_usdc),
          maxNotionalDay: Number(company.max_notional_usdc_day ?? 250),
          spentToday: spent,
          maxRiskPct: Number(company.max_risk_pct ?? 0.5),
          equityUsdc,
          notionalBoostPct: boost,
        });
        if (notional < 5) continue;

        await db.from("trading_signals").insert({
          company_id: company.id,
          strategy_id: s.id,
          symbol: spec.symbols[0] ?? "WETH/USDC",
          side: "long",
          confidence: 0.62,
          notional_usdc: notional,
          source: "strategy",
          status: "approved",
          rationale: `${s.name} fired on ${spec.entry.type} @ ${price.toFixed(2)}`,
          entry_price: price,
          mark_price: price,
        });
        signals += 1;
      } catch {
        // skip
      }
    }
  }
  return { signals };
}

/** Best-effort: age submitted orders to confirmed so the book feels live. */
export async function reconcileOrders(limit = 40) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Admin;
  const cutoff = new Date(Date.now() - 90_000).toISOString();
  const { data: rows } = await db
    .from("trading_orders")
    .select("id")
    .eq("status", "submitted")
    .lte("created_at", cutoff)
    .limit(limit);
  let confirmed = 0;
  for (const row of (rows ?? []) as { id: string }[]) {
    await db
      .from("trading_orders")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", row.id);
    confirmed += 1;
  }
  return { confirmed };
}

type OpenTrade = {
  id: string;
  company_id: string;
  strategy_id: string | null;
  symbol: string;
  size: number;
  entry: number;
  amount_out: number | null;
  amount_in: number | null;
  opened_at: string;
  rationale: string | null;
  confidence: number;
};

/** Mark open trades and close via OKX when stop / take-profit / time stop hits. */
export async function manageOpenPositions(limit = 20) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Admin;
  const { okxConfigured, okxDexSwap } = await import("@/lib/okx.server");
  const {
    decryptOwnerKey,
    executeBatchUserOps,
    executeContractUserOp,
  } = await import("@/lib/wallet.server");

  const { data: opens } = await db
    .from("trades")
    .select(
      "id, company_id, strategy_id, symbol, size, entry, amount_out, amount_in, opened_at, rationale, confidence",
    )
    .eq("status", "open")
    .order("opened_at", { ascending: true })
    .limit(limit);

  let marked = 0;
  let closed = 0;
  const errors: string[] = [];
  const network = activeNetwork();
  const cid = chainId(network);

  for (const trade of (opens ?? []) as OpenTrade[]) {
    try {
      const mark = await fetchMarkPrice(trade.symbol || "WETH/USDC");
      const upnl = unrealizedPnl(Number(trade.entry), mark.price, Number(trade.size));
      await db
        .from("trades")
        .update({ mark_price: mark.price, pnl: upnl })
        .eq("id", trade.id);
      marked += 1;

      let spec: StrategySpec | null = null;
      if (trade.strategy_id) {
        const { data: strat } = await db
          .from("trading_strategies")
          .select("spec")
          .eq("id", trade.strategy_id)
          .maybeSingle();
        if (strat?.spec) {
          try {
            spec = validateStrategySpec(strat.spec);
          } catch {
            spec = null;
          }
        }
      }
      const stop = Math.max(0.1, Number(spec?.exit.stop_pct ?? 2)) / 100;
      const take = Math.max(0.1, Number(spec?.exit.take_profit_pct ?? 4)) / 100;
      const maxHoldH = Number(spec?.exit.max_hold_hours ?? 72);
      const ret = (mark.price - Number(trade.entry)) / Number(trade.entry);
      const heldMs = Date.now() - new Date(trade.opened_at).getTime();
      const hitStop = ret <= -stop;
      const hitTake = ret >= take;
      const hitTime = heldMs >= maxHoldH * 3600_000;
      if (!hitStop && !hitTake && !hitTime) continue;

      if (!okxConfigured()) {
        // Paper-close so competition / book stay honest offline
        const pnl = Number((Number(trade.size) * ret).toFixed(4));
        await db
          .from("trades")
          .update({
            status: "closed",
            exit: mark.price,
            pnl,
            mark_price: mark.price,
            closed_at: new Date().toISOString(),
            rationale: `${trade.rationale ?? ""} · closed (${hitStop ? "stop" : hitTake ? "take" : "time"}) mark-only`.trim(),
          })
          .eq("id", trade.id);
        closed += 1;
        continue;
      }

      const { data: company } = await db
        .from("companies")
        .select("id, owner_id, max_slippage_bps, trading_armed")
        .eq("id", trade.company_id)
        .maybeSingle();
      if (!company?.owner_id) continue;

      const { data: wallet } = await db
        .from("wallet_bindings")
        .select("address, owner_key_enc")
        .eq("user_id", company.owner_id)
        .eq("kind", "smart")
        .maybeSingle();
      if (!wallet?.owner_key_enc || !wallet.address) {
        errors.push(`no_wallet_exit:${trade.company_id}`);
        continue;
      }

      const { data: keys } = await db
        .from("agent_session_keys")
        .select("allowed_actions, status")
        .eq("user_id", company.owner_id)
        .neq("status", "revoked");
      const canTrade = ((keys ?? []) as { allowed_actions?: string[] }[]).some(
        (k) => Array.isArray(k.allowed_actions) && k.allowed_actions.includes("trade"),
      );
      if (!canTrade) {
        errors.push(`no_trade_key_exit:${trade.company_id}`);
        continue;
      }

      const pair = resolvePairTokens(trade.symbol || "WETH/USDC", network);
      let wethAmount = Number(trade.amount_out);
      if (!Number.isFinite(wethAmount) || wethAmount <= 0) {
        wethAmount = Number(trade.size) / Math.max(mark.price, 1);
      }
      // leave dust buffer
      wethAmount = wethAmount * 0.995;
      const amountIn = BigInt(Math.floor(wethAmount * 1e18));
      if (amountIn < 10n ** 12n) continue;

      const slippagePct = ((company.max_slippage_bps ?? 50) / 100).toFixed(2);
      const swapRaw = await okxDexSwap({
        chainId: String(cid),
        fromTokenAddress: pair.base,
        toTokenAddress: pair.quote,
        amount: amountIn.toString(),
        userWalletAddress: wallet.address,
        slippage: slippagePct,
      });
      const parsed = parseOkxSwap(swapRaw);
      const pk = decryptOwnerKey(wallet.owner_key_enc);

      const { data: order } = await db
        .from("trading_orders")
        .insert({
          company_id: company.id,
          strategy_id: trade.strategy_id,
          symbol: trade.symbol,
          side: "close",
          token_in: pair.base,
          token_out: pair.quote,
          amount_in: amountIn.toString(),
          amount_out: parsed.toAmount ?? null,
          slippage_bps: company.max_slippage_bps,
          quote_snapshot: swapRaw as object,
          status: "pending",
        })
        .select("id")
        .single();

      const calls: { target: Address; data: Hex; value?: bigint }[] = [
        { target: pair.base, data: encodeApprove(parsed.to, amountIn * 2n) },
        { target: parsed.to, data: parsed.data, value: parsed.value },
      ];
      const result =
        calls.length > 1
          ? await executeBatchUserOps(pk, calls)
          : await executeContractUserOp(pk, calls[0]!);

      const usdcOut = parsed.toAmount ? Number(parsed.toAmount) / 1e6 : Number(trade.size) * (1 + ret);
      const pnl = Number((usdcOut - Number(trade.amount_in ?? trade.size)).toFixed(4));
      const reason = hitStop ? "stop" : hitTake ? "take-profit" : "time-stop";

      await db
        .from("trading_orders")
        .update({
          status: "submitted",
          user_op_hash: result.userOpHash,
          tx_hash: result.userOpHash,
        })
        .eq("id", order!.id);

      await db
        .from("trades")
        .update({
          status: "closed",
          exit: mark.price,
          pnl,
          mark_price: mark.price,
          closed_at: new Date().toISOString(),
          tx_hash: result.userOpHash,
          rationale: `${trade.rationale ?? ""} · exit ${reason}`.trim(),
        })
        .eq("id", trade.id);

      await db.from("activity_events").insert({
        company_id: company.id,
        kind: "trade",
        message: `Quant closed ${trade.symbol} (${reason}) · PnL ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USDC`,
        value: pnl,
      });

      closed += 1;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { marked, closed, errors };
}

/** Execute approved signals via OKX + Light Account when desk armed.
 *  Paper desks get mark fills tagged paper=true (never arena). */
export async function executeApprovedSignals(limit = 5) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Admin;
  const { okxConfigured, okxDexSwap } = await import("@/lib/okx.server");
  const {
    decryptOwnerKey,
    executeBatchUserOps,
    executeContractUserOp,
  } = await import("@/lib/wallet.server");

  const liveOkx = okxConfigured();
  const network = activeNetwork();
  const cid = chainId(network);
  const errors: string[] = [];
  let executed = 0;

  const { data: signals } = await db
    .from("trading_signals")
    .select("*")
    .eq("status", "approved")
    .eq("side", "long")
    .order("created_at", { ascending: true })
    .limit(limit);

  for (const signal of (signals ?? []) as {
    id: string;
    company_id: string;
    strategy_id: string | null;
    symbol: string;
    side: string;
    notional_usdc: number;
    confidence: number;
    rationale: string | null;
    entry_price: number | null;
  }[]) {
    try {
      const { data: company } = await db
        .from("companies")
        .select(
          "id, trading_armed, trading_paper, max_notional_usdc_day, max_slippage_bps, owner_id, max_risk_pct",
        )
        .eq("id", signal.company_id)
        .maybeSingle();
      if (!company?.trading_armed) {
        await db.from("trading_signals").update({ status: "expired" }).eq("id", signal.id);
        continue;
      }

      const paper = Boolean((company as { trading_paper?: boolean }).trading_paper);
      if (!paper && !liveOkx) {
        errors.push("okx_not_configured");
        continue;
      }

      // One open position per company for v1 risk clarity
      const { data: openPos } = await db
        .from("trades")
        .select("id")
        .eq("company_id", company.id)
        .eq("status", "open")
        .limit(1);
      if (openPos?.length) {
        await db
          .from("trading_signals")
          .update({ status: "expired", rationale: "Open position already — waiting for exit" })
          .eq("id", signal.id);
        continue;
      }

      const spent = await spentTodayUsdc(db, company.id);
      const boost = await companyNotionalBoost(db, company.id);
      const equityUsdc = await deskEquityUsdc(db, company);
      let specMax = Number(signal.notional_usdc) || 25;
      if (signal.strategy_id) {
        const { data: strat } = await db
          .from("trading_strategies")
          .select("spec")
          .eq("id", signal.strategy_id)
          .maybeSingle();
        if (strat?.spec) {
          try {
            specMax = validateStrategySpec(strat.spec).sizing.max_notional_usdc;
          } catch {
            /* keep */
          }
        }
      }

      const notional = sizeTradeNotional({
        requested: Number(signal.notional_usdc) || 25,
        specMaxNotional: specMax,
        maxNotionalDay: Number(company.max_notional_usdc_day ?? 250),
        spentToday: spent,
        maxRiskPct: Number(company.max_risk_pct ?? 0.5),
        equityUsdc,
        notionalBoostPct: boost,
      });
      if (notional < 5) {
        await db
          .from("trading_signals")
          .update({ status: "expired", rationale: "Daily notional / risk cap reached" })
          .eq("id", signal.id);
        continue;
      }

      const mark = await fetchMarkPrice(signal.symbol || "WETH/USDC").catch(() => ({
        price: Number(signal.entry_price) || 0,
        source: "signal",
      }));

      if (paper) {
        await db.from("trades").insert({
          company_id: company.id,
          strategy_id: signal.strategy_id,
          signal_id: signal.id,
          symbol: signal.symbol || "WETH/USDC",
          side: "long",
          size: notional,
          entry: mark.price,
          exit: null,
          pnl: 0,
          confidence: signal.confidence,
          status: "open",
          rationale: `[PAPER] ${signal.rationale ?? "Simulated mark fill"}`,
          paper: true,
          mark_price: mark.price,
          chain_id: cid,
          opened_at: new Date().toISOString(),
        });
        await db.from("trading_signals").update({ status: "executed" }).eq("id", signal.id);
        await db.from("activity_events").insert({
          company_id: company.id,
          kind: "trade",
          message: `Quant paper-opened ${signal.symbol} ($${notional.toFixed(0)}) — not arena`,
          value: notional,
        });
        executed += 1;
        continue;
      }

      // ——— Live OKX path (unchanged below, uses notional/equity already sized) ———
      const { data: wallet } = await db
        .from("wallet_bindings")
        .select("address, owner_key_enc, deployed, user_id")
        .eq("user_id", company.owner_id)
        .eq("kind", "smart")
        .maybeSingle();
      if (!wallet?.owner_key_enc || !wallet.address) {
        errors.push(`no_wallet:${company.id}`);
        continue;
      }

      const { data: keys } = await db
        .from("agent_session_keys")
        .select("id, allowed_actions, status")
        .eq("user_id", company.owner_id)
        .neq("status", "revoked");
      const canTrade = ((keys ?? []) as { allowed_actions?: string[] }[]).some(
        (k) => Array.isArray(k.allowed_actions) && k.allowed_actions.includes("trade"),
      );
      if (!canTrade) {
        errors.push(`no_trade_key:${company.id}`);
        continue;
      }

      const pair = resolvePairTokens(signal.symbol || "WETH/USDC", network);
      const amountIn = BigInt(Math.floor(notional * 1e6));
      const slippagePct = ((company.max_slippage_bps ?? 50) / 100).toFixed(2);

      const swapRaw = await okxDexSwap({
        chainId: String(cid),
        fromTokenAddress: pair.quote,
        toTokenAddress: pair.base,
        amount: amountIn.toString(),
        userWalletAddress: wallet.address,
        slippage: slippagePct,
      });

      const parsed = parseOkxSwap(swapRaw);
      const pk = decryptOwnerKey(wallet.owner_key_enc);

      const { data: order } = await db
        .from("trading_orders")
        .insert({
          company_id: company.id,
          signal_id: signal.id,
          strategy_id: signal.strategy_id,
          symbol: signal.symbol,
          side: signal.side,
          token_in: pair.quote,
          token_out: pair.base,
          amount_in: amountIn.toString(),
          amount_out: parsed.toAmount ?? null,
          slippage_bps: company.max_slippage_bps,
          quote_snapshot: swapRaw as object,
          status: "pending",
        })
        .select("id")
        .single();

      const calls: { target: Address; data: Hex; value?: bigint }[] = [
        {
          target: pair.quote,
          data: encodeApprove(parsed.to, amountIn * 2n),
        },
        {
          target: parsed.to,
          data: parsed.data,
          value: parsed.value,
        },
      ];

      const result =
        calls.length > 1
          ? await executeBatchUserOps(pk, calls)
          : await executeContractUserOp(pk, calls[0]!);

      await db
        .from("trading_orders")
        .update({
          status: "submitted",
          user_op_hash: result.userOpHash,
          tx_hash: result.userOpHash,
        })
        .eq("id", order!.id);

      await db.from("trades").insert({
        company_id: company.id,
        strategy_id: signal.strategy_id,
        signal_id: signal.id,
        symbol: signal.symbol || "WETH/USDC",
        side: "long",
        size: notional,
        entry: mark.price,
        exit: null,
        pnl: 0,
        confidence: signal.confidence,
        status: "open",
        rationale: signal.rationale,
        paper: false,
        tx_hash: result.userOpHash,
        token_in: pair.quote,
        token_out: pair.base,
        amount_in: Number(amountIn) / 1e6,
        amount_out: parsed.toAmount ? Number(parsed.toAmount) / 1e18 : null,
        mark_price: mark.price,
        chain_id: cid,
        opened_at: new Date().toISOString(),
      });

      await db.from("trading_signals").update({ status: "executed" }).eq("id", signal.id);

      const { data: quant } = await db
        .from("agents")
        .select("id, memory, tasks_completed, lessons_count, credits_used")
        .eq("company_id", company.id)
        .eq("name", "Quant")
        .maybeSingle();
      if (quant) {
        await db
          .from("agents")
          .update({
            memory: mergeAgentMemory(
              quant.memory,
              `Executed long ${signal.symbol} ~$${notional.toFixed(0)} via OKX/UserOp`,
            ),
            tasks_completed: (quant.tasks_completed ?? 0) + 1,
            lessons_count: (quant.lessons_count ?? 0) + 1,
            current_task: `Filled ${signal.symbol}`,
            activity: 0,
          })
          .eq("id", quant.id);
      }

      await db.from("activity_events").insert({
        company_id: company.id,
        agent_id: quant?.id ?? null,
        kind: "trade",
        message: `Quant opened ${signal.symbol} ($${notional.toFixed(0)}) onchain`,
        value: notional,
      });

      executed += 1;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      await db
        .from("trading_signals")
        .update({
          status: "expired",
          rationale: `Execution failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 280),
        })
        .eq("id", signal.id);
    }
  }

  return { executed, errors };
}

export async function runTradingTick() {
  const smart = await ingestSmartMoney();
  const evald = await evaluateStrategies();
  const exec = await executeApprovedSignals();
  const managed = await manageOpenPositions();
  const reconciled = await reconcileOrders();
  let arena = { seasonId: "", entries: 0 };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    arena = await recomputeTradingArena(supabaseAdmin as unknown as Admin);
  } catch {
    // seasons table may not be migrated yet
  }
  return { smart, evald, exec, managed, reconciled, arena };
}
