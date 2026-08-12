import {
  yieldCatalogById,
  type YieldCatalogItem,
  type YieldRiskTier,
  YIELD_RISK_ORDER,
} from "@/lib/defi/catalog";

type Db = { from: (t: string) => any };

export const YIELD_AGENT_MEMORY =
  "Yield desk. Money works for money. Prefer documented APY bands, never invent on-chain fills. Paper accrues at conservative mid-APY. Live LP/lend/predict requires founder arm + caps. Respect risk tier ceiling. Aerodrome on Base, Pancake/Venus/Lista on BNB. Pair with Quant for day-trade velocity.";

export async function ensureYieldAgent(
  db: Db,
  companyId: string,
): Promise<{ id: string; memory: string | null; lessons_count: number }> {
  const { data: existing } = await db
    .from("agents")
    .select("id, memory, lessons_count")
    .eq("company_id", companyId)
    .eq("name", "Yield")
    .maybeSingle();
  if (existing) {
    return existing as { id: string; memory: string | null; lessons_count: number };
  }

  const { data: created, error } = await db
    .from("agents")
    .insert({
      company_id: companyId,
      name: "Yield",
      role: "Yield & Liquidity",
      avatar: "◈",
      accent: "emerald",
      status: "active",
      current_task: "Scanning Base + BNB books for idle capital",
      health: 100,
      performance: 0,
      activity: 0,
      revenue_generated: 0,
      credits_used: 0,
      tasks_completed: 0,
      lessons_count: 0,
      memory: YIELD_AGENT_MEMORY,
    })
    .select("id, memory, lessons_count")
    .single();
  if (error || !created) throw error ?? new Error("Could not hire Yield");

  await db.from("knowledge_items").insert({
    company_id: companyId,
    title: "Yield desk rules",
    summary:
      "Paper-first. Risk tiers: conservative→extreme. Aerodrome LP/veAERO on Base; Venus/Pancake/Lista on BNB; prediction books are extreme. Never claim live fills without tx. Accrual ≠ withdrawable cash until closed.",
    cluster: "Trading",
    source: "Yield",
  });

  await db.from("activity_events").insert({
    company_id: companyId,
    agent_id: created.id,
    kind: "hire",
    message: "Yield joined — money that works for money",
  });

  return created as { id: string; memory: string | null; lessons_count: number };
}

export function tierAllowed(maxTier: YieldRiskTier, itemTier: YieldRiskTier): boolean {
  return YIELD_RISK_ORDER.indexOf(itemTier) <= YIELD_RISK_ORDER.indexOf(maxTier);
}

/** Continuous compounding approx for paper: principal * (apy/100) * dtYears */
export function paperAccrualUsdc(
  principalUsdc: number,
  targetApyPct: number,
  fromMs: number,
  toMs: number,
): number {
  if (!(principalUsdc > 0) || !(targetApyPct > 0) || !(toMs > fromMs)) return 0;
  const years = (toMs - fromMs) / (365.25 * 24 * 3600 * 1000);
  // Simple interest for honesty (not exaggerated continuous)
  return principalUsdc * (targetApyPct / 100) * years;
}

export type OpenYieldArgs = {
  companyId: string;
  catalogId: string;
  amountUsdc: number;
  paper: boolean;
  maxTier: YieldRiskTier;
  maxNotional: number;
  openNotional: number;
  agentId: string;
  /** On-chain fill metadata (live rails). */
  liveTx?: {
    userOpHash: string;
    wallet: string;
    protocol: string;
    chain: string;
    liquidity?: string;
    pool?: string;
    gauge?: string;
    farm?: string;
    pid?: number;
    market?: string;
    lpTokens?: string;
    hashes?: string[];
  };
};

export function validateOpenYield(args: OpenYieldArgs, item: YieldCatalogItem): string | null {
  if (!tierAllowed(args.maxTier, item.riskTier)) {
    return `Risk tier ${item.riskTier} exceeds company ceiling (${args.maxTier})`;
  }
  if (args.amountUsdc < item.minUsdc) {
    return `Minimum allocate is $${item.minUsdc} USDC`;
  }
  if (args.amountUsdc + args.openNotional > args.maxNotional + 1e-6) {
    return `Would exceed yield budget ($${args.maxNotional} USDC)`;
  }
  const maxForBook = args.maxNotional * (item.maxBudgetPct / 100);
  if (args.amountUsdc > maxForBook + 1e-6) {
    return `Max ${item.maxBudgetPct}% of yield budget for this book ($${maxForBook.toFixed(0)})`;
  }
  if (!args.paper && !item.liveReady) {
    return "Live rails for this protocol are not armed yet — use Paper or pick a live-ready book (day scalp)";
  }
  return null;
}

export async function openYieldPosition(db: Db, args: OpenYieldArgs) {
  const item = yieldCatalogById(args.catalogId);
  if (!item) throw new Error("Unknown yield strategy");
  const err = validateOpenYield(args, item);
  if (err) throw new Error(err);

  const { data: strategyRow } = await db
    .from("defi_strategies")
    .select("id, status")
    .eq("company_id", args.companyId)
    .eq("catalog_id", item.id)
    .maybeSingle();

  let strategyId = strategyRow?.id as string | undefined;
  if (!strategyId) {
    const { data: created, error } = await db
      .from("defi_strategies")
      .insert({
        company_id: args.companyId,
        agent_id: args.agentId,
        catalog_id: item.id,
        name: item.name,
        chain: item.chain,
        protocol: item.protocol,
        kind: item.kind,
        risk_tier: item.riskTier,
        target_apy_pct: item.targetApyPct,
        status: "active",
        spec: {
          assets: item.assets,
          apyBand: item.apyBand,
          howItWorks: item.howItWorks,
          risks: item.risks,
        },
      })
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("Could not create strategy");
    strategyId = created.id as string;
  } else if (strategyRow.status !== "active") {
    await db
      .from("defi_strategies")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", strategyId);
  }

  const now = new Date().toISOString();
  const { data: position, error: posErr } = await db
    .from("defi_positions")
    .insert({
      company_id: args.companyId,
      strategy_id: strategyId,
      agent_id: args.agentId,
      catalog_id: item.id,
      chain: item.chain,
      protocol: item.protocol,
      kind: item.kind,
      risk_tier: item.riskTier,
      status: "open",
      paper: args.paper,
      principal_usdc: args.amountUsdc,
      mark_usdc: args.amountUsdc,
      accrued_usdc: 0,
      realized_pnl_usdc: 0,
      target_apy_pct: item.targetApyPct,
      metadata: {
        name: item.name,
        standOut: item.standOut,
        apyBand: item.apyBand,
        liveReady: item.liveReady,
        ...(args.liveTx
          ? {
              userOpHash: args.liveTx.userOpHash,
              wallet: args.liveTx.wallet,
              protocol: args.liveTx.protocol,
              chain: args.liveTx.chain,
              ...(args.liveTx.liquidity ? { liquidity: args.liveTx.liquidity } : {}),
              ...(args.liveTx.pool ? { pool: args.liveTx.pool } : {}),
              ...(args.liveTx.gauge ? { gauge: args.liveTx.gauge } : {}),
              ...(args.liveTx.farm ? { farm: args.liveTx.farm } : {}),
              ...(args.liveTx.pid != null ? { pid: args.liveTx.pid } : {}),
              ...(args.liveTx.market ? { market: args.liveTx.market } : {}),
              ...(args.liveTx.lpTokens ? { lpTokens: args.liveTx.lpTokens } : {}),
              ...(args.liveTx.hashes ? { hashes: args.liveTx.hashes } : {}),
            }
          : {}),
      },
      opened_at: now,
      last_accrual_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (posErr || !position) throw posErr ?? new Error("Could not open position");

  await db.from("defi_events").insert({
    company_id: args.companyId,
    position_id: position.id,
    strategy_id: strategyId,
    kind: "open",
    message: args.liveTx
      ? `Live supply $${args.amountUsdc} → ${item.name} · ${args.liveTx.userOpHash.slice(0, 10)}…`
      : `${args.paper ? "Paper" : "Live"} allocate $${args.amountUsdc} → ${item.name}`,
    amount_usdc: args.amountUsdc,
    metadata: {
      catalogId: item.id,
      riskTier: item.riskTier,
      ...(args.liveTx ? { userOpHash: args.liveTx.userOpHash } : {}),
    },
  });

  await db
    .from("agents")
    .update({
      current_task: `Managing ${item.name}`,
      activity: 80,
      updated_at: now,
    })
    .eq("id", args.agentId);

  return position;
}

export type CloseYieldOpts = {
  /** Live withdraw fill (skips paper accrual). */
  liveWithdraw?: {
    userOpHash: string;
    withdrawnUsdc: number;
  };
};

export async function closeYieldPosition(
  db: Db,
  companyId: string,
  positionId: string,
  opts?: CloseYieldOpts,
) {
  const { data: pos, error } = await db
    .from("defi_positions")
    .select("*")
    .eq("id", positionId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!pos) throw new Error("Position not found");
  if (pos.status !== "open") throw new Error("Position is not open");

  const nowMs = Date.now();
  const principal = Number(pos.principal_usdc);
  let accrued: number;
  let mark: number;
  let realized: number;
  let closeMsg: string;

  if (opts?.liveWithdraw) {
    const withdrawn = opts.liveWithdraw.withdrawnUsdc;
    realized = withdrawn - principal;
    accrued = Math.max(0, realized);
    mark = withdrawn;
    closeMsg = `Live withdraw ${pos.catalog_id} · $${withdrawn.toFixed(4)} · ${opts.liveWithdraw.userOpHash.slice(0, 10)}…`;
  } else {
    const last = new Date(pos.last_accrual_at as string).getTime();
    const extra = paperAccrualUsdc(principal, Number(pos.target_apy_pct), last, nowMs);
    accrued = Number(pos.accrued_usdc) + extra;
    mark = principal + accrued;
    realized = accrued;
    closeMsg = `Closed ${pos.catalog_id} — realized $${realized.toFixed(4)} (paper accrual)`;
  }

  const now = new Date(nowMs).toISOString();
  const prevMeta =
    pos.metadata && typeof pos.metadata === "object"
      ? (pos.metadata as Record<string, unknown>)
      : {};

  const { data: updated, error: upErr } = await db
    .from("defi_positions")
    .update({
      status: "closed",
      accrued_usdc: accrued,
      mark_usdc: mark,
      realized_pnl_usdc: realized,
      closed_at: now,
      last_accrual_at: now,
      updated_at: now,
      metadata: {
        ...prevMeta,
        ...(opts?.liveWithdraw
          ? {
              closeUserOpHash: opts.liveWithdraw.userOpHash,
              withdrawnUsdc: opts.liveWithdraw.withdrawnUsdc,
            }
          : {}),
      },
    })
    .eq("id", positionId)
    .select("*")
    .single();
  if (upErr || !updated) throw upErr ?? new Error("Close failed");

  await db.from("defi_events").insert({
    company_id: companyId,
    position_id: positionId,
    strategy_id: pos.strategy_id,
    kind: "close",
    message: closeMsg,
    amount_usdc: realized,
    metadata: opts?.liveWithdraw
      ? { userOpHash: opts.liveWithdraw.userOpHash, withdrawnUsdc: opts.liveWithdraw.withdrawnUsdc }
      : {},
  });

  return updated;
}

/** Accrue paper yield across open paper positions. */
export async function accrueOpenYieldPositions(db: Db, limit = 80) {
  const { data: rows, error } = await db
    .from("defi_positions")
    .select("id, company_id, principal_usdc, accrued_usdc, target_apy_pct, last_accrual_at")
    .eq("status", "open")
    .eq("paper", true)
    .order("last_accrual_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let updated = 0;
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  for (const row of rows ?? []) {
    const last = new Date(row.last_accrual_at as string).getTime();
    if (!(nowMs - last > 60_000)) continue;
    const delta = paperAccrualUsdc(
      Number(row.principal_usdc),
      Number(row.target_apy_pct),
      last,
      nowMs,
    );
    if (!(delta > 0)) {
      await db
        .from("defi_positions")
        .update({ last_accrual_at: now, updated_at: now })
        .eq("id", row.id);
      continue;
    }
    const accrued = Number(row.accrued_usdc) + delta;
    const mark = Number(row.principal_usdc) + accrued;
    await db
      .from("defi_positions")
      .update({
        accrued_usdc: accrued,
        mark_usdc: mark,
        last_accrual_at: now,
        updated_at: now,
      })
      .eq("id", row.id);
    updated += 1;
  }
  return { scanned: rows?.length ?? 0, updated };
}
