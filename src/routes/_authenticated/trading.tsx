import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowUpRight, Pause, Play, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, Chip, Pulse, DataRow } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { Spark } from "@/components/aura/spark";
import { QuestTrail } from "@/components/aura/quests";
import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { SpotlightTour } from "@/components/aura/spotlight-tour";
import { StartQuantChecklist } from "@/components/aura/trading/start-checklist";
import { PresetsPanel } from "@/components/aura/trading/presets-panel";
import { ArenaBoard } from "@/components/aura/trading/arena-board";
import { HolderAdvantages } from "@/components/aura/trading/holder-advantages";
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
  updateTradingRisk,
} from "@/lib/trading.functions";
import { currency, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trading")({
  head: () => ({
    meta: [
      { title: "Trading Desk — passive AI Quant | Aura OS" },
      {
        name: "description",
        content:
          "Set-and-forget AI trading on Base: presets, hard USDC caps, live PnL, and a weekly arena.",
      },
      { property: "og:title", content: "Trading Desk — AI agent that trades for you" },
      {
        property: "og:description",
        content: "Fund, pick a preset, arm Quant. Caps and Disarm keep you in control.",
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
};

type Strategy = {
  id: string;
  name: string;
  prompt: string;
  summary: string | null;
  status: string;
  backtest: {
    equity?: number[];
    win_rate?: number;
    max_drawdown_pct?: number;
    total_return_pct?: number;
    trade_count?: number;
    source?: string;
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
    target: "[data-tour='trading-checklist']",
    title: "Start here",
    body: "Fund the wallet, issue a Trade key, pick a preset, then arm. Five steps — no jargon required.",
  },
  {
    target: "[data-tour='trading-hero']",
    title: "Caps & kill switch",
    body: "Daily USDC limits and Disarm stop new risk. Quant cannot exceed your caps.",
  },
  {
    target: "[data-tour='trading-presets']",
    title: "Set & forget",
    body: "One tap drafts, backtests, and approves a safe strategy. Steady ETH is the gentlest start.",
  },
  {
    target: "[data-tour='trading-book']",
    title: "Live book",
    body: "Open and closed trades with real PnL. Competition only counts closed trades.",
  },
  {
    target: "[data-tour='trading-arena']",
    title: "Weekly Arena",
    body: "Risk-adjusted realized PnL leaderboard. Climb the board while Quant works.",
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
  });
  const { data: strategies = [] } = useCompanyTable<Strategy>("trading_strategies", {
    orderBy: "created_at",
    ascending: false,
  });
  const { data: signals = [] } = useCompanyTable<Signal>("trading_signals", {
    orderBy: "created_at",
    ascending: false,
    limit: 30,
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [riskDay, setRiskDay] = useState(250);
  const [riskPct, setRiskPct] = useState(0.5);
  const [issuingKey, setIssuingKey] = useState(false);

  const doneQuests = new Set(progress?.completed_quests ?? []);
  const armed = Boolean(company?.trading_armed);
  const approvedCount = strategies.filter((s) => s.status === "approved").length;
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
    if (company?.max_risk_pct != null) setRiskPct(Number(company.max_risk_pct));
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
  const realized = closed.reduce((s, t) => s + Number(t.pnl), 0);
  const openPnl = open.reduce((s, t) => s + Number(t.pnl), 0);
  const pendingSignals = signals.filter((s) => s.status === "pending");
  const liveSignals = signals.filter((s) => s.status === "approved" || s.status === "executed");

  const liveEquity = useMemo(() => {
    // Cumulative realized path + current open mark for a simple live curve
    const chron = [...closed].reverse();
    let eq = 0;
    const pts: number[] = [0];
    for (const t of chron) {
      eq += Number(t.pnl);
      pts.push(Number(eq.toFixed(2)));
    }
    if (openPnl !== 0) pts.push(Number((eq + openPnl).toFixed(2)));
    return pts.length > 1 ? pts : [];
  }, [closed, openPnl]);

  const equityFromBacktest =
    strategies.find((s) => s.backtest?.equity?.length)?.backtest?.equity ?? [];

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
      toast.success(
        `${res.name} ready — ${res.backtest.total_return_pct}% backtest return. Arm when funded.`,
      );
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
      await createStrategyFromPrompt({ data: { companyId: company.id, prompt } });
      setPrompt("");
      pop("Strategy drafted", 80, "trading:strategy");
      toast.success("Quant drafted a strategy — run a backtest next.");
      await invalidateTrading();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create strategy");
    } finally {
      setBusy(null);
    }
  };

  const onBacktest = async (strategyId: string) => {
    if (!company) return;
    setBusy(`bt-${strategyId}`);
    try {
      await runStrategyBacktest({ data: { companyId: company.id, strategyId } });
      pop("Backtest complete", 100, "trading:backtest");
      toast.success("Backtest finished with real candle history.");
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

  const onSaveRisk = async () => {
    if (!company) return;
    try {
      await updateTradingRisk({
        data: {
          companyId: company.id,
          max_notional_usdc_day: riskDay,
          max_risk_pct: riskPct,
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

  const statusLabel = armed
    ? "Running"
    : readiness?.canArm
      ? "Ready to arm"
      : readiness?.funded
        ? "Almost ready"
        : "Needs funding";

  const armDisabled =
    busy === "arm" || (!armed && readiness != null && !readiness.canArm);

  return (
    <div className="space-y-8">
      <Celebrate trigger={burst} />
      <XpToast label={toastXp?.label ?? ""} amount={toastXp?.amount ?? 0} show={Boolean(toastXp)} />
      <SpotlightTour
        stops={TOUR_STOPS}
        storageKey="aura.trading.tour.seen"
        ctaLabel="Tour the Trading Desk"
        replayLabel="Replay desk tour"
        autoOpen={!readiness?.armed}
      />

      <PageHeader
        eyebrow="Passive Quant · Base"
        title="Trading Desk"
        description="Fund once, pick a preset, arm Quant. Hard USDC caps, live PnL, and a weekly arena — built for founders who do not want to day-trade."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={armed ? "gold" : "neutral"}>
              <Pulse tone={armed ? "gold" : "muted"} /> {statusLabel}
            </Chip>
            <Chip tone="primary">{currency(treasury?.usdc ?? readiness?.usdc ?? 0)} USDC</Chip>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <StartQuantChecklist
          readiness={readiness}
          onIssueKey={() => void onIssueKey()}
          issuingKey={issuingKey}
        />

        <Panel label="Desk status" glow data-tour="trading-hero">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={armDisabled}
              onClick={() => void onArm(!armed)}
              title={!armed && readiness?.blockReason ? readiness.blockReason : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold disabled:opacity-45",
                armed ? "bg-foreground/10 text-muted-foreground" : "bg-gold/16 text-gold",
              )}
            >
              {armed ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {armed ? "Disarm" : "Arm desk"}
            </button>
            <Link
              to="/wallet"
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
            >
              Wallet & deposit <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {!armed && readiness?.blockReason && (
            <p className="mt-3 text-[12px] text-gold/90">{readiness.blockReason}</p>
          )}
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            Markets can lose money. Caps limit damage; Disarm stops new risk. Swaps settle on Base
            through your smart wallet — never invented fills.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <DataRow label="Approved strategies" value={approvedCount} tone="primary" />
            <DataRow label="Open positions" value={open.length} />
            <DataRow
              label="Realized PnL"
              value={currency(realized)}
              tone={realized >= 0 ? "gold" : "default"}
            />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
              Max risk % of desk capital per idea
              <input
                type="number"
                step="0.1"
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
          {(perksQ.data?.notionalBoostPct ?? 0) > 0 && (
            <p className="mt-3 text-[11px] text-gold">
              AURA tier adds +{perksQ.data!.notionalBoostPct}% to your effective daily notional.
            </p>
          )}
          <div className="mt-4 flex items-start gap-2 text-[12px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            Caps and Disarm are the kill switch. Quant cannot exceed daily notional.
          </div>
        </Panel>
      </div>

      <PresetsPanel busyId={busy} onApply={(id) => void onPreset(id)} />

      <div className="grid gap-5 lg:grid-cols-2">
        <ArenaBoard
          season={arenaQ.data?.season ?? null}
          entries={arenaQ.data?.entries ?? []}
          you={arenaQ.data?.you ?? null}
        />
        <HolderAdvantages perks={perksQ.data} />
      </div>

      <Panel label="Live book" data-tour="trading-book">
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
        {liveEquity.length > 0 ? (
          <div className="mb-4 h-14">
            <Spark points={liveEquity} tone="gold" />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Live realized equity path (closed trades + open mark)
            </p>
          </div>
        ) : equityFromBacktest.length > 0 ? (
          <div className="mb-4 h-14">
            <Spark points={equityFromBacktest} tone="primary" />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Strategy backtest equity — live wallet PnL appears after first fill
            </p>
          </div>
        ) : null}
        {trades.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No onchain fills yet. When Quant executes, entries and exits with PnL show here.
          </p>
        ) : (
          <div className="space-y-3">
            {trades.slice(0, 12).map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 border-b border-border/40 pb-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">
                    {t.side} {t.symbol} · {currency(t.size)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {t.rationale}
                  </p>
                  {t.tx_hash && (
                    <a
                      href={`${explorer}${t.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary"
                    >
                      View on explorer <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <Chip tone={t.status === "open" ? "primary" : "neutral"}>{t.status}</Chip>
                  <p className="num mt-2 text-[12px] text-gold">{currency(t.pnl)}</p>
                  {t.status === "open" && t.mark_price != null && (
                    <p className="text-[10px] text-muted-foreground">
                      mark {Number(t.mark_price).toFixed(0)}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Panel>

      <Panel label="Founder trail">
        <QuestTrail quests={TRADING_QUESTS} completed={doneQuests} />
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Advanced
        </h2>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-[11px] font-semibold text-primary"
        >
          {showAdvanced ? "Hide" : "Show custom prompt, whales, signals"}
        </button>
      </div>

      {showAdvanced && (
        <>
          <Panel label="Custom prompt">
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                placeholder="Describe a strategy in plain English…"
                className="min-h-[72px] flex-1 resize-none rounded-2xl bg-foreground/6 px-4 py-3 text-[14px] outline-none placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                disabled={busy === "create" || !prompt.trim()}
                onClick={() => void onCreate()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary/16 px-5 py-3 text-xs font-semibold text-primary disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {busy === "create" ? "Drafting…" : "Draft strategy"}
              </button>
            </div>
          </Panel>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Strategies
              </h2>
              {strategies.length === 0 ? (
                <Panel className="p-8 text-center text-sm text-muted-foreground">
                  No strategy yet — pick a preset above to start.
                </Panel>
              ) : (
                strategies.map((s) => (
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
                        className="rounded-xl bg-foreground/8 px-3 py-1.5 text-[11px] font-semibold"
                      >
                        {busy === `bt-${s.id}` ? "Backtesting…" : "Run backtest"}
                      </button>
                      {(s.status === "backtested" || s.status === "draft") && s.backtest && (
                        <button
                          type="button"
                          disabled={busy === `ap-${s.id}`}
                          onClick={() => void onApprove(s.id)}
                          className="rounded-xl bg-gold/16 px-3 py-1.5 text-[11px] font-semibold text-gold"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </Panel>
                ))
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Smart money
              </h2>
              <Panel className="p-5">
                <div className="space-y-3">
                  {whales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading watchlist…</p>
                  ) : (
                    whales.map((w) => (
                      <div key={w.id} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{w.label}</p>
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            {w.address}
                          </p>
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
                    ))
                  )}
                </div>
              </Panel>

              <Panel label="Whale feed">
                {whaleEvents.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    No large transfers yet. Follow wallets — Quant watches them for you.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {whaleEvents.map((e) => (
                      <div key={e.id} className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] leading-snug">{e.summary}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {timeAgo(e.created_at)}
                          </p>
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
            </div>
          </section>

          <Panel label="Signals">
            {pendingSignals.length === 0 && liveSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No signals yet — approve a strategy and arm the desk, or mirror smart money.
              </p>
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
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <span>{currency(s.notional_usdc)} notional</span>
                      {s.status === "pending" && company && (
                        <span className="ml-auto flex gap-1">
                          <button
                            type="button"
                            className="rounded-lg bg-primary/14 px-2 py-1 text-primary"
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
                            className="rounded-lg bg-foreground/8 px-2 py-1"
                            onClick={() =>
                              void rejectTradingSignal({
                                data: { companyId: company.id, signalId: s.id },
                              }).then(invalidateTrading)
                            }
                          >
                            Reject
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
