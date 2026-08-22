import { motion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { Spark } from "@/components/aura/spark";
import { QuestTrail } from "@/components/aura/quests";
import { ArenaBoard } from "@/components/aura/trading/arena-board";
import { BacktestLab } from "@/components/aura/trading/backtest-lab";
import type { BacktestSnapshot } from "@/components/aura/trading/backtest-results-dialog";
import { DeskDrawerShell, type DeskDrawerId } from "@/components/aura/trading/desk-drawers";
import { HolderAdvantages } from "@/components/aura/trading/holder-advantages";
import { PresetsPanel } from "@/components/aura/trading/presets-panel";
import { TRADING_QUESTS } from "@/lib/gamify";
import { currency, timeAgo } from "@/lib/format";
import type { HolderPerks } from "@/lib/trading/holder-perks";
import {
  approveTradingSignal,
  followSmartMoneyWallet,
  mirrorSmartMoneyEvent,
  rejectTradingSignal,
} from "@/lib/trading.functions";
import { cn } from "@/lib/utils";

import type {
  Signal,
  Strategy,
  Trade,
  Whale,
  WhaleEvent,
} from "@/components/aura/trading/trading-page-types";

export function TradingPageDrawers({
  drawer,
  onDrawer,
  companyId,
  strategies,
  trades,
  whales,
  whaleEvents,
  labHighlight,
  labExternal,
  onExternalResultConsumed,
  busy,
  prompt,
  onPrompt,
  realized,
  openPnl,
  openCount,
  closedCount,
  pendingSignals,
  liveSignals,
  explorer,
  arena,
  perks,
  doneQuests,
  hasTradeKey,
  onApproveStrategy,
  onBacktest,
  onCreate,
  onPreset,
  onInvalidate,
}: {
  drawer: DeskDrawerId;
  onDrawer: (id: DeskDrawerId) => void;
  companyId: string | null;
  strategies: Strategy[];
  trades: Trade[];
  whales: Whale[];
  whaleEvents: WhaleEvent[];
  labHighlight: boolean;
  labExternal: { strategyId: string; name: string; backtest: BacktestSnapshot } | null;
  onExternalResultConsumed: () => void;
  busy: string | null;
  prompt: string;
  onPrompt: (value: string) => void;
  realized: number;
  openPnl: number;
  openCount: number;
  closedCount: number;
  pendingSignals: Signal[];
  liveSignals: Signal[];
  explorer: string;
  arena:
    | {
        season?: {
          name: string;
          ends_at: string;
          prize_pool_aura: number;
        } | null;
        entries?: {
          rank: number | null;
          company_name: string | null;
          company_id: string;
          realized_pnl: number;
          trade_count: number;
          score: number;
          max_drawdown_pct: number;
          isYou: boolean;
        }[];
        you?: {
          rank: number | null;
          company_name: string | null;
          company_id: string;
          realized_pnl: number;
          trade_count: number;
          score: number;
          max_drawdown_pct: number;
          isYou: boolean;
        } | null;
      }
    | undefined;
  perks: HolderPerks | undefined;
  doneQuests: Set<string>;
  hasTradeKey: boolean;
  onApproveStrategy: (id: string) => void;
  onBacktest: (id: string) => void;
  onCreate: () => void;
  onPreset: (id: string) => void;
  onInvalidate: () => Promise<void>;
}) {
  return (
    <>
      <DeskDrawerShell
        open={drawer === "backtest"}
        onOpenChange={(o) => onDrawer(o ? "backtest" : null)}
        title="Backtest Lab"
        description="Replay rules on candle history. Advanced stats stay in the lab — not on the main desk."
      >
        {companyId ? (
          <BacktestLab
            companyId={companyId}
            strategies={strategies}
            highlight={labHighlight}
            externalResult={labExternal}
            onExternalResultConsumed={onExternalResultConsumed}
            onApproveStrategy={onApproveStrategy}
            approveBusy={busy?.startsWith("ap-") ?? false}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Create a company first.</p>
        )}
      </DeskDrawerShell>

      <DeskDrawerShell
        open={drawer === "strategies"}
        onOpenChange={(o) => onDrawer(o ? "strategies" : null)}
        title="Strategies"
        description="Presets and natural-language drafts. Nothing deploys until you backtest and approve."
      >
        <div className="space-y-5">
          <PresetsPanel busyId={busy} onApply={onPreset} compact />
          <Panel label="Describe your own">
            <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
              Plain English is enough — Quant drafts a structured plan, then you backtest.
            </p>
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                value={prompt}
                onChange={(e) => onPrompt(e.target.value)}
                rows={3}
                placeholder="Trade ETH when momentum breaks above resistance, risk max 1%, take profit at 4%…"
                className="min-h-[88px] flex-1 resize-none rounded-2xl bg-foreground/6 px-4 py-3 text-[14px] outline-none placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                disabled={busy === "create" || !prompt.trim() || !companyId}
                onClick={onCreate}
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
                    onClick={() => onBacktest(s.id)}
                    className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {busy === `bt-${s.id}` ? "Backtesting…" : "Run backtest"}
                  </button>
                  {(s.status === "backtested" || s.status === "draft") && s.backtest ? (
                    <button
                      type="button"
                      disabled={busy === `ap-${s.id}`}
                      onClick={() => onApproveStrategy(s.id)}
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
        onOpenChange={(o) => onDrawer(o ? "history" : null)}
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
                <p className="num text-lg font-semibold">{openCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Closed</p>
                <p className="num text-lg font-semibold">{closedCount}</p>
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
                    {s.status === "pending" && companyId ? (
                      <span className="mt-2 flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg bg-primary/14 px-2 py-1 text-[11px] text-primary"
                          onClick={() =>
                            void approveTradingSignal({
                              data: { companyId, signalId: s.id },
                            }).then(onInvalidate)
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-foreground/8 px-2 py-1 text-[11px]"
                          onClick={() =>
                            void rejectTradingSignal({
                              data: { companyId, signalId: s.id },
                            }).then(onInvalidate)
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
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {w.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!companyId) return;
                      void followSmartMoneyWallet({
                        data: { companyId, walletId: w.id, follow: !w.follow },
                      })
                        .then(() => onInvalidate())
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
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {timeAgo(e.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!companyId) return;
                        void mirrorSmartMoneyEvent({
                          data: { companyId, eventId: e.id },
                        })
                          .then(() => {
                            toast.success("Mirror signal queued for approval");
                            return onInvalidate();
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

          {hasTradeKey ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <ArenaBoard
                season={arena?.season ?? null}
                entries={arena?.entries ?? []}
                you={arena?.you ?? null}
              />
              <HolderAdvantages perks={perks} />
            </div>
          ) : null}

          <Panel label="Founder trail">
            <QuestTrail quests={TRADING_QUESTS} completed={doneQuests} />
          </Panel>
        </div>
      </DeskDrawerShell>
    </>
  );
}
