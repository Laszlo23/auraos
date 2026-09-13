import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { SpotlightTour } from "@/components/aura/spotlight-tour";
import type { BacktestSnapshot } from "@/components/aura/trading/backtest-results-dialog";
import { GrowFundsHub, type GrowPath } from "@/components/aura/trading/grow-funds-hub";
const TradingAdvancedPanel = lazy(() =>
  import("@/components/aura/trading/trading-advanced-panel").then((m) => ({
    default: m.TradingAdvancedPanel,
  })),
);
import { TradingPageDrawers } from "@/components/aura/trading/trading-page-drawers";
import type {
  Signal,
  Strategy,
  Trade,
  Whale,
  WhaleEvent,
} from "@/components/aura/trading/trading-page-types";
import type { DeskDrawerId } from "@/components/aura/trading/desk-drawers";
import { useAwardXp, useProgress } from "@/hooks/use-progress";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { useSmartWallet } from "@/hooks/use-earn";
import { confirmFioOrContinue, useFioReady } from "@/hooks/use-fio-ready";
import { requireKycApproved, useKycStatus } from "@/hooks/use-kyc";
import { useMyHandle } from "@/hooks/use-identity";
import { FioPayoutNudge } from "@/components/aura/fio-payout-nudge";
import { getTreasuryBalance } from "@/lib/treasury.functions";
import { issueAgentSessionKey } from "@/lib/wallet.functions";
import { ensureYieldDesk, getYieldDeskState } from "@/lib/defi/yield.functions";
import {
  applyTradingPreset,
  approveStrategy,
  createStrategyFromPrompt,
  ensureTradingDesk,
  getHolderPerks,
  getTradingArena,
  getTradingDeskReadiness,
  runStrategyBacktest,
  setTradingDeskArmed,
  setTradingPaperMode,
  triggerTradingTick,
  updateTradingRisk,
} from "@/lib/trading.functions";
import { clampFounderRiskPct } from "@/lib/trading/risk-policy";

export const Route = createFileRoute("/_authenticated/trading")({
  head: () => ({
    meta: [
      { title: "Put money to work | Aura OS" },
      {
        name: "description",
        content:
          "DeFi in plain words. Ready, Working, Result. Trade, earn, or play. Practice first.",
      },
      { property: "og:title", content: "Put money to work — Aura OS" },
      {
        property: "og:description",
        content: "Three simple paths: trade, earn, or play. Practice first, real money when ready.",
      },
    ],
  }),
  component: TradingPage,
});

const TOUR_STOPS = [
  {
    target: "[data-tour='trading-market']",
    title: "Pro desk",
    body: "Charts and risk live here if you want them. Most people stay on the simple paths.",
  },
  {
    target: "[data-tour='trading-checklist']",
    title: "Get ready",
    body: "Pick a style, add USDC, start. Live fills are real Base swaps.",
  },
];

function TradingPage() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const { data: handle } = useMyHandle();
  const fio = useFioReady();
  const kyc = useKycStatus();
  const { data: wallet } = useSmartWallet(handle?.id);
  const [advanced, setAdvanced] = useState(false);
  const { data: trades = [] } = useCompanyTable<Trade>("trades", {
    orderBy: "opened_at",
    ascending: false,
    refetchInterval: 15_000,
  });
  const { data: strategies = [] } = useCompanyTable<Strategy>("trading_strategies", {
    orderBy: "created_at",
    ascending: false,
  });
  const { data: signals = [] } = useCompanyTable<Signal>("trading_signals", {
    orderBy: "created_at",
    ascending: false,
    limit: 30,
    refetchInterval: 20_000,
    enabled: advanced,
  });
  const { data: whales = [] } = useCompanyTable<Whale>("smart_money_wallets", {
    orderBy: "label",
    enabled: advanced,
  });
  const { data: whaleEvents = [] } = useCompanyTable<WhaleEvent>("smart_money_events", {
    orderBy: "created_at",
    ascending: false,
    limit: 20,
    enabled: advanced,
  });
  const { data: treasury } = useQuery({
    queryKey: ["treasury-balance"],
    queryFn: () => getTreasuryBalance(),
    staleTime: 20_000,
  });
  const readinessQ = useQuery({
    queryKey: ["trading-readiness"],
    queryFn: () => getTradingDeskReadiness(),
    refetchInterval: 20_000,
  });
  const arenaQ = useQuery({
    queryKey: ["trading-arena"],
    queryFn: () => getTradingArena(),
    refetchInterval: 60_000,
    enabled: advanced,
  });
  const perksQ = useQuery({
    queryKey: ["holder-perks"],
    queryFn: () => getHolderPerks(),
    staleTime: 30_000,
  });

  const { data: progress } = useProgress();
  const award = useAwardXp();
  const [burst, setBurst] = useState(0);
  const [toastXp, setToastXp] = useState<{ label: string; amount: number } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [riskDay, setRiskDay] = useState(250);
  const [riskPct, setRiskPct] = useState(0.5);
  const [issuingKey, setIssuingKey] = useState(false);
  const [labHighlight, setLabHighlight] = useState(false);
  const [labExternal, setLabExternal] = useState<{
    strategyId: string;
    name: string;
    backtest: BacktestSnapshot;
  } | null>(null);
  const [drawer, setDrawer] = useState<DeskDrawerId>(null);
  const [growPath, setGrowPath] = useState<GrowPath>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("path");
    if (q === "pulse" || q === "trade" || q === "liquidity") {
      setGrowPath(q);
    }
  }, []);

  const yieldQ = useQuery({
    queryKey: ["yield-desk", company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      await ensureYieldDesk({ data: { companyId: company.id } });
      return getYieldDeskState({ data: { companyId: company.id } }) as Promise<{
        openNotional?: number;
        paperPnl?: number;
      }>;
    },
    enabled: Boolean(company?.id),
    refetchInterval: 45_000,
  });

  const scrollToLab = (opts?: { highlight?: boolean }) => {
    if (opts?.highlight) {
      setLabHighlight(true);
      window.setTimeout(() => setLabHighlight(false), 2400);
    }
    setDrawer("backtest");
  };

  const doneQuests = new Set(progress?.completed_quests ?? []);
  const armed = Boolean(company?.trading_armed);
  const readiness = readinessQ.data;

  useEffect(() => {
    if (!company?.id) return;
    void ensureTradingDesk({ data: { companyId: company.id } }).then(() => {
      void qc.invalidateQueries({ queryKey: ["table", "agents"] });
      void qc.invalidateQueries({ queryKey: ["table", "smart_money_wallets"] });
    });
  }, [company?.id, qc]);

  useEffect(() => {
    if (company?.max_notional_usdc_day != null) setRiskDay(Number(company.max_notional_usdc_day));
    if (company?.max_risk_pct != null)
      setRiskPct(clampFounderRiskPct(Number(company.max_risk_pct)));
  }, [company?.max_notional_usdc_day, company?.max_risk_pct]);

  const pop = (label: string, amount: number, quest: string) => {
    if (doneQuests.has(quest)) return;
    const boost = 1 + (perksQ.data?.questXpBoostPct ?? 0) / 100;
    const xp = Math.round(amount * boost);
    setBurst((n) => n + 1);
    setToastXp({ label, amount: xp });
    setTimeout(() => setToastXp(null), 2400);
    award.mutate({ amount, quest });
  };

  const open = trades.filter((t) => t.status === "open");
  const closed = trades.filter((t) => t.status === "closed");
  const liveClosed = closed.filter((t) => !t.paper);
  const realized = liveClosed.reduce((s, t) => s + Number(t.pnl), 0);
  const openPnl = open.reduce((s, t) => s + Number(t.pnl), 0);
  const pendingSignals = signals.filter((s) => s.status === "pending");
  const liveSignals = signals.filter((s) => s.status === "approved" || s.status === "executed");
  const paperMode = Boolean(readiness?.paper);

  const invalidateTrading = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["table", "trading_strategies"] }),
      qc.invalidateQueries({ queryKey: ["table", "trading_signals"] }),
      qc.invalidateQueries({ queryKey: ["table", "trades"] }),
      qc.invalidateQueries({ queryKey: ["table", "smart_money_wallets"] }),
      qc.invalidateQueries({ queryKey: ["table", "smart_money_events"] }),
      qc.invalidateQueries({ queryKey: ["company"] }),
      qc.invalidateQueries({ queryKey: ["trading-readiness"] }),
      qc.invalidateQueries({ queryKey: ["trading-arena"] }),
      qc.invalidateQueries({ queryKey: ["holder-perks"] }),
    ]);
  };

  const onPreset = async (presetId: string, opts?: { openLab?: boolean }) => {
    if (!company) return;
    setBusy(presetId);
    try {
      const res = await applyTradingPreset({ data: { companyId: company.id, presetId } });
      pop("Preset ready", 80, "trading:strategy");
      pop("Backtest reviewed", 100, "trading:backtest");
      pop("Strategy approved", 120, "trading:approve");
      setLabExternal({
        strategyId: res.strategyId,
        name: res.name,
        backtest: res.backtest as BacktestSnapshot,
      });
      if (opts?.openLab ?? advanced) {
        scrollToLab({ highlight: true });
      }
      toast.success(`${res.name} is ready — tap Start when you want Aura to begin.`);
      await invalidateTrading();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply preset");
    } finally {
      setBusy(null);
    }
  };

  const onIssueKey = async () => {
    if (!company) return false;
    setIssuingKey(true);
    try {
      await issueAgentSessionKey({
        data: {
          companyId: company.id,
          agentId: null,
          walletId: (wallet as { id?: string } | null)?.id ?? null,
          label: "Quant Trade",
          spendCap: Math.max(100, Number(company.max_notional_usdc_day ?? 250)),
          allowedActions: ["trade", "api_buy"],
          days: 30,
        },
      });
      pop("Trade key issued", 100, "trading:session");
      toast.success("Trading allowed. Revoke anytime on Wallet.");
      await invalidateTrading();
      void qc.invalidateQueries({ queryKey: ["session-keys"] });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not allow trading");
      return false;
    } finally {
      setIssuingKey(false);
    }
  };

  const onStartSimpleTrade = async () => {
    if (!company) return;
    if (!readiness?.hasTradeKey) {
      const ok = await onIssueKey();
      if (!ok) return;
    }
    await onArm(true);
  };

  const onCreate = async () => {
    if (!company || !prompt.trim()) return;
    setBusy("create");
    try {
      const res = await createStrategyFromPrompt({
        data: { companyId: company.id, prompt },
      });
      setPrompt("");
      pop("Strategy drafted", 80, "trading:strategy");
      scrollToLab({ highlight: true });
      toast.success(
        res.usedFallback
          ? `${res.name} saved with a safe MA-cross fallback (AI was slow). Run backtest next.`
          : `${res.name} drafted — open Backtest Lab and hit Run backtest.`,
      );
      setDrawer("strategies");
      await invalidateTrading();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/failed to fetch|networkerror|aborted|load failed/i.test(msg)) {
        toast.error(
          "Could not reach the trading server. Refresh the page and try Draft again — if the AI is busy we still save a fallback strategy.",
        );
      } else {
        toast.error(msg || "Could not create strategy");
      }
    } finally {
      setBusy(null);
    }
  };

  const onBacktest = async (strategyId: string) => {
    if (!company) return;
    setBusy(`bt-${strategyId}`);
    try {
      const res = await runStrategyBacktest({ data: { companyId: company.id, strategyId } });
      pop("Backtest complete", 100, "trading:backtest");
      const name = strategies.find((s) => s.id === strategyId)?.name ?? "Strategy";
      setLabExternal({
        strategyId: res.id,
        name,
        backtest: res.backtest as BacktestSnapshot,
      });
      scrollToLab({ highlight: true });
      await invalidateTrading();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setBusy(null);
    }
  };

  const onApprove = async (strategyId: string) => {
    if (!company) return;
    setBusy(`ap-${strategyId}`);
    try {
      await approveStrategy({ data: { companyId: company.id, strategyId } });
      pop("Strategy approved", 120, "trading:approve");
      toast.success("Strategy approved. Arm the desk when ready.");
      await invalidateTrading();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  };

  const onArm = async (next: boolean) => {
    if (!company) return;
    if (next && !paperMode) {
      if (
        !confirmFioOrContinue(
          fio.ready,
          "quant-live",
          "Attest a FIO handle before arming the live Quant desk — so your receive identity is clear when capital moves.",
        )
      ) {
        toast.message("Set up FIO on Identity first", {
          action: { label: "Open", onClick: () => (window.location.href = "/identity") },
        });
        return;
      }
      if (!requireKycApproved(kyc.data, "trading")) {
        toast.message("Verify identity before live trading", {
          description: "Didit KYC is required when this host gates the live desk.",
          action: { label: "Open", onClick: () => (window.location.href = "/identity") },
        });
        return;
      }
    }
    setBusy("arm");
    try {
      const res = await setTradingDeskArmed({ data: { companyId: company.id, armed: next } });
      if (next) {
        if (readiness?.funded) pop("Wallet funded", 80, "trading:fund");
        pop("Desk armed", 120, "trading:arm");
        const tick = (
          res as {
            tick?: { evald?: { signals?: number; checked?: number }; exec?: { executed?: number } };
          }
        )?.tick;
        if (tick) {
          toast.success(
            `Desk armed · Quant checked ${tick.evald?.checked ?? 0} · ${tick.evald?.signals ?? 0} signal(s) · ${tick.exec?.executed ?? 0} fill(s)`,
          );
        } else {
          toast.success("Trading is on — Aura can trade inside your cap.");
        }
      } else {
        toast.success("Trading stopped.");
      }
      await invalidateTrading();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update arm state");
    } finally {
      setBusy(null);
    }
  };

  const onRunQuant = async () => {
    if (!company) return;
    setBusy("quant-tick");
    try {
      const tick = await triggerTradingTick({ data: { companyId: company.id } });
      const t = tick as {
        evald?: { signals?: number; checked?: number; errors?: string[] };
        exec?: { executed?: number; errors?: string[] };
      };
      const errN = (t.evald?.errors?.length ?? 0) + (t.exec?.errors?.length ?? 0);
      toast.success(
        `Quant ran · checked ${t.evald?.checked ?? 0} · ${t.evald?.signals ?? 0} signal(s) · ${t.exec?.executed ?? 0} fill(s)${errN ? ` · ${errN} note(s)` : ""}`,
      );
      await invalidateTrading();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Quant tick failed");
    } finally {
      setBusy(null);
    }
  };

  const onPaperMode = async (paper: boolean) => {
    if (!company) return;
    if (!paper) {
      if (
        !confirmFioOrContinue(
          fio.ready,
          "quant-live",
          "Going live means real Base swaps. Attest FIO so your company has a human-readable crypto receive rail.",
        )
      ) {
        toast.message("Set up FIO on Identity first", {
          action: { label: "Open", onClick: () => (window.location.href = "/identity") },
        });
        return;
      }
      if (!requireKycApproved(kyc.data, "trading")) {
        toast.message("Verify identity before going live", {
          action: { label: "Open", onClick: () => (window.location.href = "/identity") },
        });
        return;
      }
    }
    setBusy("paper");
    try {
      await setTradingPaperMode({ data: { companyId: company.id, paper } });
      toast.success(
        paper
          ? "Practice on — pretend fills only."
          : "Real money on — Base swaps when you start.",
      );
      await invalidateTrading();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set paper mode");
    } finally {
      setBusy(null);
    }
  };

  const onSaveRisk = async () => {
    if (!company) return;
    try {
      const capped = clampFounderRiskPct(riskPct);
      setRiskPct(capped);
      await updateTradingRisk({
        data: {
          companyId: company.id,
          max_notional_usdc_day: riskDay,
          max_risk_pct: capped,
        },
      });
      toast.success("Risk caps saved.");
      await qc.invalidateQueries({ queryKey: ["company"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save risk");
    }
  };

  const network = treasury?.network ?? "base-sepolia";
  const explorer =
    network === "base" ? "https://basescan.org/tx/" : "https://sepolia.basescan.org/tx/";

  const hasStrategy = Boolean(readiness?.hasApprovedStrategy || readiness?.hasBacktest);
  const setupComplete = Boolean(readiness?.armed);
  const onboarding = !setupComplete;
  const needsKeyBanner = hasStrategy && !readiness?.hasTradeKey;

  const openBacktestReview = () => {
    const withBt = strategies.find((s) => s.backtest);
    if (withBt?.backtest) {
      setLabExternal({
        strategyId: withBt.id,
        name: withBt.name,
        backtest: withBt.backtest,
      });
    }
    setDrawer("backtest");
  };

  const activeStrategy =
    strategies.find((s) => s.status === "approved") ??
    strategies.find((s) => s.backtest) ??
    strategies[0] ??
    null;

  const dailyUsed = useMemo(() => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const t0 = start.getTime();
    return trades
      .filter((t) => new Date(t.opened_at).getTime() >= t0)
      .reduce((s, t) => s + Number(t.size), 0);
  }, [trades]);

  const showSetup = !readiness?.hasTradeKey || !hasStrategy;

  const tradeWorkingUsdc = open.reduce((s, t) => s + Number(t.size), 0);
  const liquidityWorkingUsdc = Number(yieldQ.data?.openNotional ?? 0);
  const liquidityResultUsdc = Number(yieldQ.data?.paperPnl ?? 0);
  const availableUsdc = Number(treasury?.usdc ?? readiness?.usdc ?? 0);

  return (
    <div className="space-y-6">
      <Celebrate trigger={burst} />
      <XpToast label={toastXp?.label ?? ""} amount={toastXp?.amount ?? 0} show={Boolean(toastXp)} />
      <SpotlightTour
        stops={TOUR_STOPS}
        storageKey="aura.trading.setup.tour.v5"
        ctaLabel="How this works"
        replayLabel="Replay tips"
        autoOpen={onboarding && advanced}
      />

      <FioPayoutNudge context="turning on real-money trading" />

      <GrowFundsHub
        path={growPath}
        onPath={setGrowPath}
        advanced={advanced}
        onAdvanced={setAdvanced}
        availableUsdc={availableUsdc}
        tradeWorkingUsdc={tradeWorkingUsdc}
        liquidityWorkingUsdc={liquidityWorkingUsdc}
        tradeResultUsdc={realized + openPnl}
        liquidityResultUsdc={liquidityResultUsdc}
        companyId={company?.id ?? null}
        readiness={readiness}
        tradeBusyId={busy}
        armBusy={busy === "arm" || issuingKey}
        paperBusy={busy === "paper"}
        onPickStrategy={(id) => void onPreset(id, { openLab: false })}
        onStartTrade={() => void onStartSimpleTrade()}
        onStopTrade={() => void onArm(false)}
        onPracticeTrade={() => void onPaperMode(true)}
        onRealMoneyTrade={() => void onPaperMode(false)}
        childrenAdvanced={
          <Suspense
            fallback={
              <p className="text-[13px] text-muted-foreground">Loading pro desk…</p>
            }
          >
          <TradingAdvancedPanel
            companyId={company?.id ?? null}
            armed={armed}
            paperMode={paperMode}
            busy={busy}
            issuingKey={issuingKey}
            readiness={readiness}
            dailyLimit={Number(company?.max_notional_usdc_day ?? riskDay)}
            dailyUsed={dailyUsed}
            availableUsdc={availableUsdc}
            maxRiskPct={Number(company?.max_risk_pct ?? riskPct)}
            open={open}
            closed={closed}
            activeStrategy={activeStrategy}
            pendingSignalCount={pendingSignals.length}
            whaleEvents={whaleEvents}
            riskDay={riskDay}
            riskPct={riskPct}
            needsKeyBanner={needsKeyBanner}
            showSetup={showSetup}
            onRiskDay={setRiskDay}
            onRiskPct={setRiskPct}
            onPaperMode={(p) => void onPaperMode(p)}
            onArm={(next) => void onArm(next)}
            onOpenDrawer={setDrawer}
            onRunQuant={() => void onRunQuant()}
            onIssueKey={() => void onIssueKey()}
            onStartSteadyEth={() => void onPreset("steady_eth")}
            onSaveRisk={() => void onSaveRisk()}
            onReviewBacktest={openBacktestReview}
          />
          </Suspense>
        }
      />

      <TradingPageDrawers
        drawer={drawer}
        onDrawer={setDrawer}
        companyId={company?.id ?? null}
        strategies={strategies}
        trades={trades}
        whales={whales}
        whaleEvents={whaleEvents}
        labHighlight={labHighlight}
        labExternal={labExternal}
        onExternalResultConsumed={() => setLabExternal(null)}
        busy={busy}
        prompt={prompt}
        onPrompt={setPrompt}
        realized={realized}
        openPnl={openPnl}
        openCount={open.length}
        closedCount={closed.length}
        pendingSignals={pendingSignals}
        liveSignals={liveSignals}
        explorer={explorer}
        arena={arenaQ.data}
        perks={perksQ.data}
        doneQuests={doneQuests}
        hasTradeKey={Boolean(readiness?.hasTradeKey)}
        onApproveStrategy={(id) => void onApprove(id)}
        onBacktest={(id) => void onBacktest(id)}
        onCreate={() => void onCreate()}
        onPreset={(id) => void onPreset(id)}
        onInvalidate={invalidateTrading}
      />
    </div>
  );
}
