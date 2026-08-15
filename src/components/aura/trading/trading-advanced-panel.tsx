import { ShieldCheck } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { DeskChainSwitcher } from "@/components/aura/desk-chain-switcher";
import { QuantDeskCockpit } from "@/components/aura/trading/quant-desk-cockpit";
import { TradingSetup, type DeskReadiness } from "@/components/aura/trading/start-checklist";
import { YieldDeskPanel } from "@/components/aura/trading/yield-desk-panel";
import type { DeskDrawerId } from "@/components/aura/trading/desk-drawers";
import { effectiveSpotRiskPct } from "@/lib/trading/risk-policy";

import type { Strategy, Trade, WhaleEvent } from "@/components/aura/trading/trading-page-types";

export function TradingAdvancedPanel({
  companyId,
  armed,
  paperMode,
  busy,
  issuingKey,
  readiness,
  dailyLimit,
  dailyUsed,
  availableUsdc,
  maxRiskPct,
  open,
  closed,
  activeStrategy,
  pendingSignalCount,
  whaleEvents,
  riskDay,
  riskPct,
  needsKeyBanner,
  showSetup,
  onRiskDay,
  onRiskPct,
  onPaperMode,
  onArm,
  onOpenDrawer,
  onRunQuant,
  onIssueKey,
  onStartSteadyEth,
  onSaveRisk,
  onReviewBacktest,
}: {
  companyId: string | null;
  armed: boolean;
  paperMode: boolean;
  busy: string | null;
  issuingKey: boolean;
  readiness: DeskReadiness | undefined;
  dailyLimit: number;
  dailyUsed: number;
  availableUsdc: number;
  maxRiskPct: number;
  open: Trade[];
  closed: Trade[];
  activeStrategy: Strategy | null;
  pendingSignalCount: number;
  whaleEvents: WhaleEvent[];
  riskDay: number;
  riskPct: number;
  needsKeyBanner: boolean;
  showSetup: boolean;
  onRiskDay: (n: number) => void;
  onRiskPct: (n: number) => void;
  onPaperMode: (paper: boolean) => void;
  onArm: (next: boolean) => void;
  onOpenDrawer: (id: Exclude<DeskDrawerId, null>) => void;
  onRunQuant: () => void;
  onIssueKey: () => void;
  onStartSteadyEth: () => void;
  onSaveRisk: () => void;
  onReviewBacktest: () => void;
}) {
  return (
    <div className="space-y-6">
      <QuantDeskCockpit
        armed={armed}
        paper={paperMode}
        paperBusy={busy === "paper"}
        armBusy={busy === "arm"}
        canArm={Boolean(readiness?.canArm)}
        blockReason={readiness?.blockReason ?? null}
        dailyLimit={dailyLimit}
        dailyUsed={dailyUsed}
        usdcBalance={availableUsdc}
        maxRiskPct={effectiveSpotRiskPct(maxRiskPct)}
        openTrades={open}
        closedTrades={closed}
        activeStrategy={activeStrategy}
        hasApprovedStrategy={Boolean(readiness?.hasApprovedStrategy)}
        pendingSignals={pendingSignalCount}
        whaleEvents={whaleEvents}
        onPaperMode={onPaperMode}
        onArm={onArm}
        onOpenDrawer={onOpenDrawer}
      />

      {armed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/50 bg-foreground/[0.03] px-5 py-3.5">
          <p className="text-[13px] text-muted-foreground">
            Quant evaluates MA/breakout entries on each tick. Cron runs every ~10m — or run now.
          </p>
          <button
            type="button"
            disabled={busy === "quant-tick"}
            onClick={onRunQuant}
            className="shrink-0 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy === "quant-tick" ? "Running Quant…" : "Run Quant now"}
          </button>
        </div>
      ) : null}

      <DeskChainSwitcher
        className="px-1"
        invalidateKeys={[["trading-readiness"], ["trading-arena"]]}
      />

      {companyId ? <YieldDeskPanel companyId={companyId} /> : null}

      {needsKeyBanner ? (
        <div
          data-tour="trading-key-banner"
          className="flex flex-col gap-3 rounded-3xl border border-primary/35 bg-primary/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-primary">Trade session key required next</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Quant still cannot place swaps until you issue a Trade session key — a revocable
              permission slip, not your seed phrase.
            </p>
          </div>
          <button
            type="button"
            disabled={issuingKey}
            onClick={onIssueKey}
            className="shrink-0 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {issuingKey ? "Issuing…" : "Issue Trade key"}
          </button>
        </div>
      ) : null}

      {showSetup ? (
        <TradingSetup
          readiness={readiness}
          onIssueKey={onIssueKey}
          issuingKey={issuingKey}
          onStartSteadyEth={onStartSteadyEth}
          steadyBusy={busy === "steady_eth"}
          onArm={() => onArm(true)}
          armBusy={busy === "arm"}
          onEnablePaper={() => onPaperMode(true)}
          paperBusy={busy === "paper"}
          onReviewBacktest={onReviewBacktest}
        />
      ) : null}

      {readiness?.hasTradeKey ? (
        <Panel label="Risk caps" data-tour="trading-hero">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-[11px] text-muted-foreground">
              Max USDC / day
              <input
                type="number"
                value={riskDay}
                onChange={(e) => onRiskDay(Number(e.target.value))}
                className="mt-1 w-full rounded-xl bg-foreground/6 px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Max risk % per idea
              <input
                type="number"
                step="0.1"
                min={0.1}
                max={3}
                value={riskPct}
                onChange={(e) => onRiskPct(Number(e.target.value))}
                className="mt-1 w-full rounded-xl bg-foreground/6 px-3 py-2 text-sm outline-none"
              />
            </label>
            <button
              type="button"
              onClick={onSaveRisk}
              className="self-end rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary"
            >
              Save caps
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 text-[12px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>
              Base hard USDC cap:{" "}
              <span className="text-foreground">2% of wallet equity per idea</span> (industry spot
              band 1–3%). Founder setting max 3%. Caps and Disarm are the kill switch — Quant cannot
              exceed daily notional or the hard equity ceiling.
            </span>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
