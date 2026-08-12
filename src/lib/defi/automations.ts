/**
 * Yield Autopilot — creative ROI engines that make Aura OS stand out.
 * Paper-first: produces recommendations + optional auto-actions when armed.
 */

import { yieldCatalogById, type YieldRiskTier, YIELD_RISK_ORDER } from "@/lib/defi/catalog";
import {
  DEFAULT_AUTOPILOT,
  type YieldAutopilotConfig,
} from "@/lib/defi/autopilot-config";

type Db = { from: (t: string) => any };

export type { YieldAutopilotConfig };
export { DEFAULT_AUTOPILOT };

export type AutomationInsight = {
  id: string;
  engine: string;
  title: string;
  detail: string;
  severity: "info" | "action" | "warn" | "critical";
  catalogId?: string;
  meta?: Record<string, unknown>;
};

export type AutomationAction = {
  kind: "park_idle" | "close_il" | "compound_note" | "compound_live" | "tier_down";
  message: string;
  catalogId?: string;
  positionId?: string;
  amountUsdc?: number;
};

export type YieldAutomationResult = {
  epoch: ReturnType<typeof aerodromeEpochStatus>;
  predictiveEdges: PredictivePoolEdge[];
  insights: AutomationInsight[];
  actions: AutomationAction[];
  executed: string[];
  choreography: {
    yieldBudget: number;
    quantReserve: number;
    deployable: number;
    openYield: number;
    freeCapacity: number;
  };
};

export type PredictivePoolEdge = {
  pool: string;
  chain: "base" | "bsc";
  protocol: string;
  voteSharePct: number;
  predictedDemandPct: number;
  predictiveEdgePct: number;
  bribeUsd: number;
  note: string;
};

/** Aerodrome epoch: Thu 00:00 UTC → Wed 23:59; votes due Wed 23:00 UTC. */
export function aerodromeEpochStatus(nowMs: number = Date.now()) {
  const now = new Date(nowMs);
  const day = now.getUTCDay(); // 0 Sun … 4 Thu
  const daysSinceThu = (day - 4 + 7) % 7;
  const epochStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceThu,
    0,
    0,
    0,
  );
  const epochEnd = epochStart + 7 * 24 * 3600 * 1000 - 1000;
  const voteDeadline = epochStart + 6 * 24 * 3600 * 1000 + 23 * 3600 * 1000; // Wed 23:00
  const msToVote = voteDeadline - nowMs;
  const msToEpochEnd = epochEnd - nowMs;
  const elapsedPct = Math.min(100, Math.max(0, ((nowMs - epochStart) / (7 * 24 * 3600 * 1000)) * 100));

  return {
    epochStartIso: new Date(epochStart).toISOString(),
    epochEndIso: new Date(epochEnd).toISOString(),
    voteDeadlineIso: new Date(voteDeadline).toISOString(),
    hoursToVoteDeadline: Math.max(0, msToVote / 3600_000),
    hoursToEpochEnd: Math.max(0, msToEpochEnd / 3600_000),
    elapsedPct,
    voteWindowOpen: nowMs < voteDeadline,
    label:
      msToVote > 0
        ? `Vote window open — ${formatHours(msToVote / 3600_000)} until Wed 23:00 UTC`
        : `Votes locked — next epoch in ${formatHours(msToEpochEnd / 3600_000)}`,
  };
}

function formatHours(h: number): string {
  if (h >= 48) return `${(h / 24).toFixed(1)}d`;
  if (h >= 1) return `${h.toFixed(1)}h`;
  return `${Math.max(0, h * 60).toFixed(0)}m`;
}

/**
 * Simulated predictive edges for demo/paper — replaces Sugar/RPC until live adapter.
 * Positive edge = under-voted vs predicted fee demand (classic voter ROI opportunity).
 */
export function scoutPredictiveEdges(seed: number = Date.now()): PredictivePoolEdge[] {
  const jitter = (n: number) => {
    const x = Math.sin(seed / 1e6 + n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  const pools: Omit<PredictivePoolEdge, "predictiveEdgePct">[] = [
    {
      pool: "WETH/USDC Slipstream",
      chain: "base",
      protocol: "Aerodrome",
      voteSharePct: 12 + jitter(1) * 4,
      predictedDemandPct: 14 + jitter(2) * 5,
      bribeUsd: 40_000 + jitter(3) * 80_000,
      note: "Core Base pair — emissions sticky when volume holds.",
    },
    {
      pool: "cbBTC/WETH",
      chain: "base",
      protocol: "Aerodrome",
      voteSharePct: 8 + jitter(4) * 3,
      predictedDemandPct: 11 + jitter(5) * 4,
      bribeUsd: 25_000 + jitter(6) * 60_000,
      note: "BTC narrative volume — watch IL if BTC runs alone.",
    },
    {
      pool: "AERO/USDC",
      chain: "base",
      protocol: "Aerodrome",
      voteSharePct: 6 + jitter(7) * 3,
      predictedDemandPct: 5 + jitter(8) * 2,
      bribeUsd: 15_000 + jitter(9) * 40_000,
      note: "Often over-voted vs organic fees — voter ROI may be thin.",
    },
    {
      pool: "Ignition / new listing gauge",
      chain: "base",
      protocol: "Aerodrome",
      voteSharePct: 2 + jitter(10) * 2,
      predictedDemandPct: 7 + jitter(11) * 5,
      bribeUsd: 80_000 + jitter(12) * 120_000,
      note: "Bribe-heavy early epoch — agents enter then exit when bribes die.",
    },
    {
      pool: "USDT/USDC stableswap",
      chain: "bsc",
      protocol: "PancakeSwap",
      voteSharePct: 0,
      predictedDemandPct: 0,
      bribeUsd: 0,
      note: "BNB stable farm — score by CAKE APR decay, not ve votes.",
    },
  ];

  return pools
    .map((p) => ({
      ...p,
      predictiveEdgePct: Number((p.predictedDemandPct - p.voteSharePct).toFixed(2)),
    }))
    .sort((a, b) => b.predictiveEdgePct - a.predictiveEdgePct);
}

/** Crude paper IL stress: volatile LPs bleed mark vs principal over time. */
export function simulateIlStressPct(
  kind: string,
  riskTier: string,
  openedAtMs: number,
  nowMs: number,
  seed: number,
): number {
  if (kind === "lending" || kind === "prediction" || kind === "arb" || kind === "day_trade") {
    return 0;
  }
  const days = Math.max(0, (nowMs - openedAtMs) / 86_400_000);
  const vol =
    riskTier === "extreme" ? 1.8 : riskTier === "aggressive" ? 1.2 : riskTier === "balanced" ? 0.55 : 0.15;
  const wave = Math.abs(Math.sin(seed / 8e7 + days / 3)) * vol * Math.sqrt(days + 0.25);
  return Number(Math.min(35, wave * 2.2).toFixed(2));
}

type OpenPos = {
  id: string;
  catalog_id: string;
  kind: string;
  risk_tier: string;
  principal_usdc: number;
  mark_usdc: number;
  accrued_usdc: number;
  paper: boolean;
  opened_at: string;
  target_apy_pct: number;
  last_accrual_at?: string;
};

export async function runYieldAutomations(
  db: Db,
  args: {
    companyId: string;
    agentId: string;
    autopilot: YieldAutopilotConfig;
    maxNotional: number;
    maxRiskTier: YieldRiskTier;
    yieldArmed: boolean;
    yieldPaper: boolean;
    openPositions: OpenPos[];
    quantHasOpenTrade: boolean;
    dryRun: boolean;
    /** When set, auto-park can execute live Aave/Venus supply (owner wallet). */
    livePark?: (amountUsdc: number, catalogId: string) => Promise<{
      userOpHash: string;
      wallet: string;
    } | null>;
    /** When set, live compound can claim AERO → USDC → optional Aave. */
    liveCompound?: () => Promise<{
      userOpHash: string;
      usdcOut: number;
      parkedToAave: boolean;
      skipped?: string;
      hashes: string[];
    } | null>;
  },
): Promise<YieldAutomationResult> {
  const { listLimitlessActiveMarkets } = await import("@/lib/defi/guessmarket-base.server");
  const { openYieldPosition, closeYieldPosition, paperAccrualUsdc } =
    await import("@/lib/defi/yield.server");

  const now = Date.now();
  const epoch = aerodromeEpochStatus(now);
  const predictiveEdges = scoutPredictiveEdges(now);
  const insights: AutomationInsight[] = [];
  const actions: AutomationAction[] = [];
  const executed: string[] = [];

  const openYield = args.openPositions.reduce((s, p) => s + Number(p.principal_usdc), 0);
  const quantReserve = args.maxNotional * (args.autopilot.quantReservePct / 100);
  const deployable = Math.max(0, args.maxNotional - quantReserve);
  const freeCapacity = Math.max(0, deployable - openYield);

  const choreography = {
    yieldBudget: args.maxNotional,
    quantReserve,
    deployable,
    openYield,
    freeCapacity,
  };

  // --- Epoch Hunter ---
  if (args.autopilot.epochHunter) {
    insights.push({
      id: "epoch-status",
      engine: "Epoch Hunter",
      title: epoch.label,
      detail: `Epoch ${Math.round(epoch.elapsedPct)}% elapsed. Votes set next week's AERO stream — miss Wed 23:00 UTC and your prior votes roll.`,
      severity: epoch.hoursToVoteDeadline < 12 && epoch.voteWindowOpen ? "warn" : "info",
      meta: epoch,
    });

    const best = predictiveEdges.filter((e) => e.protocol === "Aerodrome" && e.predictiveEdgePct > 0).slice(0, 3);
    for (const edge of best) {
      insights.push({
        id: `edge-${edge.pool}`,
        engine: "Predictive Edge Scout",
        title: `${edge.pool}: +${edge.predictiveEdgePct}% edge`,
        detail: `Predicted demand ${edge.predictedDemandPct.toFixed(1)}% vs vote share ${edge.voteSharePct.toFixed(1)}%. ${edge.note}`,
        severity: edge.predictiveEdgePct > 3 ? "action" : "info",
        catalogId: edge.predictiveEdgePct > 4 ? "base_aero_volatile_lp" : "base_aero_usdc_weth_lp",
        meta: edge,
      });
    }

    try {
      const lim = await listLimitlessActiveMarkets(4);
      for (const m of lim.slice(0, 3)) {
        const yes = m.prices[0];
        const skew = Math.abs(yes - 0.5);
        insights.push({
          id: `limitless-${m.slug}`,
          engine: "Predictive Edge Scout",
          title: `Limitless: ${m.title}`,
          detail: `YES ${Math.round(yes * 100)}% / NO ${Math.round(m.prices[1] * 100)}% · vol ${m.volumeFormatted ?? "—"} · CLOB scout only (fills need API key).`,
          severity: skew > 0.2 ? "action" : "info",
          catalogId: "base_limitless_pred",
          meta: m,
        });
      }
    } catch {
      /* public scout best-effort */
    }

    if (epoch.voteWindowOpen && epoch.hoursToVoteDeadline < 36) {
      actions.push({
        kind: "compound_note",
        message: "Recast veAERO toward under-voted fee demand before Wed 23:00 UTC",
        catalogId: "base_veaero_voter",
      });
    }
  }

  // --- Idle Capital Router ---
  if (args.autopilot.idleRouter && !args.quantHasOpenTrade && freeCapacity >= 25) {
    const idleItem = yieldCatalogById(args.autopilot.idleCatalogId) ?? yieldCatalogById("base_aave_usdc");
    const alreadyParked = args.openPositions.some((p) => p.catalog_id === idleItem?.id);
    if (idleItem && !alreadyParked) {
      const parkAmt = Math.min(freeCapacity, Math.max(idleItem.minUsdc, freeCapacity * 0.5));
      insights.push({
        id: "idle-router",
        engine: "Idle Capital Router",
        title: "Quant is flat — park residual",
        detail: `No open Quant trade. Free yield capacity ~$${freeCapacity.toFixed(0)}. Suggest $${parkAmt.toFixed(0)} into ${idleItem.name} so money works between scalp windows.`,
        severity: "action",
        catalogId: idleItem.id,
      });
      actions.push({
        kind: "park_idle",
        message: `Park $${parkAmt.toFixed(0)} in ${idleItem.name}`,
        catalogId: idleItem.id,
        amountUsdc: parkAmt,
      });

      if (
        !args.dryRun &&
        args.autopilot.autoParkIdle &&
        args.yieldArmed &&
        YIELD_RISK_ORDER.indexOf(idleItem.riskTier) <= YIELD_RISK_ORDER.indexOf(args.maxRiskTier)
      ) {
        const canPaper = args.yieldPaper;
        const canLive =
          !args.yieldPaper &&
          idleItem.liveReady &&
          (idleItem.id === "base_aave_usdc" || idleItem.id === "bsc_venus_usdc");
        if (canPaper || canLive) {
          let liveTx:
            | { userOpHash: string; wallet: string; protocol: string; chain: string }
            | undefined;
          if (canLive) {
            if (!args.livePark) {
              insights.push({
                id: "idle-live-blocked",
                engine: "Idle Capital Router",
                title: "Live park needs wallet rails",
                detail: "Auto-park live is armed but wallet/session key is unavailable this tick.",
                severity: "warn",
                catalogId: idleItem.id,
              });
            } else {
              const fill = await args.livePark(parkAmt, idleItem.id);
              if (!fill) {
                insights.push({
                  id: "idle-live-skipped",
                  engine: "Idle Capital Router",
                  title: "Live park skipped",
                  detail: "Could not supply lending rail this tick (balance, network, or key).",
                  severity: "warn",
                  catalogId: idleItem.id,
                });
              } else {
                liveTx = {
                  userOpHash: fill.userOpHash,
                  wallet: fill.wallet,
                  protocol: idleItem.id === "bsc_venus_usdc" ? "venus" : "aave-v3",
                  chain: idleItem.chain,
                };
              }
            }
          }

          if (canPaper || liveTx) {
            await openYieldPosition(db, {
              companyId: args.companyId,
              catalogId: idleItem.id,
              amountUsdc: parkAmt,
              paper: canPaper,
              maxTier: args.maxRiskTier,
              maxNotional: args.maxNotional,
              openNotional: openYield,
              agentId: args.agentId,
              ...(liveTx ? { liveTx } : {}),
            });
            executed.push(
              liveTx
                ? `live-parked $${parkAmt.toFixed(0)} → ${idleItem.id}`
                : `parked $${parkAmt.toFixed(0)} → ${idleItem.id}`,
            );
          }
        }
      }
    }
  } else if (args.autopilot.idleRouter && args.quantHasOpenTrade) {
    insights.push({
      id: "idle-hold",
      engine: "Idle Capital Router",
      title: "Quant is live — keep reserve",
      detail: `Holding ~$${quantReserve.toFixed(0)} Quant reserve (${args.autopilot.quantReservePct}% of yield budget) for velocity.`,
      severity: "info",
    });
  }

  // --- IL Thermostat ---
  if (args.autopilot.ilThermostat) {
    for (const pos of args.openPositions) {
      const il = simulateIlStressPct(
        pos.kind,
        pos.risk_tier,
        new Date(pos.opened_at).getTime(),
        now,
        new Date(pos.opened_at).getTime(),
      );
      if (il <= 0) continue;
      const severity =
        il >= args.autopilot.ilBudgetPct * 1.5
          ? "critical"
          : il >= args.autopilot.ilBudgetPct
            ? "warn"
            : "info";
      insights.push({
        id: `il-${pos.id}`,
        engine: "IL Thermostat",
        title: `${pos.catalog_id}: ~${il}% IL stress`,
        detail:
          il >= args.autopilot.ilBudgetPct
            ? `Past ${args.autopilot.ilBudgetPct}% IL budget — exit or tighten range before emissions can't cover the bleed.`
            : `Within budget (${args.autopilot.ilBudgetPct}%). Keep harvesting; agents watch the stress mark.`,
        severity,
        catalogId: pos.catalog_id,
        meta: { positionId: pos.id, ilPct: il },
      });
      if (il >= args.autopilot.ilBudgetPct) {
        actions.push({
          kind: "close_il",
          message: `Close ${pos.catalog_id} — IL stress ${il}%`,
          positionId: pos.id,
          catalogId: pos.catalog_id,
        });
        if (!args.dryRun && args.yieldArmed && pos.paper) {
          await closeYieldPosition(db, args.companyId, pos.id);
          executed.push(`il-exit ${pos.catalog_id}`);
          await db.from("defi_events").insert({
            company_id: args.companyId,
            position_id: pos.id,
            kind: "il_exit",
            message: `IL Thermostat closed paper position at ~${il}% stress`,
            amount_usdc: Number(pos.accrued_usdc),
            metadata: { ilPct: il, budget: args.autopilot.ilBudgetPct },
          });
        }
      }
    }
  }

  // --- Compound Cascade ---
  if (args.autopilot.compoundCascade) {
    const farmLike = args.openPositions.filter((p) =>
      ["lp", "farm", "ve_lock"].includes(p.kind),
    );
    const liveAero = args.openPositions.some(
      (p) => p.catalog_id === "base_aero_usdc_weth_lp" && !p.paper,
    );
    if (farmLike.length) {
      const harvest = farmLike.reduce((s, p) => {
        const last = new Date(p.last_accrual_at ?? p.opened_at).getTime();
        return (
          s +
          paperAccrualUsdc(Number(p.principal_usdc), Number(p.target_apy_pct), last, now) +
          Number(p.accrued_usdc) * 0.15
        );
      }, 0);
      insights.push({
        id: "compound-cascade",
        engine: "Compound Cascade",
        title: liveAero
          ? "Live AERO claim → USDC → Aave park"
          : "Harvest → swap → restake → optional lock",
        detail: liveAero
          ? `Open live Aerodrome LP detected. Cascade claims gauge AERO, swaps to USDC via OKX, parks into Aave when auto-compound is on.`
          : `Est. claimable paper rewards ~$${Math.max(0, harvest).toFixed(4)}. Cascade: claim AERO/CAKE → 70% back to LP, 30% toward ve-lock flywheel when risk tier allows.`,
        severity: liveAero || harvest > 0.5 ? "action" : "info",
        catalogId: liveAero ? "base_aero_usdc_weth_lp" : "base_veaero_voter",
      });
      actions.push({
        kind: liveAero ? "compound_live" : "compound_note",
        message: liveAero
          ? "Claim AERO rewards and compound to USDC/Aave"
          : "Run compound cascade on farm/LP books",
        amountUsdc: harvest,
        ...(liveAero ? { catalogId: "base_aero_usdc_weth_lp" } : {}),
      });

      if (
        !args.dryRun &&
        args.yieldArmed &&
        !args.yieldPaper &&
        liveAero &&
        args.autopilot.autoCompoundLive
      ) {
        if (!args.liveCompound) {
          insights.push({
            id: "compound-live-blocked",
            engine: "Compound Cascade",
            title: "Live compound needs wallet rails",
            detail: "Auto-compound is on but wallet/session key unavailable this tick.",
            severity: "warn",
            catalogId: "base_aero_usdc_weth_lp",
          });
        } else {
          const fill = await args.liveCompound();
          if (!fill) {
            insights.push({
              id: "compound-live-skipped",
              engine: "Compound Cascade",
              title: "Live compound skipped",
              detail: "No claimable AERO or swap failed this tick.",
              severity: "warn",
              catalogId: "base_aero_usdc_weth_lp",
            });
          } else if (fill.skipped) {
            insights.push({
              id: "compound-live-dust",
              engine: "Compound Cascade",
              title: "Rewards below threshold",
              detail: fill.skipped,
              severity: "info",
              catalogId: "base_aero_usdc_weth_lp",
            });
            executed.push(`compound_skipped:${fill.skipped}`);
          } else {
            await db.from("defi_events").insert({
              company_id: args.companyId,
              kind: "compound_live",
              message: fill.parkedToAave
                ? `Live compound ~$${fill.usdcOut.toFixed(4)} USDC → Aave · ${fill.userOpHash.slice(0, 10)}…`
                : `Live compound claimed → ~$${fill.usdcOut.toFixed(4)} USDC · ${fill.userOpHash.slice(0, 10)}…`,
              amount_usdc: fill.usdcOut,
              metadata: {
                userOpHash: fill.userOpHash,
                hashes: fill.hashes,
                parkedToAave: fill.parkedToAave,
              },
            });
            executed.push(
              fill.parkedToAave
                ? `compound_live_aave_$${fill.usdcOut.toFixed(2)}`
                : `compound_live_$${fill.usdcOut.toFixed(2)}`,
            );
            await db
              .from("agents")
              .update({
                current_task: "Compounding AERO → USDC (live)",
                activity: 95,
                updated_at: new Date().toISOString(),
              })
              .eq("id", args.agentId);
          }
        }
      } else if (!args.dryRun && args.yieldArmed && harvest > 1 && !liveAero) {
        await db.from("defi_events").insert({
          company_id: args.companyId,
          kind: "compound_cascade",
          message: `Compound Cascade marked ~$${harvest.toFixed(4)} for restake/lock path`,
          amount_usdc: harvest,
          metadata: { path: ["harvest", "swap", "restake", "optional_lock"] },
        });
        executed.push("compound_cascade_logged");
        await db
          .from("agents")
          .update({
            current_task: "Compounding rewards into LP + ve flywheel",
            activity: 90,
            updated_at: new Date().toISOString(),
          })
          .eq("id", args.agentId);
      }
    }
  }

  // --- Risk Autopilot ---
  if (args.autopilot.riskAutopilot) {
    const paperPnl = args.openPositions.reduce((s, p) => {
      const il = simulateIlStressPct(
        p.kind,
        p.risk_tier,
        new Date(p.opened_at).getTime(),
        now,
        new Date(p.opened_at).getTime(),
      );
      const stress = Number(p.principal_usdc) * (il / 100);
      return s + Number(p.accrued_usdc) - stress;
    }, 0);
    if (paperPnl < -Math.max(15, args.maxNotional * 0.04)) {
      const idx = YIELD_RISK_ORDER.indexOf(args.maxRiskTier);
      const nextTier = idx > 0 ? YIELD_RISK_ORDER[idx - 1]! : args.maxRiskTier;
      insights.push({
        id: "risk-autopilot",
        engine: "Risk Autopilot",
        title: "Drawdown thermostat tripped",
        detail: `Stressed paper PnL ~$${paperPnl.toFixed(2)}. Recommend ceiling ${args.maxRiskTier} → ${nextTier} until books heal.`,
        severity: "critical",
      });
      actions.push({
        kind: "tier_down",
        message: `Downgrade max risk to ${nextTier}`,
      });
      if (!args.dryRun && nextTier !== args.maxRiskTier) {
        await db
          .from("companies")
          .update({ max_yield_risk_tier: nextTier })
          .eq("id", args.companyId);
        executed.push(`tier_down→${nextTier}`);
      }
    }
  }

  // Dual-desk pitch
  insights.push({
    id: "dual-desk",
    engine: "Dual-Desk Choreography",
    title: "Velocity + parking = money working for money",
    detail: `Budget $${args.maxNotional}: $${quantReserve.toFixed(0)} reserved for Quant turns, $${deployable.toFixed(0)} for Yield. Open Yield $${openYield.toFixed(0)}. Free $${freeCapacity.toFixed(0)}.`,
    severity: "info",
    meta: choreography,
  });

  return { epoch, predictiveEdges, insights, actions, executed, choreography };
}
