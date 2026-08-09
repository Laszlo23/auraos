import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeAgentMemory } from "@/lib/agent-memory";
import { agentJson } from "@/lib/x402-ai";
import {
  runBacktest,
  validateStrategySpec,
  type StrategySpec,
} from "@/lib/trading/backtest.server";

const QUANT_MEMORY =
  "Trading desk Quant. Risk-first. Never invent fills. Respect founder caps. Prefer WETH/USDC on Base. Learn from every confirmed swap.";

async function ensureQuant(supabase: {
  from: (t: string) => any;
}, companyId: string) {
  const { data: existing } = await supabase
    .from("agents")
    .select("id, memory, lessons_count")
    .eq("company_id", companyId)
    .eq("name", "Quant")
    .maybeSingle();
  if (existing) return existing as { id: string; memory: string | null; lessons_count: number };

  const { data: created, error } = await supabase
    .from("agents")
    .insert({
      company_id: companyId,
      name: "Quant",
      role: "Trading Desk",
      avatar: "▲",
      accent: "gold",
      status: "active",
      current_task: "Standing by for strategy approval",
      health: 100,
      performance: 0,
      activity: 0,
      revenue_generated: 0,
      credits_used: 0,
      tasks_completed: 0,
      lessons_count: 0,
      memory: QUANT_MEMORY,
    })
    .select("id, memory, lessons_count")
    .single();
  if (error || !created) throw error ?? new Error("Could not hire Quant");

  await supabase.from("knowledge_items").insert({
    company_id: companyId,
    title: "Trading risk rules",
    summary:
      "Max risk and daily notional are set on the Trading Desk. Autonomy 0 requires strategy approval. Only Base USDC/WETH spot via smart wallet.",
    cluster: "Trading",
    source: "Quant",
  });

  await supabase.from("activity_events").insert({
    company_id: companyId,
    agent_id: created.id,
    kind: "hire",
    message: "Quant joined the trading desk",
  });

  return created as { id: string; memory: string | null; lessons_count: number };
}

async function ownedCompany(supabase: { from: (t: string) => any }, userId: string, companyId: string) {
  const { data } = await supabase
    .from("companies")
    .select(
      "id, autonomy, trading_armed, max_risk_pct, max_notional_usdc_day, max_slippage_bps, allowed_symbols, owner_id",
    )
    .eq("id", companyId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Company not found");
  return data;
}

/** Ensure Quant exists when opening the desk. */
export const ensureTradingDesk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => {
    if (!input.companyId) throw new Error("companyId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);
    const quant = await ensureQuant(context.supabase, data.companyId);

    // Copy curated wallets into company follows if empty
    const { count } = await context.supabase
      .from("smart_money_wallets")
      .select("id", { count: "exact", head: true })
      .eq("company_id", data.companyId);
    if (!count) {
      const { data: curated } = await context.supabase
        .from("smart_money_wallets")
        .select("label, address, tags")
        .eq("curated", true)
        .is("company_id", null);
      if (curated?.length) {
        await context.supabase.from("smart_money_wallets").insert(
          curated.map((w) => ({
            company_id: data.companyId,
            label: w.label,
            address: w.address,
            tags: w.tags,
            follow: false,
            curated: false,
          })),
        );
      }
    }

    return { quantId: quant.id };
  });

/** LLM: natural language → validated strategy spec (draft). */
export const createStrategyFromPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; prompt: string }) => {
    if (!input.companyId || !input.prompt?.trim()) throw new Error("Prompt required");
    return { companyId: input.companyId, prompt: input.prompt.trim().slice(0, 2000) };
  })
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);
    const quant = await ensureQuant(context.supabase, data.companyId);

    let spec: StrategySpec;
    let name = "Prompt strategy";
    let summary = data.prompt.slice(0, 240);
    try {
      const json = (await agentJson(
        `You are Quant, an on-chain spot trading strategist for Base USDC/WETH only.
Return JSON {"name":"...","summary":"...","honesty_note":"...","spec":{"timeframe":"1h"|"4h"|"1d","symbols":["WETH/USDC"],"entry":{"type":"ma_cross"|"breakout"|"smart_money_follow","params":{}},"exit":{"stop_pct":number,"take_profit_pct":number},"sizing":{"risk_pct_equity":number,"max_notional_usdc":number}}}.
Keep risk_pct_equity ≤ 1 and max_notional_usdc ≤ 500. No leverage. No shorts that need borrow.
If the founder asks for extreme multiples (e.g. €10 → €1000 in a week), honesty_note must say that is unlikely and summary must describe a capped learning strategy — never promise the target.`,
        data.prompt,
        "summary",
      )) as {
        name?: string;
        summary?: string;
        honesty_note?: string;
        spec?: unknown;
      };
      spec = validateStrategySpec(json.spec);
      if (json.name) name = String(json.name).slice(0, 80);
      const honesty = json.honesty_note ? ` ${String(json.honesty_note).slice(0, 180)}` : "";
      if (json.summary) summary = `${String(json.summary).slice(0, 320)}${honesty}`.slice(0, 400);
    } catch {
      spec = validateStrategySpec({
        timeframe: "1h",
        symbols: ["WETH/USDC"],
        entry: { type: "ma_cross", params: { fast: 12, slow: 26 } },
        exit: { stop_pct: 2, take_profit_pct: 4 },
        sizing: { risk_pct_equity: 0.5, max_notional_usdc: 100 },
      });
      summary = `Fallback MA-cross on WETH/USDC from: ${data.prompt.slice(0, 120)}`;
    }

    const { data: row, error } = await context.supabase
      .from("trading_strategies")
      .insert({
        company_id: data.companyId,
        agent_id: quant.id,
        name,
        prompt: data.prompt,
        summary,
        spec,
        status: "draft",
      })
      .select("*")
      .single();
    if (error || !row) throw error ?? new Error("Could not save strategy");

    await context.supabase
      .from("agents")
      .update({
        memory: mergeAgentMemory(quant.memory, `Drafted strategy "${name}"`),
        lessons_count: (quant.lessons_count ?? 0) + 1,
        current_task: `Drafted: ${name}`,
      })
      .eq("id", quant.id);

    return {
      id: row.id as string,
      name: row.name as string,
      status: row.status as string,
      summary: (row.summary as string | null) ?? null,
    };
  });

/** Run real candle backtest and persist results. */
export const runStrategyBacktest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; strategyId: string }) => {
    if (!input.companyId || !input.strategyId) throw new Error("strategyId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);
    const { data: strategy } = await context.supabase
      .from("trading_strategies")
      .select("*")
      .eq("id", data.strategyId)
      .eq("company_id", data.companyId)
      .maybeSingle();
    if (!strategy) throw new Error("Strategy not found");

    const spec = validateStrategySpec(strategy.spec);
    const { fetchCandles } = await import("@/lib/trading/market-data.server");
    const { candles, source } = await fetchCandles({
      symbol: spec.symbols[0] ?? "WETH/USDC",
      timeframe: spec.timeframe,
      limit: 240,
    });
    const result = runBacktest(candles, spec, source);

    const { data: updated, error } = await context.supabase
      .from("trading_strategies")
      .update({
        backtest: result,
        status: strategy.status === "approved" ? "approved" : "backtested",
        updated_at: new Date().toISOString(),
      })
      .eq("id", strategy.id)
      .select("*")
      .single();
    if (error) throw error;
    return {
      id: updated.id as string,
      status: updated.status as string,
      backtest: updated.backtest
        ? {
            win_rate: Number((updated.backtest as { win_rate?: number }).win_rate ?? 0),
            total_return_pct: Number(
              (updated.backtest as { total_return_pct?: number }).total_return_pct ?? 0,
            ),
            max_drawdown_pct: Number(
              (updated.backtest as { max_drawdown_pct?: number }).max_drawdown_pct ?? 0,
            ),
            trade_count: Number((updated.backtest as { trade_count?: number }).trade_count ?? 0),
            source: String((updated.backtest as { source?: string }).source ?? ""),
          }
        : null,
    };
  });

/** Approve strategy — founder action on the desk is the gate. */
export const approveStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; strategyId: string }) => input)
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);
    const { data: strategy } = await context.supabase
      .from("trading_strategies")
      .select("*")
      .eq("id", data.strategyId)
      .eq("company_id", data.companyId)
      .maybeSingle();
    if (!strategy) throw new Error("Strategy not found");
    if (!strategy.backtest) throw new Error("Run a backtest before approving");

    await context.supabase
      .from("trading_strategies")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", strategy.id);

    await context.supabase.from("activity_events").insert({
      company_id: data.companyId,
      agent_id: strategy.agent_id,
      kind: "decision",
      message: `Founder approved trading strategy: ${strategy.name}`,
    });

    await context.supabase.from("tasks").insert({
      company_id: data.companyId,
      agent_id: strategy.agent_id,
      title: `Strategy live: ${strategy.name}`,
      description: strategy.summary,
      status: "completed",
      priority: "medium",
      progress: 100,
      result: "Approved by founder on Trading Desk",
      completed_at: new Date().toISOString(),
    });

    return { status: "approved" as const, strategyId: strategy.id };
  });
export const setTradingDeskArmed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; armed: boolean }) => input)
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);

    if (data.armed) {
      const { data: approved } = await context.supabase
        .from("trading_strategies")
        .select("id")
        .eq("company_id", data.companyId)
        .eq("status", "approved")
        .limit(1);
      if (!approved?.length) throw new Error("Approve at least one strategy before arming.");

      const { data: session } = await context.supabase
        .from("agent_session_keys")
        .select("id, allowed_actions, status")
        .eq("user_id", context.userId)
        .neq("status", "revoked")
        .limit(20);
      const hasTrade = (session ?? []).some(
        (s) => Array.isArray(s.allowed_actions) && s.allowed_actions.includes("trade"),
      );
      if (!hasTrade) {
        throw new Error("Issue a smart-wallet session key with Trade permission first.");
      }
    } else {
      // Expire pending signals on disarm
      await context.supabase
        .from("trading_signals")
        .update({ status: "expired" })
        .eq("company_id", data.companyId)
        .in("status", ["pending", "approved"]);
    }

    const { error } = await context.supabase
      .from("companies")
      .update({ trading_armed: data.armed })
      .eq("id", data.companyId);
    if (error) throw error;

    await context.supabase.from("activity_events").insert({
      company_id: data.companyId,
      kind: "trading",
      message: data.armed ? "Trading desk armed" : "Trading desk disarmed",
    });

    return { armed: data.armed };
  });

export const updateTradingRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      companyId: string;
      max_risk_pct?: number;
      max_notional_usdc_day?: number;
      max_slippage_bps?: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("tokens_remaining")
      .eq("company_id", data.companyId)
      .maybeSingle();
    const { buildHolderPerks } = await import("@/lib/trading/holder-perks");
    const perks = buildHolderPerks({ auraBalance: Number(sub?.tokens_remaining ?? 0) });

    const patch: {
      max_risk_pct?: number;
      max_notional_usdc_day?: number;
      max_slippage_bps?: number;
    } = {};
    if (data.max_risk_pct != null) patch.max_risk_pct = Math.min(5, Math.max(0.1, data.max_risk_pct));
    if (data.max_notional_usdc_day != null) {
      patch.max_notional_usdc_day = Math.min(10_000, Math.max(10, data.max_notional_usdc_day));
    }
    if (data.max_slippage_bps != null) {
      patch.max_slippage_bps = Math.min(500, Math.max(5, data.max_slippage_bps));
    }
    const { error } = await context.supabase
      .from("companies")
      .update(patch)
      .eq("id", data.companyId);
    if (error) throw error;
    return { ok: true as const, ...patch, holderNotionalBoostPct: perks.notionalBoostPct };
  });

export const followSmartMoneyWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; walletId: string; follow: boolean }) => input)
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);
    const { error } = await context.supabase
      .from("smart_money_wallets")
      .update({ follow: data.follow })
      .eq("id", data.walletId)
      .eq("company_id", data.companyId);
    if (error) throw error;
    return { ok: true };
  });

export const mirrorSmartMoneyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; eventId: string }) => input)
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    const { data: event } = await context.supabase
      .from("smart_money_events")
      .select("*")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!event) throw new Error("Event not found");

    const notional = Math.min(
      Number(company.max_notional_usdc_day ?? 250) * 0.2,
      100,
    );
    const side = event.direction === "in" ? "long" : "flat";
    const { data: signal, error } = await context.supabase
      .from("trading_signals")
      .insert({
        company_id: data.companyId,
        symbol: "WETH/USDC",
        side,
        confidence: 0.55,
        notional_usdc: notional,
        source: "smart_money",
        status: "pending",
        rationale: event.summary ?? `Mirror ${event.wallet_address.slice(0, 10)}…`,
        metadata: { event_id: event.id, tx_hash: event.tx_hash },
      })
      .select("*")
      .single();
    if (error) throw error;
    return {
      id: signal.id as string,
      status: signal.status as string,
      symbol: signal.symbol as string,
      side: signal.side as string,
      notional_usdc: Number(signal.notional_usdc),
    };
  });

export const approveTradingSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; signalId: string }) => input)
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);
    const { error } = await context.supabase
      .from("trading_signals")
      .update({ status: "approved" })
      .eq("id", data.signalId)
      .eq("company_id", data.companyId)
      .eq("status", "pending");
    if (error) throw error;
    return { ok: true };
  });

export const rejectTradingSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; signalId: string }) => input)
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);
    await context.supabase
      .from("trading_signals")
      .update({ status: "rejected" })
      .eq("id", data.signalId)
      .eq("company_id", data.companyId);
    return { ok: true };
  });

/** One-tap preset → draft → backtest → approve (passive onboarding). */
export const applyTradingPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; presetId: string }) => {
    if (!input.companyId || !input.presetId) throw new Error("presetId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await ownedCompany(context.supabase, context.userId, data.companyId);
    const { presetById } = await import("@/lib/trading/presets");
    const preset = presetById(data.presetId);
    if (!preset) throw new Error("Unknown preset");

    const quant = await ensureQuant(context.supabase, data.companyId);
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("tokens_remaining")
      .eq("company_id", data.companyId)
      .maybeSingle();
    const { buildHolderPerks } = await import("@/lib/trading/holder-perks");
    const perks = buildHolderPerks({ auraBalance: Number(sub?.tokens_remaining ?? 0) });
    const slotCap = 3 + perks.strategySlotBonus;

    const { data: existing } = await context.supabase
      .from("trading_strategies")
      .select("id, status")
      .eq("company_id", data.companyId)
      .eq("name", preset.name)
      .maybeSingle();

    let strategyId = existing?.id as string | undefined;
    if (!strategyId) {
      const { count } = await context.supabase
        .from("trading_strategies")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId)
        .eq("status", "approved");
      if ((count ?? 0) >= slotCap) {
        throw new Error(
          `Strategy slot full (${slotCap}). Hold more AURA for Core tier, or pause an approved strategy.`,
        );
      }
      const { data: row, error } = await context.supabase
        .from("trading_strategies")
        .insert({
          company_id: data.companyId,
          agent_id: quant.id,
          name: preset.name,
          prompt: preset.prompt,
          summary: preset.tagline,
          spec: preset.spec,
          status: "draft",
        })
        .select("id")
        .single();
      if (error || !row) throw error ?? new Error("Could not create preset strategy");
      strategyId = row.id as string;
    }

    const { fetchCandles } = await import("@/lib/trading/market-data.server");
    const { candles, source } = await fetchCandles({
      symbol: preset.spec.symbols[0] ?? "WETH/USDC",
      timeframe: preset.spec.timeframe,
      limit: 240,
    });
    const result = runBacktest(candles, preset.spec, source);

    await context.supabase
      .from("trading_strategies")
      .update({
        backtest: result,
        status: "approved",
        summary: preset.tagline,
        spec: preset.spec,
        updated_at: new Date().toISOString(),
      })
      .eq("id", strategyId);

    if (preset.id === "whale_follow") {
      await context.supabase
        .from("smart_money_wallets")
        .update({ follow: true })
        .eq("company_id", data.companyId);
    }

    await context.supabase.from("activity_events").insert({
      company_id: data.companyId,
      agent_id: quant.id,
      kind: "decision",
      message: `Preset armed path: ${preset.name}`,
    });

    return {
      strategyId,
      name: preset.name,
      status: "approved" as const,
      backtest: {
        win_rate: result.win_rate,
        total_return_pct: result.total_return_pct,
        max_drawdown_pct: result.max_drawdown_pct,
        trade_count: result.trade_count,
      },
    };
  });

/** Checklist state for Start Quant onboarding. */
export const getTradingDeskReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: company } = await context.supabase
      .from("companies")
      .select(
        "id, trading_armed, max_risk_pct, max_notional_usdc_day, quant_boost_until, quant_boost_pct",
      )
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!company) {
      return {
        companyId: null as string | null,
        funded: false,
        usdc: 0,
        hasTradeKey: false,
        hasApprovedStrategy: false,
        hasBacktest: false,
        armed: false,
        canArm: false,
        blockReason: "Create a company first",
      };
    }

    const { data: wallet } = await context.supabase
      .from("wallet_bindings")
      .select("address")
      .eq("user_id", context.userId)
      .eq("kind", "smart")
      .maybeSingle();

    let usdc = 0;
    if (wallet?.address) {
      try {
        const { activeNetwork, alchemyRpcUrl, USDC_ADDRESSES } = await import(
          "@/lib/chain-config"
        );
        const network = activeNetwork();
        const url = alchemyRpcUrl({ network });
        if (url) {
          const balanceOf = `0x70a08231000000000000000000000000${wallet.address.slice(2).toLowerCase()}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_call",
              params: [{ to: USDC_ADDRESSES[network], data: balanceOf }, "latest"],
            }),
          });
          const json = (await res.json()) as { result?: string };
          if (json.result) usdc = Number(BigInt(json.result)) / 1e6;
        }
      } catch {
        usdc = 0;
      }
    }

    const { data: keys } = await context.supabase
      .from("agent_session_keys")
      .select("allowed_actions, status")
      .eq("user_id", context.userId)
      .neq("status", "revoked");
    const hasTradeKey = (keys ?? []).some(
      (k) => Array.isArray(k.allowed_actions) && k.allowed_actions.includes("trade"),
    );

    const { data: strategies } = await context.supabase
      .from("trading_strategies")
      .select("id, status, backtest")
      .eq("company_id", company.id);
    const hasApprovedStrategy = (strategies ?? []).some((s) => s.status === "approved");
    const hasBacktest = (strategies ?? []).some((s) => Boolean(s.backtest));

    const reallyFunded = usdc >= 5;
    let blockReason: string | null = null;
    if (!reallyFunded) blockReason = "Deposit at least $5 USDC on Base";
    else if (!hasTradeKey) blockReason = "Issue a session key with Trade permission";
    else if (!hasApprovedStrategy) blockReason = "Approve a strategy (pick a preset)";
    const canArm = reallyFunded && hasTradeKey && hasApprovedStrategy;

    return {
      companyId: company.id as string,
      funded: reallyFunded,
      walletReady: Boolean(wallet?.address),
      usdc,
      hasTradeKey,
      hasApprovedStrategy,
      hasBacktest,
      armed: Boolean(company.trading_armed),
      canArm,
      blockReason,
      quantBoostUntil: (company as { quant_boost_until?: string | null }).quant_boost_until ?? null,
      quantBoostPct: Number((company as { quant_boost_pct?: number }).quant_boost_pct ?? 0),
    };
  });

export const getHolderPerks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: company } = await context.supabase
      .from("companies")
      .select("id")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!company) {
      const { buildHolderPerks } = await import("@/lib/trading/holder-perks");
      return buildHolderPerks({ auraBalance: 0 });
    }
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("tokens_remaining")
      .eq("company_id", company.id)
      .maybeSingle();
    const { buildHolderPerks } = await import("@/lib/trading/holder-perks");
    const nftContract = process.env["VITE_GENESIS_NFT_CONTRACT"] ?? process.env["GENESIS_NFT_CONTRACT"] ?? null;
    return buildHolderPerks({
      auraBalance: Number(sub?.tokens_remaining ?? 0),
      hasGenesisNft: false,
      genesisNftContract: nftContract,
    });
  });

export const getTradingArena = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: season } = await context.supabase
      .from("trading_seasons")
      .select("*")
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!season) {
      return {
        season: null as null,
        entries: [] as {
          rank: number | null;
          company_name: string | null;
          company_id: string;
          realized_pnl: number;
          trade_count: number;
          score: number;
          max_drawdown_pct: number;
          isYou: boolean;
        }[],
        you: null as null,
      };
    }

    const { data: company } = await context.supabase
      .from("companies")
      .select("id")
      .eq("owner_id", context.userId)
      .limit(1)
      .maybeSingle();

    const { data: entries } = await context.supabase
      .from("trading_season_entries")
      .select(
        "company_id, company_name, realized_pnl, trade_count, score, rank, max_drawdown_pct",
      )
      .eq("season_id", season.id)
      .order("score", { ascending: false })
      .limit(25);

    const mapped = ((entries ?? []) as {
      company_id: string;
      company_name: string | null;
      realized_pnl: number;
      trade_count: number;
      score: number;
      rank: number | null;
      max_drawdown_pct: number;
    }[]).map((e) => ({
      ...e,
      realized_pnl: Number(e.realized_pnl),
      score: Number(e.score),
      max_drawdown_pct: Number(e.max_drawdown_pct),
      isYou: e.company_id === company?.id,
    }));

    const you = mapped.find((e) => e.isYou) ?? null;

    return {
      season: {
        id: season.id as string,
        name: season.name as string,
        slug: season.slug as string,
        starts_at: season.starts_at as string,
        ends_at: season.ends_at as string,
        prize_pool_aura: Number(season.prize_pool_aura ?? 5000),
      },
      entries: mapped,
      you,
    };
  });
