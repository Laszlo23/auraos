import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Activity, Gauge, Sparkles, Thermometer, Timer, Waves, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { FioPayoutNudge } from "@/components/aura/fio-payout-nudge";
import { YIELD_CATALOG, riskTierLabel, type YieldRiskTier } from "@/lib/defi/catalog";
import {
  allocateYield,
  closeYieldAllocation,
  ensureYieldDesk,
  getYieldDeskState,
  runYieldAutopilotNow,
  setYieldDeskArmed,
  setYieldPaperMode,
  updateYieldAutopilot,
  updateYieldRisk,
  type YieldDeskState,
} from "@/lib/defi/yield.functions";
import type { YieldAutomationResult } from "@/lib/defi/automations";
import { confirmFioOrContinue, useFioReady } from "@/hooks/use-fio-ready";
import { cn } from "@/lib/utils";

const TIER_TONES: Record<YieldRiskTier, "gold" | "primary" | "neutral" | "danger"> = {
  conservative: "gold",
  balanced: "primary",
  aggressive: "neutral",
  extreme: "danger",
};

export function YieldDeskPanel({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const fio = useFioReady();
  const [amountById, setAmountById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const deskQ = useQuery({
    queryKey: ["yield-desk", companyId],
    queryFn: async () => {
      await ensureYieldDesk({ data: { companyId } });
      return getYieldDeskState({ data: { companyId } });
    },
    enabled: Boolean(companyId),
    refetchInterval: 45_000,
  });

  const state = deskQ.data as YieldDeskState | undefined;
  const catalog = useMemo(() => {
    const allowed = new Set(state?.allowedCatalogIds ?? YIELD_CATALOG.map((c) => c.id));
    return YIELD_CATALOG.filter((c) => allowed.has(c.id));
  }, [state?.allowedCatalogIds]);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["yield-desk", companyId] });

  const armMut = useMutation({
    mutationFn: (armed: boolean) => setYieldDeskArmed({ data: { companyId, armed } }),
    onSuccess: () => {
      toast.success("Yield desk updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paperMut = useMutation({
    mutationFn: (paper: boolean) => setYieldPaperMode({ data: { companyId, paper } }),
    onSuccess: (_data, paper) => {
      toast.success(paper ? "Paper mode on" : "Live mode — Aave+Aero+Venus+Pancake+GuessMarket");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tryLive = () => {
    if (state?.yieldPaper) {
      if (
        !confirmFioOrContinue(
          fio.ready,
          "yield-live",
          "Live yield moves real USDC. Attest a FIO handle so your receive identity is set.",
        )
      ) {
        toast.message("Set up FIO on Identity first", {
          action: { label: "Open", onClick: () => (window.location.href = "/identity") },
        });
        return;
      }
    }
    paperMut.mutate(!state?.yieldPaper);
  };

  async function onAllocate(catalogId: string) {
    const raw = amountById[catalogId] ?? "50";
    const amountUsdc = Number(raw);
    setBusy(catalogId);
    try {
      await allocateYield({ data: { companyId, catalogId, amountUsdc } });
      toast.success("Capital allocated — money at work");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Allocate failed");
    } finally {
      setBusy(null);
    }
  }

  async function onClose(positionId: string) {
    setBusy(positionId);
    try {
      await closeYieldAllocation({ data: { companyId, positionId } });
      toast.success("Position closed");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusy(null);
    }
  }

  async function onAutopilot(dryRun: boolean) {
    setBusy(dryRun ? "scan" : "run");
    try {
      const res = (await runYieldAutopilotNow({
        data: { companyId, dryRun },
      })) as YieldAutomationResult;
      toast.success(
        dryRun
          ? `${res.insights.length} insights · ${res.actions.length} suggested actions`
          : `Executed ${res.executed.length || 0} automation steps`,
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Autopilot failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleAuto(key: keyof NonNullable<typeof state>["autopilot"], value: boolean) {
    try {
      await updateYieldAutopilot({ data: { companyId, autopilot: { [key]: value } } });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save autopilot");
    }
  }

  async function setTier(maxRiskTier: YieldRiskTier) {
    try {
      await updateYieldRisk({ data: { companyId, maxRiskTier } });
      toast.success(`Risk ceiling: ${riskTierLabel(maxRiskTier)}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Risk update failed");
    }
  }

  if (deskQ.isLoading && !state) {
    return (
      <Panel label="Yield Desk" glow>
        <p className="text-[13px] text-muted-foreground">Waking Yield agent…</p>
      </Panel>
    );
  }

  const auto = state?.autopilot;
  const automation = state?.automation;
  const openPositions = (state?.positions ?? []).filter((p) => p.status === "open");

  return (
    <div className="space-y-5" data-tour="yield-desk">
      <Panel label="Yield Desk — money that works for money" glow>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[15px] font-semibold tracking-tight">
              Dual-desk OS: Quant turns inventory. Yield parks the rest.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Live rails: Aave, Aerodrome+compound, Venus, Pancake, GuessMarket pred LP (Base)
              (BNB). Other books stay paper until wired — founder-capped either way.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip tone={state?.yieldPaper ? "gold" : "danger"}>
              {state?.yieldPaper ? "Paper" : "Live (5 rails)"}
            </Chip>
            <Chip tone={state?.yieldArmed ? "primary" : "neutral"}>
              {state?.yieldArmed ? "Armed" : "Disarmed"}
            </Chip>
            <Chip tone={TIER_TONES[(state?.maxRiskTier as YieldRiskTier) ?? "balanced"]}>
              {riskTierLabel((state?.maxRiskTier as YieldRiskTier) ?? "balanced")}
            </Chip>
          </div>
        </div>

        <FioPayoutNudge context="switching Yield to live" className="mt-4" />

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { k: "Budget", v: `$${(state?.maxNotional ?? 0).toFixed(0)}` },
            { k: "Open", v: `$${(state?.openNotional ?? 0).toFixed(0)}` },
            { k: "Mark", v: `$${(state?.openMark ?? 0).toFixed(2)}` },
            { k: "Paper PnL", v: `$${(state?.paperPnl ?? 0).toFixed(4)}` },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-2xl border border-border/40 bg-foreground/[0.03] px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{s.k}</p>
              <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={armMut.isPending}
            onClick={() => armMut.mutate(!state?.yieldArmed)}
            className="rounded-xl bg-foreground px-4 py-2 text-[12px] font-semibold text-background"
          >
            {state?.yieldArmed ? "Disarm Yield" : "Arm Yield"}
          </button>
          <button
            type="button"
            disabled={paperMut.isPending}
            onClick={tryLive}
            className="rounded-xl border border-border/60 px-4 py-2 text-[12px] font-semibold"
          >
            {state?.yieldPaper ? "Try live mode" : "Back to paper"}
          </button>
          {(["conservative", "balanced", "aggressive", "extreme"] as YieldRiskTier[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => void setTier(t)}
              className={cn(
                "rounded-xl border px-3 py-2 text-[11px] font-semibold capitalize",
                state?.maxRiskTier === t
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Panel>

      <Panel label="Autopilot engines" glow>
        <p className="text-[13px] text-muted-foreground">
          Creative OS automations — Epoch Hunter, Idle Router, IL Thermostat, Compound Cascade, Risk
          Autopilot. Scan anytime; execute only when armed.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["idleRouter", "Idle Capital Router", Waves],
              ["ilThermostat", "IL Thermostat", Thermometer],
              ["epochHunter", "Epoch Hunter", Timer],
              ["compoundCascade", "Compound Cascade", Sparkles],
              ["autoCompoundLive", "Auto-compound live AERO", Sparkles],
              ["riskAutopilot", "Risk Autopilot", Gauge],
              ["autoParkIdle", "Auto-park idle (live/paper)", Zap],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => void toggleAuto(key, !(auto?.[key] as boolean))}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                auto?.[key]
                  ? "border-primary/40 bg-primary/[0.07]"
                  : "border-border/40 bg-foreground/[0.02] opacity-70",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-[12px] font-semibold">{label}</p>
                <p className="text-[10px] text-muted-foreground">{auto?.[key] ? "On" : "Off"}</p>
              </div>
            </button>
          ))}
        </div>

        {automation?.epoch ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-border/50 bg-gradient-to-br from-foreground/[0.04] to-transparent p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-semibold">Aerodrome epoch</p>
              <Chip tone="gold">{Math.round(automation.epoch.elapsedPct)}% elapsed</Chip>
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">{automation.epoch.label}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, automation.epoch.elapsedPct)}%` }}
              />
            </div>
          </motion.div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy === "scan"}
            onClick={() => void onAutopilot(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-4 py-2 text-[12px] font-semibold"
          >
            <Activity className="h-3.5 w-3.5" />
            {busy === "scan" ? "Scanning…" : "Scan ROI engines"}
          </button>
          <button
            type="button"
            disabled={busy === "run" || !state?.yieldArmed}
            onClick={() => void onAutopilot(false)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            {busy === "run" ? "Running…" : "Execute autopilot"}
          </button>
        </div>

        {automation?.insights?.length ? (
          <div className="mt-4 space-y-2">
            {automation.insights.slice(0, 8).map((ins) => (
              <div
                key={ins.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  ins.severity === "critical"
                    ? "border-rose-500/40 bg-rose-500/10"
                    : ins.severity === "warn"
                      ? "border-amber-500/40 bg-amber-500/10"
                      : ins.severity === "action"
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/40 bg-foreground/[0.02]",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {ins.engine}
                  </p>
                  <Chip tone="primary">{ins.severity}</Chip>
                </div>
                <p className="mt-1 text-[13px] font-medium">{ins.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {ins.detail}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {automation?.predictiveEdges?.length ? (
          <div className="mt-4 overflow-x-auto">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Predictive edge scout (paper model)
            </p>
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Pool</th>
                  <th className="pb-2 font-medium">Vote %</th>
                  <th className="pb-2 font-medium">Demand %</th>
                  <th className="pb-2 font-medium">Edge</th>
                </tr>
              </thead>
              <tbody>
                {automation.predictiveEdges.slice(0, 5).map((e) => (
                  <tr key={e.pool} className="border-t border-border/30">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{e.pool}</span>
                      <span className="ml-2 text-muted-foreground">{e.protocol}</span>
                    </td>
                    <td className="py-2 font-mono tabular-nums">{e.voteSharePct.toFixed(1)}</td>
                    <td className="py-2 font-mono tabular-nums">
                      {e.predictedDemandPct.toFixed(1)}
                    </td>
                    <td
                      className={cn(
                        "py-2 font-mono tabular-nums",
                        e.predictiveEdgePct > 0 ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {e.predictiveEdgePct > 0 ? "+" : ""}
                      {e.predictiveEdgePct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Panel label="Strategy books" glow>
        <div className="grid gap-3 md:grid-cols-2">
          {catalog.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-border/50 bg-foreground/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-semibold">{c.name}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{c.tagline}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Chip tone={TIER_TONES[c.riskTier]}>{riskTierLabel(c.riskTier)}</Chip>
                  <Chip tone="gold">~{c.targetApyPct}% mid</Chip>
                  <Chip tone={c.liveReady ? "primary" : "neutral"}>
                    {c.liveReady ? "Live ready" : "Paper"}
                  </Chip>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{c.standOut}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {c.chain.toUpperCase()} · {c.protocol} · {c.kind} · band {c.apyBand[0]}–
                {c.apyBand[1]}%
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={c.minUsdc}
                  step={10}
                  value={amountById[c.id] ?? String(Math.max(50, c.minUsdc))}
                  onChange={(e) => setAmountById((m) => ({ ...m, [c.id]: e.target.value }))}
                  className="w-24 rounded-lg border border-border/60 bg-background/40 px-2 py-1.5 font-mono text-[12px]"
                />
                <button
                  type="button"
                  disabled={!state?.yieldArmed || busy === c.id}
                  onClick={() => void onAllocate(c.id)}
                  className="rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background disabled:opacity-40"
                >
                  {busy === c.id ? "…" : "Allocate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {openPositions.length ? (
        <Panel label="Open yield positions">
          <div className="space-y-2">
            {openPositions.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 px-3 py-2.5"
              >
                <div>
                  <p className="text-[13px] font-medium">{p.catalog_id}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.protocol} · {p.paper ? "paper" : "live"} · principal $
                    {Number(p.principal_usdc).toFixed(2)} · accrued $
                    {Number(p.accrued_usdc).toFixed(4)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => void onClose(p.id)}
                  className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-semibold"
                >
                  Close
                </button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
