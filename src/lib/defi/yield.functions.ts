import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  YIELD_CATALOG,
  yieldCatalogById,
  yieldCatalogForTier,
  type YieldRiskTier,
  YIELD_RISK_ORDER,
} from "@/lib/defi/catalog";
import {
  runYieldAutomations,
  type YieldAutopilotConfig,
  DEFAULT_AUTOPILOT,
} from "@/lib/defi/automations";
import {
  accrueOpenYieldPositions,
  closeYieldPosition,
  ensureYieldAgent,
  openYieldPosition,
} from "@/lib/defi/yield.server";
import { supplyUsdcToAaveBase, withdrawUsdcFromAaveBase } from "@/lib/defi/aave-base.server";
import { decryptOwnerKey } from "@/lib/wallet.server";
import type { Address, Hex } from "viem";

async function loadLiveYieldWallet(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<{ address: Address; privateKey: Hex }> {
  const { data: wallet } = await supabase
    .from("wallet_bindings")
    .select("address, owner_key_enc")
    .eq("user_id", userId)
    .eq("kind", "smart")
    .maybeSingle();
  if (!wallet?.owner_key_enc || !wallet.address) {
    throw new Error("Create a smart wallet first (/wallet)");
  }

  const { data: keys } = await supabase
    .from("agent_session_keys")
    .select("allowed_actions, status")
    .eq("user_id", userId)
    .neq("status", "revoked");
  const canAct = ((keys ?? []) as { allowed_actions?: string[] }[]).some(
    (k) =>
      Array.isArray(k.allowed_actions) &&
      (k.allowed_actions.includes("trade") || k.allowed_actions.includes("defi")),
  );
  if (!canAct) {
    throw new Error("Mint a session key with trade (or defi) permission before live Yield");
  }

  return {
    address: wallet.address as Address,
    privateKey: decryptOwnerKey(wallet.owner_key_enc) as Hex,
  };
}

async function ownedCompany(
  supabase: { from: (t: string) => any },
  userId: string,
  companyId: string,
) {
  const { data } = await supabase
    .from("companies")
    .select(
      "id, owner_id, yield_armed, yield_paper, max_yield_notional_usdc, max_yield_risk_tier, yield_autopilot",
    )
    .eq("id", companyId)
    .eq("owner_id", userId)
    .maybeSingle();
  return data as null | {
    id: string;
    owner_id: string;
    yield_armed: boolean;
    yield_paper: boolean;
    max_yield_notional_usdc: number;
    max_yield_risk_tier: YieldRiskTier;
    yield_autopilot: YieldAutopilotConfig | null;
  };
}

function mergeAutopilot(raw: YieldAutopilotConfig | null | undefined): YieldAutopilotConfig {
  return { ...DEFAULT_AUTOPILOT, ...(raw ?? {}) };
}

export const listYieldCatalog = createServerFn({ method: "GET" }).handler(async () => {
  return YIELD_CATALOG.map((x) => ({
    id: x.id,
    name: x.name,
    tagline: x.tagline,
    chain: x.chain,
    protocol: x.protocol,
    kind: x.kind,
    riskTier: x.riskTier,
    targetApyPct: x.targetApyPct,
    apyBand: x.apyBand,
    assets: x.assets,
    howItWorks: x.howItWorks,
    risks: x.risks,
    standOut: x.standOut,
    minUsdc: x.minUsdc,
    maxBudgetPct: x.maxBudgetPct,
    liveReady: x.liveReady,
    docsUrl: x.docsUrl ?? null,
  }));
});

export const ensureYieldDesk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => {
    if (!input?.companyId) throw new Error("companyId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    if (!company) throw new Error("Company not found");
    const agent = await ensureYieldAgent(context.supabase, data.companyId);
    return {
      agentId: agent.id,
      yieldArmed: company.yield_armed,
      yieldPaper: company.yield_paper,
      maxNotional: Number(company.max_yield_notional_usdc),
      maxRiskTier: company.max_yield_risk_tier,
      autopilot: mergeAutopilot(company.yield_autopilot),
      catalog: yieldCatalogForTier(company.max_yield_risk_tier),
    };
  });

export const getYieldDeskState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => {
    if (!input?.companyId) throw new Error("companyId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    if (!company) throw new Error("Company not found");

    const agent = await ensureYieldAgent(context.supabase, data.companyId);
    const [{ data: positions }, { data: events }, { data: openTrades }] = await Promise.all([
      context.supabase
        .from("defi_positions")
        .select("*")
        .eq("company_id", data.companyId)
        .order("opened_at", { ascending: false })
        .limit(40),
      context.supabase
        .from("defi_events")
        .select("*")
        .eq("company_id", data.companyId)
        .order("created_at", { ascending: false })
        .limit(30),
      context.supabase
        .from("trades")
        .select("id")
        .eq("company_id", data.companyId)
        .eq("status", "open")
        .limit(5),
    ]);

    const open = (positions ?? []).filter((p: { status: string }) => p.status === "open");
    const openNotional = open.reduce(
      (s: number, p: { principal_usdc: number }) => s + Number(p.principal_usdc),
      0,
    );
    const openMark = open.reduce(
      (s: number, p: { mark_usdc: number }) => s + Number(p.mark_usdc),
      0,
    );
    const paperPnl = open.reduce(
      (s: number, p: { accrued_usdc: number }) => s + Number(p.accrued_usdc),
      0,
    );

    const autopilot = mergeAutopilot(company.yield_autopilot);
    const automation = await runYieldAutomations(context.supabase, {
      companyId: data.companyId,
      agentId: agent.id,
      autopilot,
      maxNotional: Number(company.max_yield_notional_usdc),
      maxRiskTier: company.max_yield_risk_tier,
      yieldArmed: company.yield_armed,
      yieldPaper: company.yield_paper,
      openPositions: open,
      quantHasOpenTrade: (openTrades ?? []).length > 0,
      dryRun: true,
    });

    return {
      agentId: agent.id,
      yieldArmed: company.yield_armed,
      yieldPaper: company.yield_paper,
      maxNotional: Number(company.max_yield_notional_usdc),
      maxRiskTier: company.max_yield_risk_tier,
      autopilot,
      openNotional,
      openMark,
      paperPnl,
      positions: positions ?? [],
      events: events ?? [],
      allowedCatalogIds: yieldCatalogForTier(company.max_yield_risk_tier).map((c) => c.id),
      automation,
    };
  });

export const setYieldDeskArmed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; armed: boolean }) => input)
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    if (!company) throw new Error("Company not found");
    await ensureYieldAgent(context.supabase, data.companyId);
    const { error } = await context.supabase
      .from("companies")
      .update({ yield_armed: data.armed })
      .eq("id", data.companyId);
    if (error) throw error;
    return { yieldArmed: data.armed };
  });

export const setYieldPaperMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; paper: boolean }) => input)
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    if (!company) throw new Error("Company not found");
    const { error } = await context.supabase
      .from("companies")
      .update({ yield_paper: data.paper })
      .eq("id", data.companyId);
    if (error) throw error;
    return { yieldPaper: data.paper };
  });

export const updateYieldRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      companyId: string;
      maxNotionalUsdc?: number;
      maxRiskTier?: YieldRiskTier;
    }) => {
      if (!input.companyId) throw new Error("companyId required");
      if (input.maxNotionalUsdc != null) {
        input.maxNotionalUsdc = Math.max(50, Math.min(100_000, input.maxNotionalUsdc));
      }
      if (input.maxRiskTier && !YIELD_RISK_ORDER.includes(input.maxRiskTier)) {
        throw new Error("Bad risk tier");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    if (!company) throw new Error("Company not found");
    const patch: Record<string, unknown> = {};
    if (data.maxNotionalUsdc != null) patch.max_yield_notional_usdc = data.maxNotionalUsdc;
    if (data.maxRiskTier != null) patch.max_yield_risk_tier = data.maxRiskTier;
    if (Object.keys(patch).length === 0) {
      return {
        yield_armed: company.yield_armed,
        yield_paper: company.yield_paper,
        max_yield_notional_usdc: company.max_yield_notional_usdc,
        max_yield_risk_tier: company.max_yield_risk_tier,
      };
    }
    const { data: updated, error } = await context.supabase
      .from("companies")
      .update(patch)
      .eq("id", data.companyId)
      .select("yield_armed, yield_paper, max_yield_notional_usdc, max_yield_risk_tier")
      .single();
    if (error) throw error;
    return updated;
  });

export const updateYieldAutopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; autopilot: Partial<YieldAutopilotConfig> }) => {
    if (!input.companyId) throw new Error("companyId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    if (!company) throw new Error("Company not found");
    const next = mergeAutopilot({ ...mergeAutopilot(company.yield_autopilot), ...data.autopilot });
    const { error } = await context.supabase
      .from("companies")
      .update({ yield_autopilot: next })
      .eq("id", data.companyId);
    if (error) throw error;
    return { autopilot: next };
  });

export const runYieldAutopilotNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; dryRun?: boolean }) => {
    if (!input.companyId) throw new Error("companyId required");
    return { companyId: input.companyId, dryRun: input.dryRun !== false };
  })
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    if (!company) throw new Error("Company not found");
    if (!company.yield_armed && !data.dryRun) throw new Error("Arm Yield desk first");

    const agent = await ensureYieldAgent(context.supabase, data.companyId);
    const [{ data: positions }, { data: openTrades }] = await Promise.all([
      context.supabase
        .from("defi_positions")
        .select("*")
        .eq("company_id", data.companyId)
        .eq("status", "open"),
      context.supabase
        .from("trades")
        .select("id")
        .eq("company_id", data.companyId)
        .eq("status", "open")
        .limit(5),
    ]);

    return runYieldAutomations(context.supabase, {
      companyId: data.companyId,
      agentId: agent.id,
      autopilot: mergeAutopilot(company.yield_autopilot),
      maxNotional: Number(company.max_yield_notional_usdc),
      maxRiskTier: company.max_yield_risk_tier,
      yieldArmed: company.yield_armed,
      yieldPaper: company.yield_paper,
      openPositions: positions ?? [],
      quantHasOpenTrade: (openTrades ?? []).length > 0,
      dryRun: data.dryRun,
      ...(!company.yield_paper && !data.dryRun
        ? {
            livePark: async (amountUsdc: number) => {
              try {
                const wallet = await loadLiveYieldWallet(context.supabase, context.userId);
                const fill = await supplyUsdcToAaveBase({
                  privateKey: wallet.privateKey,
                  walletAddress: wallet.address,
                  amountUsdc,
                });
                return { userOpHash: fill.userOpHash, wallet: fill.wallet };
              } catch (e) {
                console.warn("[yield] livePark failed", e instanceof Error ? e.message : e);
                return null;
              }
            },
          }
        : {}),
    });
  });

export const allocateYield = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; catalogId: string; amountUsdc: number }) => {
    if (!input.companyId || !input.catalogId) throw new Error("companyId + catalogId required");
    input.amountUsdc = Math.max(1, Math.min(100_000, Number(input.amountUsdc) || 0));
    return input;
  })
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    if (!company) throw new Error("Company not found");
    if (!company.yield_armed) throw new Error("Arm the Yield desk first");

    const item = yieldCatalogById(data.catalogId);
    if (!item) throw new Error("Unknown strategy");

    const paper = company.yield_paper;
    if (!paper && !item.liveReady) {
      throw new Error(
        "Live rails for this book are not armed yet — use Paper, Base USDC lending (Aave), or Day scalp via Quant",
      );
    }
    if (item.kind === "day_trade" && !paper) {
      throw new Error("Day scalp runs on the Quant desk — arm Quant + apply an intraday preset");
    }

    const agent = await ensureYieldAgent(context.supabase, data.companyId);
    const { data: openRows } = await context.supabase
      .from("defi_positions")
      .select("principal_usdc")
      .eq("company_id", data.companyId)
      .eq("status", "open");
    const openNotional = (openRows ?? []).reduce(
      (s: number, p: { principal_usdc: number }) => s + Number(p.principal_usdc),
      0,
    );

    let liveTx:
      | { userOpHash: string; wallet: string; protocol: string; chain: string }
      | undefined;

    if (!paper && item.id === "base_aave_usdc") {
      const wallet = await loadLiveYieldWallet(context.supabase, context.userId);
      const fill = await supplyUsdcToAaveBase({
        privateKey: wallet.privateKey,
        walletAddress: wallet.address,
        amountUsdc: data.amountUsdc,
      });
      liveTx = {
        userOpHash: fill.userOpHash,
        wallet: fill.wallet,
        protocol: "aave-v3",
        chain: "base",
      };
    } else if (!paper && item.liveReady && item.kind !== "day_trade") {
      throw new Error(`Live path for ${item.name} is not wired yet — use Paper`);
    }

    const position = await openYieldPosition(context.supabase, {
      companyId: data.companyId,
      catalogId: data.catalogId,
      amountUsdc: data.amountUsdc,
      paper,
      maxTier: company.max_yield_risk_tier,
      maxNotional: Number(company.max_yield_notional_usdc),
      openNotional,
      agentId: agent.id,
      ...(liveTx ? { liveTx } : {}),
    });

    return { position, liveTx: liveTx ?? null };
  });

export const closeYieldAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; positionId: string }) => input)
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(context.supabase, context.userId, data.companyId);
    if (!company) throw new Error("Company not found");

    const { data: pos } = await context.supabase
      .from("defi_positions")
      .select("id, paper, catalog_id, status")
      .eq("id", data.positionId)
      .eq("company_id", data.companyId)
      .maybeSingle();
    if (!pos) throw new Error("Position not found");

    let liveWithdraw: { userOpHash: string; withdrawnUsdc: number } | undefined;
    if (!pos.paper && pos.catalog_id === "base_aave_usdc" && pos.status === "open") {
      const wallet = await loadLiveYieldWallet(context.supabase, context.userId);
      const { data: siblings } = await context.supabase
        .from("defi_positions")
        .select("id, principal_usdc")
        .eq("company_id", data.companyId)
        .eq("catalog_id", "base_aave_usdc")
        .eq("paper", false)
        .eq("status", "open");
      const multi = (siblings ?? []).length > 1;
      const thisPrincipal = Number(
        (siblings ?? []).find((s: { id: string }) => s.id === data.positionId)?.principal_usdc ?? 0,
      );
      const fill = await withdrawUsdcFromAaveBase({
        privateKey: wallet.privateKey,
        walletAddress: wallet.address,
        ...(multi && thisPrincipal > 0 ? { amountUsdc: thisPrincipal } : {}),
      });
      liveWithdraw = {
        userOpHash: fill.userOpHash,
        withdrawnUsdc: fill.withdrawnUsdc,
      };
    }

    const position = await closeYieldPosition(
      context.supabase,
      data.companyId,
      data.positionId,
      liveWithdraw ? { liveWithdraw } : undefined,
    );
    return { position, liveWithdraw: liveWithdraw ?? null };
  });

/** Internal: called from trading worker tick. */
export async function runYieldTick() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as { from: (t: string) => any };
  const accrued = await accrueOpenYieldPositions(db);

  const { data: companies } = await db
    .from("companies")
    .select(
      "id, owner_id, yield_armed, yield_paper, max_yield_notional_usdc, max_yield_risk_tier, yield_autopilot",
    )
    .eq("yield_armed", true)
    .limit(25);

  let automationRuns = 0;
  for (const c of companies ?? []) {
    try {
      const agent = await ensureYieldAgent(db, c.id as string);
      const [{ data: positions }, { data: openTrades }] = await Promise.all([
        db.from("defi_positions").select("*").eq("company_id", c.id).eq("status", "open"),
        db.from("trades").select("id").eq("company_id", c.id).eq("status", "open").limit(5),
      ]);
      const ownerId = c.owner_id as string | undefined;
      await runYieldAutomations(db, {
        companyId: c.id as string,
        agentId: agent.id,
        autopilot: mergeAutopilot(c.yield_autopilot as YieldAutopilotConfig | null),
        maxNotional: Number(c.max_yield_notional_usdc),
        maxRiskTier: c.max_yield_risk_tier as YieldRiskTier,
        yieldArmed: true,
        yieldPaper: Boolean(c.yield_paper),
        openPositions: positions ?? [],
        quantHasOpenTrade: (openTrades ?? []).length > 0,
        dryRun: false,
        ...(!c.yield_paper && ownerId
          ? {
              livePark: async (amountUsdc: number) => {
                try {
                  const wallet = await loadLiveYieldWallet(db, ownerId);
                  const fill = await supplyUsdcToAaveBase({
                    privateKey: wallet.privateKey,
                    walletAddress: wallet.address,
                    amountUsdc,
                  });
                  return { userOpHash: fill.userOpHash, wallet: fill.wallet };
                } catch (e) {
                  console.warn("[yield-tick] livePark failed", e instanceof Error ? e.message : e);
                  return null;
                }
              },
            }
          : {}),
      });
      automationRuns += 1;
    } catch {
      // skip broken company rows
    }
  }

  return { ...accrued, automationRuns };
}
