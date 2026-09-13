import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Droplets, LineChart, Settings2, Sparkles, Timer, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { Chip, PageHeader, Panel } from "@/components/aura/primitives";
import { SimpleLiquidityPath } from "@/components/aura/trading/simple-liquidity-path";
import {
  SimpleTradePath,
  type SimpleTradePresetId,
} from "@/components/aura/trading/simple-trade-path";
import { PulseUpDownPanel } from "@/components/aura/trading/pulse-up-down-panel";
import type { DeskReadiness } from "@/components/aura/trading/start-checklist";
import { useLocale } from "@/hooks/use-locale";
import { writeGrowPathQuery } from "@/lib/trading/simple-path";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type GrowPath = "trade" | "liquidity" | "pulse" | null;

export function GrowFundsHub({
  path,
  onPath,
  advanced,
  onAdvanced,
  availableUsdc,
  tradeWorkingUsdc,
  liquidityWorkingUsdc,
  tradeResultUsdc,
  liquidityResultUsdc,
  companyId,
  readiness,
  tradeBusyId,
  armBusy,
  paperBusy,
  onPickStrategy,
  onStartTrade,
  onStopTrade,
  onPracticeTrade,
  onRealMoneyTrade,
  childrenAdvanced,
}: {
  path: GrowPath;
  onPath: (p: GrowPath) => void;
  advanced: boolean;
  onAdvanced: (v: boolean) => void;
  availableUsdc: number;
  tradeWorkingUsdc: number;
  liquidityWorkingUsdc: number;
  tradeResultUsdc: number;
  liquidityResultUsdc: number;
  companyId: string | null;
  readiness: DeskReadiness | undefined;
  tradeBusyId: string | null;
  armBusy?: boolean | undefined;
  paperBusy?: boolean | undefined;
  onPickStrategy: (presetId: SimpleTradePresetId) => void;
  onStartTrade: () => void;
  onStopTrade: () => void;
  onPracticeTrade: () => void;
  onRealMoneyTrade: () => void;
  childrenAdvanced?: ReactNode;
}) {
  const { t } = useLocale();
  const totalWorking = tradeWorkingUsdc + liquidityWorkingUsdc;
  const totalResult = tradeResultUsdc + liquidityResultUsdc;
  const needsFund = availableUsdc < 1 && totalWorking < 1;
  const tradeLive = tradeWorkingUsdc > 0 || Boolean(readiness?.armed);
  const liquidityLive = liquidityWorkingUsdc > 0;

  const setPath = (next: GrowPath) => {
    onPath(next);
    writeGrowPathQuery(next);
  };

  const nextStep = (() => {
    if (needsFund) {
      return {
        title: t("moneyHub.firstTitle"),
        body: t("moneyHub.firstBody"),
        cta: { label: t("moneyHub.firstCta"), to: "/wallet" as const },
      };
    }
    if (!path) {
      return {
        title: "Pick one way to put money to work",
        body:
          tradeLive || liquidityLive
            ? "You already have money working — open a path to manage it."
            : "Let Aura trade, park cash to earn, or play a 3-minute ETH call.",
        cta: null,
      };
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title={t("moneyHub.title")}
        description={t("moneyHub.description")}
        actions={
          <button
            type="button"
            onClick={() => onAdvanced(!advanced)}
            className={cn(
              "inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors",
              advanced
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {advanced ? "Simple view" : "Pro desk"}
          </button>
        }
      />

      <Panel label="Your money" glow>
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          {totalWorking > 0 ? (
            <>
              <span className="font-semibold text-foreground">{currency(totalWorking, 2)}</span> is
              working (still yours — in a trade, loan, or pool)
              {totalResult !== 0 ? (
                <>
                  {" "}
                  · so far{" "}
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      totalResult > 0 ? "text-primary" : "text-destructive",
                    )}
                  >
                    {totalResult > 0 ? "+" : ""}
                    {currency(totalResult, 2)}
                  </span>
                </>
              ) : null}
              . Full map on{" "}
              <Link
                to="/wallet"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Wallet
              </Link>
              .
            </>
          ) : (
            <>
              Ready to use:{" "}
              <span className="font-mono font-semibold text-foreground">
                {currency(availableUsdc, 2)} USDC
              </span>
              .
            </>
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { k: "Ready", v: availableUsdc, hint: "In your wallet", hot: needsFund },
            {
              k: "Working",
              v: totalWorking,
              hint: tradeLive || liquidityLive ? "In a trade or earning" : "Nothing deployed yet",
              hot: totalWorking > 0,
            },
            {
              k: "Result",
              v: totalResult,
              hint: totalWorking > 0 ? "Profit, loss, or interest so far" : "Shows once money works",
              hot: totalResult !== 0,
            },
          ].map((s) => (
            <div
              key={s.k}
              className={cn(
                "rounded-2xl border px-4 py-3",
                s.hot
                  ? "border-primary/35 bg-primary/[0.07]"
                  : "border-border/40 bg-foreground/[0.03]",
              )}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{s.k}</p>
              <p
                className={cn(
                  "mt-1 font-mono text-[20px] font-semibold tabular-nums",
                  s.k === "Result" && totalResult > 0 && "text-primary",
                  s.k === "Result" && totalResult < 0 && "text-destructive",
                )}
              >
                {currency(s.v, 2)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.hint}</p>
            </div>
          ))}
        </div>
      </Panel>

      {!advanced && nextStep ? (
        <div className="flex flex-col gap-3 rounded-[1.5rem] border border-primary/30 bg-primary/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/16 text-primary">
              {needsFund ? <Wallet className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{nextStep.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {nextStep.body}
              </p>
            </div>
          </div>
          {nextStep.cta ? (
            <Link
              to={nextStep.cta.to}
              className="shrink-0 rounded-2xl bg-primary px-4 py-2.5 text-center text-xs font-semibold text-primary-foreground"
            >
              {nextStep.cta.label}
            </Link>
          ) : null}
        </div>
      ) : null}

      {!advanced ? (
        <>
          <div className={cn("grid gap-4", path ? "md:grid-cols-1" : "md:grid-cols-3")}>
            {(!path || path === "trade") && (
              <PathCard
                active={path === "trade"}
                onClick={() => setPath(path === "trade" ? null : "trade")}
                icon={<LineChart className="h-6 w-6" />}
                title="Let Aura trade"
                body="Aura buys and sells ETH for you. You can win or lose."
                cta="Start"
                badge={tradeLive ? "On" : availableUsdc >= 5 ? "Popular" : null}
                compact={path === "trade"}
              />
            )}
            {(!path || path === "liquidity") && (
              <PathCard
                active={path === "liquidity"}
                onClick={() => setPath(path === "liquidity" ? null : "liquidity")}
                icon={<Droplets className="h-6 w-6" />}
                title="Earn interest"
                body="Park USDC. You earn when others borrow or trade."
                cta="Start"
                badge={liquidityLive ? "On" : null}
                compact={path === "liquidity"}
              />
            )}
            {(!path || path === "pulse") && (
              <PathCard
                active={path === "pulse"}
                onClick={() => setPath(path === "pulse" ? null : "pulse")}
                icon={<Timer className="h-6 w-6" />}
                title="Play 3 minutes"
                body="Call ETH up or down. Demo money — a game, not a job."
                cta="Play"
                badge="Game"
                compact={path === "pulse"}
              />
            )}
          </div>

          {path ? (
            <button
              type="button"
              onClick={() => setPath(null)}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
            >
              ← All paths
            </button>
          ) : null}

          {path === "trade" ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <SimpleTradePath
                readiness={readiness}
                busyId={tradeBusyId}
                armBusy={armBusy}
                paperBusy={paperBusy}
                onPickStrategy={onPickStrategy}
                onStart={onStartTrade}
                onStop={onStopTrade}
                onPracticeMode={onPracticeTrade}
                onRealMoney={onRealMoneyTrade}
              />
            </motion.div>
          ) : null}

          {path === "liquidity" && companyId ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <SimpleLiquidityPath companyId={companyId} availableUsdc={availableUsdc} />
            </motion.div>
          ) : null}

          {path === "liquidity" && !companyId ? (
            <Panel label="Earn">
              <p className="text-[13px] text-muted-foreground">Finish setup to unlock this path.</p>
            </Panel>
          ) : null}

          {path === "pulse" && companyId ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PulseUpDownPanel companyId={companyId} />
            </motion.div>
          ) : null}

          {path === "pulse" && !companyId ? (
            <Panel label="Play">
              <p className="text-[13px] text-muted-foreground">Finish setup to unlock Pulse.</p>
            </Panel>
          ) : null}
        </>
      ) : (
        childrenAdvanced
      )}
    </div>
  );
}

function PathCard({
  active,
  onClick,
  icon,
  title,
  body,
  cta,
  badge,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  body: string;
  cta: string;
  badge?: string | null;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-[1.75rem] border text-left transition-all duration-300",
        compact ? "flex items-center gap-4 p-4" : "p-6",
        active
          ? "border-primary/50 bg-gradient-to-br from-primary/[0.14] to-gold/[0.04] shadow-[var(--shadow-glow)]"
          : "border-border/55 bg-foreground/[0.03] hover:-translate-y-1 hover:border-primary/30 hover:bg-foreground/[0.05]",
      )}
    >
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-2xl",
          compact ? "h-11 w-11" : "h-12 w-12",
          active ? "bg-primary/16 text-primary" : "bg-foreground/6 text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            className={cn("font-semibold tracking-tight", compact ? "text-base" : "mt-5 text-xl")}
          >
            {title}
          </h2>
          {badge ? <Chip tone={badge === "On" ? "primary" : "gold"}>{badge}</Chip> : null}
        </div>
        <p
          className={cn(
            "text-muted-foreground",
            compact ? "mt-0.5 text-[12px]" : "mt-2 text-[13px] leading-relaxed",
          )}
        >
          {body}
        </p>
        {!compact ? (
          <span className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary">
            {active ? "Continue below" : cta}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : null}
      </div>
    </button>
  );
}
