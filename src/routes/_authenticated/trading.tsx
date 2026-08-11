import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Panel, Chip } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { Spark } from "@/components/aura/spark";
import { QuestTrail } from "@/components/aura/quests";
import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { SpotlightTour } from "@/components/aura/spotlight-tour";
import { TradingSetup } from "@/components/aura/trading/start-checklist";
import { PresetsPanel } from "@/components/aura/trading/presets-panel";
import { ArenaBoard } from "@/components/aura/trading/arena-board";
import { HolderAdvantages } from "@/components/aura/trading/holder-advantages";
import { BacktestLab } from "@/components/aura/trading/backtest-lab";
import type { BacktestSnapshot } from "@/components/aura/trading/backtest-results-dialog";
import { QuantDeskCockpit } from "@/components/aura/trading/quant-desk-cockpit";
import { YieldDeskPanel } from "@/components/aura/trading/yield-desk-panel";
import { DeskChainSwitcher } from "@/components/aura/desk-chain-switcher";
import {
  DeskDrawerShell,
  type DeskDrawerId,
} from "@/components/aura/trading/desk-drawers";
import { TRADING_QUESTS } from "@/lib/gamify";
import { useAwardXp, useProgress } from "@/hooks/use-progress";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { useSmartWallet } from "@/hooks/use-earn";
import { useMyHandle } from "@/hooks/use-identity";
import { getTreasuryBalance } from "@/lib/treasury.functions";
import { issueAgentSessionKey } from "@/lib/wallet.functions";
import {
  applyTradingPreset,
  approveStrategy,
  approveTradingSignal,
  createStrategyFromPrompt,
  ensureTradingDesk,
  followSmartMoneyWallet,
  getHolderPerks,
  getTradingArena,
  getTradingDeskReadiness,
  mirrorSmartMoneyEvent,
  rejectTradingSignal,
  runStrategyBacktest,
  setTradingDeskArmed,
  setTradingPaperMode,
  updateTradingRisk,
} from "@/lib/trading.functions";
import { currency, timeAgo } from "@/lib/format";
import { clampFounderRiskPct, effectiveSpotRiskPct } from "@/lib/trading/risk-policy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trading")({
  head: () => ({
    meta: [
      { title: "Quant + Yield Desk — money that works | Aura OS" },
      {
        name: "description",
        content:
          "Dual desk: Quant spot/day-trade + Yield Autopilot for Aerodrome, Pancake, Venus, and prediction — founder-capped.",
      },
      { property: "og:title", content: "Quant + Yield Desk — AI capital OS" },
      {
        property: "og:description",
        content: "Idle router, epoch hunter, IL thermostat — money working for money.",
      },
    ],
  }),
  component: TradingPage,
});

type Trade = {
  id: string;
  symbol: string;
  side: string;
  size: number;
  entry: number;
  exit: number | null;
  pnl: number;
  confidence: number;
  status: string;
  rationale: string | null;
  opened_at: string;
  tx_hash?: string | null;
  mark_price?: number | null;
  paper?: boolean | null;
};

type Strategy = {
  id: string;
  name: string;
  prompt: string;
  summary: string | null;
  status: string;
  backtest: BacktestSnapshot | null;
  spec?: {
    timeframe?: string;
    exit?: { stop_pct?: number; take_profit_pct?: number };
    sizing?: { risk_pct_equity?: number; max_notional_usdc?: number };
  } | null;
};

type Signal = {
  id: string;
  symbol: string;
  side: string;
  confidence: number;
  notional_usdc: number;
  source: string;
  status: string;
  rationale: string | null;
  created_at: string;
};

type Whale = {
  id: string;
  label: string;
  address: string;
  follow: boolean;
  tags: string[];
};

type WhaleEvent = {
  id: string;
  summary: string | null;
  amount: number;
  asset: string;
  direction: string;
  created_at: string;
  tx_hash: string | null;
};

const TOUR_STOPS = [
  {
    target: "[data-tour='trading-market']",
    title: "Quant Desk",
    body: "Live mid, Paper/Live mode, and Disarm — understand the market in seconds.",
  },
  {
    target: "[data-tour='trading-checklist']",
    title: "Get ready",
    body: "Backtest → Trade session key → Fund & arm. Live fills are on-chain Base swaps.",
  },
];

function TradingPage() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const { data: handle } = useMyHandle();
  const { data: wallet } = useSmartWallet(handle?.id);
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
  });
  const { data: whales = [] } = useCompanyTable<Whale>("smart_money_wallets", {
    orderBy: "label",
  });
  const { data: whaleEvents = [] } = useCompanyTable<WhaleEvent>("smart_money_events", {
    orderBy: "created_at",
    ascending: false,
    limit: 20,
  });
  const { data: treasury } = useQuery({
    queryKey: ["treasury"],
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
    if (company?.max_risk_pct != null) setRiskPct(clampFounderRiskPct(Number(company.max_risk_pct)));
  }, [company?.max_notional_usdc_day, company?.max_risk_pct]);

  const pop = (label: string, amount: number, quest: string) => {
    if (doneQuests.has(quest)) return;
    const boost = 1 + (perksQ.data?.questXpBoostPct ?? 0) / 100;
    const xp = Math.round(amount * boost);
    setBurst((n) => n + 1);
    setToastXp({ label, amount: xp });
    setTimeout(() => setToastXp(null), 2400);
    award.mutate({ amount: xp, quest });
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

  const onPreset = async (presetId: string) => {
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
      scrollToLab({ highlight: true });
      await invalidateTrading();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply preset");
    } finally {
      setBusy(null);
    }
  };

  const onIssueKey = async () => {
    if (!company) return;
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
      toast.success("Trade session key issued. You can revoke it anytime on Wallet.");
      await invalidateTrading();
      void qc.invalidateQueries({ queryKey: ["session-keys"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue session key");
    } finally {
      setIssuingKey(false);
    }
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
    setBusy("arm");
    try {
      await setTradingDeskArmed({ data: { companyId: company.id, armed: next } });
      if (next) {
        if (readiness?.funded) pop("Wallet funded", 80, "trading:fund");
        pop("Desk armed", 120, "trading:arm");
      }
      toast.success(next ? "Desk armed — Quant can trade inside caps." : "Desk disarmed.");
      await invalidateTrading();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update arm state");
    } finally {
      setBusy(null);
    }
  };

  const onPaperMode = async (paper: boolean) => {
    if (!company) return;
    setBusy("paper");
    try {
      await setTradingPaperMode({ data: { companyId: company.id, paper } });
      toast.success(
        paper
          ? "Paper mode on — mark fills only, excluded from arena."
          : "Live mode — real Base swaps when armed.",
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

  return (
    <div className="space-y-6">
      <Celebrate trigger={burst} />
      <XpToast label={toastXp?.label ?? ""} amount={toastXp?.amount ?? 0} show={Boolean(toastXp)} />
      <SpotlightTour
        stops={TOUR_STOPS}
        storageKey="aura.trading.setup.tour.v4"
        ctaLabel="How Quant Desk works"
        replayLabel="Replay setup tips"
        autoOpen={onboarding}
      />

      <QuantDeskCockpit
        armed={armed}
        paper={paperMode}
        paperBusy={busy === "paper"}
        armBusy={busy === "arm"}
        canArm={Boolean(readiness?.canArm)}
        blockReason={readiness?.blockReason ?? null}
        dailyLimit={Number(company?.max_notional_usdc_day ?? riskDay)}
        dailyUsed={dailyUsed}
        usdcBalance={Number(treasury?.usdc ?? readiness?.usdc ?? 0)}
        maxRiskPct={effectiveSpotRiskPct(Number(company?.max_risk_pct ?? riskPct))}
        openTrades={open}
        closedTrades={closed}
        activeStrategy={activeStrategy}
        hasApprovedStrategy={Boolean(readiness?.hasApprovedStrategy)}
        pendingSignals={pendingSignals.length}
        whaleEvents={whaleEvents}
        onPaperMode={(p) => void onPaperMode(p)}
        onArm={(next) => void onArm(next)}
        onOpenDrawer={setDrawer}
      />

      <DeskChainSwitcher
        className="px-1"
        invalidateKeys={[["trading-readiness"], ["trading-arena"]]}
      />

      {company?.id ? <YieldDeskPanel companyId={company.id} /> : null}

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
            onClick={() => void onIssueKey()}
            className="shrink-0 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {issuingKey ? "Issuing…" : "Issue Trade key"}
          </button>
        </div>
      ) : null}

      {showSetup ? (
        <TradingSetup
          readiness={readiness}
          onIssueKey={() => void onIssueKey()}
          issuingKey={issuingKey}
          onStartSteadyEth={() => void onPreset("steady_eth")}
          steadyBusy={busy === "steady_eth"}
          onArm={() => void onArm(true)}
          armBusy={busy === "arm"}
          onEnablePaper={() => void onPaperMode(true)}
          paperBusy={busy === "paper"}
          onReviewBacktest={openBacktestReview}
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
                onChange={(e) => setRiskDay(Number(e.target.value))}
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
                onChange={(e) => setRiskPct(Number(e.target.value))}
                className="mt-1 w-full rounded-xl bg-foreground/6 px-3 py-2 text-sm outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void onSaveRisk()}
              className="self-end rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary"
            >
              Save caps
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 text-[12px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>
              Base hard USDC cap: <span className="text-foreground">2% of wallet equity per idea</span>{" "}
              (industry spot band 1–3%). Founder setting max 3%. Caps and Disarm are the kill switch —
              Quant cannot exceed daily notional or the hard equity ceiling.
            </span>
          </div>
        </Panel>
      ) : null}

      <DeskDrawerShell
        open={drawer === "backtest"}
        onOpenChange={(o) => setDrawer(o ? "backtest" : null)}
        title="Backtest Lab"
        description="Replay rules on candle history. Advanced stats stay in the lab — not on the main desk."
      >
        {company?.id ? (
          <BacktestLab
            companyId={company.id}
            strategies={strategies}
            highlight={labHighlight}
            externalResult={labExternal}
            onExternalResultConsumed={() => setLabExternal(null)}
            onApproveStrategy={(id) => void onApprove(id)}
            approveBusy={busy?.startsWith("ap-") ?? false}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Create a company first.</p>
        )}
      </DeskDrawerShell>

      <DeskDrawerShell
        open={drawer === "strategies"}
        onOpenChange={(o) => setDrawer(o ? "strategies" : null)}
        title="Strategies"
        description="Presets and natural-language drafts. Nothing deploys until you backtest and approve."
      >
        <div className="space-y-5">
          <PresetsPanel busyId={busy} onApply={(id) => void onPreset(id)} compact />
          <Panel label="Describe your own">
            <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
              Plain English is enough — Quant drafts a structured plan, then you backtest.
            </p>
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Trade ETH when momentum breaks above resistance, risk max 1%, take profit at 4%…"
                className="min-h-[88px] flex-1 resize-none rounded-2xl bg-foreground/6 px-4 py-3 text-[14px] outline-none placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                disabled={busy === "create" || !prompt.trim() || !company}
                onClick={() => void onCreate()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary/16 px-5 py-3 text-xs font-semibold text-primary disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {busy === "create" ? "Drafting…" : "Draft strategy"}
              </button>
            </div>
          </Panel>
          <div className="space-y-3">
            {strategies.map((s) => (
              <Panel key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{s.summary}</p>
                  </div>
                  <Chip
                    tone={
                      s.status === "approved"
                        ? "gold"
                        : s.status === "backtested"
                          ? "primary"
                          : "neutral"
                    }
                  >
                    {s.status}
                  </Chip>
                </div>
                {s.backtest?.equity?.length ? (
                  <div className="mt-4">
                    <div className="h-12">
                      <Spark points={s.backtest.equity} tone="gold" />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="num text-sm font-semibold text-gold">
                          {s.backtest.total_return_pct ?? 0}%
                        </p>
                        <p className="text-[10px] uppercase text-muted-foreground">Return</p>
                      </div>
                      <div>
                        <p className="num text-sm font-semibold">{s.backtest.win_rate ?? 0}%</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Win</p>
                      </div>
                      <div>
                        <p className="num text-sm font-semibold">
                          {s.backtest.max_drawdown_pct ?? 0}%
                        </p>
                        <p className="text-[10px] uppercase text-muted-foreground">Max DD</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === `bt-${s.id}`}
                    onClick={() => void onBacktest(s.id)}
                    className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {busy === `bt-${s.id}` ? "Backtesting…" : "Run backtest"}
                  </button>
                  {(s.status === "backtested" || s.status === "draft") && s.backtest ? (
                    <button
                      type="button"
                      disabled={busy === `ap-${s.id}`}
                      onClick={() => void onApprove(s.id)}
                      className="rounded-xl bg-gold/16 px-3 py-1.5 text-[11px] font-semibold text-gold"
                    >
                      Approve
                    </button>
                  ) : null}
                </div>
              </Panel>
            ))}
          </div>
        </div>
      </DeskDrawerShell>

      <DeskDrawerShell
        open={drawer === "history"}
        onOpenChange={(o) => setDrawer(o ? "history" : null)}
        title="History & advanced"
        description="Full book, signals, whales, arena — kept off the main cockpit."
      >
        <div className="space-y-5">
          <Panel label="Live book">
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Realized</p>
                <p className="num text-lg font-semibold text-gold">
                  <Counter value={realized} format={(n) => currency(n)} />
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Open PnL</p>
                <p className="num text-lg font-semibold">
                  <Counter value={openPnl} format={(n) => currency(n)} />
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Open</p>
                <p className="num text-lg font-semibold">{open.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Closed</p>
                <p className="num text-lg font-semibold">{closed.length}</p>
              </div>
            </div>
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fills yet.</p>
            ) : (
              <div className="space-y-3">
                {trades.slice(0, 20).map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 border-b border-border/40 pb-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">
                        {t.side} {t.symbol} · {currency(t.size)}
                        {t.paper ? " · paper" : ""}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Entry {currency(t.entry, 2)}
                        {t.status === "open" && t.mark_price != null
                          ? ` · mark ${currency(Number(t.mark_price), 2)}`
                          : t.exit != null
                            ? ` · exit ${currency(Number(t.exit), 2)}`
                            : ""}
                      </p>
                      {t.tx_hash ? (
                        <a
                          href={`${explorer}${t.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary"
                        >
                          View on explorer <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <Chip tone={t.status === "open" ? "primary" : "neutral"}>{t.status}</Chip>
                      <p className="num mt-2 text-[12px] text-gold">{currency(t.pnl)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Panel>

          <Panel label="Signals">
            {pendingSignals.length === 0 && liveSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No signals yet.</p>
            ) : (
              <div className="space-y-3">
                {[...pendingSignals, ...liveSignals].slice(0, 12).map((s) => (
                  <div key={s.id} className="rounded-2xl bg-foreground/4 p-3">
                    <div className="flex items-center gap-2">
                      <Chip tone={s.side === "long" ? "gold" : "neutral"}>{s.side}</Chip>
                      <span className="text-[12px] font-medium">{s.symbol}</span>
                      <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                        {s.status} · {s.source}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] text-muted-foreground">{s.rationale}</p>
                    {s.status === "pending" && company ? (
                      <span className="mt-2 flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg bg-primary/14 px-2 py-1 text-[11px] text-primary"
                          onClick={() =>
                            void approveTradingSignal({
                              data: { companyId: company.id, signalId: s.id },
                            }).then(invalidateTrading)
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-foreground/8 px-2 py-1 text-[11px]"
                          onClick={() =>
                            void rejectTradingSignal({
                              data: { companyId: company.id, signalId: s.id },
                            }).then(invalidateTrading)
                          }
                        >
                          Reject
                        </button>
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel label="Smart money">
            <div className="space-y-3">
              {whales.map((w) => (
                <div key={w.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{w.label}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{w.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!company) return;
                      void followSmartMoneyWallet({
                        data: { companyId: company.id, walletId: w.id, follow: !w.follow },
                      })
                        .then(() => invalidateTrading())
                        .catch((e) =>
                          toast.error(e instanceof Error ? e.message : "Follow failed"),
                        );
                    }}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-[11px] font-semibold",
                      w.follow ? "bg-primary/16 text-primary" : "bg-foreground/8",
                    )}
                  >
                    {w.follow ? "Following" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="Whale feed">
            {whaleEvents.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No large transfers yet.</p>
            ) : (
              <div className="space-y-3">
                {whaleEvents.map((e) => (
                  <div key={e.id} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] leading-snug">{e.summary}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(e.created_at)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!company) return;
                        void mirrorSmartMoneyEvent({
                          data: { companyId: company.id, eventId: e.id },
                        })
                          .then(() => {
                            toast.success("Mirror signal queued for approval");
                            return invalidateTrading();
                          })
                          .catch((err) =>
                            toast.error(err instanceof Error ? err.message : "Mirror failed"),
                          );
                      }}
                      className="rounded-xl bg-gold/14 px-2.5 py-1 text-[10px] font-semibold text-gold"
                    >
                      Mirror
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {readiness?.hasTradeKey ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <ArenaBoard
                season={arenaQ.data?.season ?? null}
                entries={arenaQ.data?.entries ?? []}
                you={arenaQ.data?.you ?? null}
              />
              <HolderAdvantages perks={perksQ.data} />
            </div>
          ) : null}

          <Panel label="Founder trail">
            <QuestTrail quests={TRADING_QUESTS} completed={doneQuests} />
          </Panel>
        </div>
      </DeskDrawerShell>
    </div>
  );
}
