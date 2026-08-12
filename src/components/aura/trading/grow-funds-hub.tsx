import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Droplets, LineChart, Settings2, Sparkles, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { Chip, PageHeader, Panel } from "@/components/aura/primitives";
import { SimpleLiquidityPath } from "@/components/aura/trading/simple-liquidity-path";
import {
  SimpleTradePath,
  type SimpleTradePresetId,
} from "@/components/aura/trading/simple-trade-path";
import type { DeskReadiness } from "@/components/aura/trading/start-checklist";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type GrowPath = "trade" | "liquidity" | null;

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
  issuingKey,
  armBusy,
  paperBusy,
  onPickStrategy,
  onIssueKey,
  onStartTrade,
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
  issuingKey?: boolean | undefined;
  armBusy?: boolean | undefined;
  paperBusy?: boolean | undefined;
  onPickStrategy: (presetId: SimpleTradePresetId) => void;
  onIssueKey: () => void;
  onStartTrade: () => void;
  onPracticeTrade: () => void;
  onRealMoneyTrade: () => void;
  childrenAdvanced?: ReactNode;
}) {
  const totalWorking = tradeWorkingUsdc + liquidityWorkingUsdc;
  const totalResult = tradeResultUsdc + liquidityResultUsdc;
  const needsFund = availableUsdc < 1 && totalWorking < 1;
  const tradeLive = tradeWorkingUsdc > 0 || Boolean(readiness?.armed);
  const liquidityLive = liquidityWorkingUsdc > 0;

  const nextStep = (() => {
    if (needsFund) {
      return {
        title: "First: add USDC",
        body: "Deposit USDC (or ETH and convert) on Wallet, then pick a path below.",
        cta: { label: "Open Wallet", to: "/wallet" as const },
      };
    }
    if (!path) {
      return {
        title: "Pick how you want money to grow",
        body:
          tradeLive || liquidityLive
            ? "You already have capital working — open a path to manage it, or start the other one."
            : "Trade for upside with AI, or earn steadier interest / fees from liquidity.",
        cta: null,
      };
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Capital"
        title="Grow your money"
        description="Two ways to put USDC to work. Pick one path — Aura handles the rest inside your caps."
        actions={
          <button
            type="button"
            onClick={() => onAdvanced(!advanced)}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-[12px] font-semibold transition-colors",
              advanced
                ? "bg-foreground/10 text-foreground"
                : "bg-foreground/6 text-muted-foreground hover:text-foreground",
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {advanced ? "Simple view" : "Advanced"}
          </button>
        }
      />

      <Panel label="Your money" glow>
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          {totalWorking > 0 ? (
            <>
              <span className="font-semibold text-foreground">{currency(totalWorking, 2)}</span> is
              working right now (still yours — in Aave / pools / trades, not vanished)
              {totalResult !== 0 ? (
                <>
                  {" "}
                  · result so far{" "}
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
              . See the full map anytime on{" "}
              <Link
                to="/wallet"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Wallet → Grow
              </Link>
              .
            </>
          ) : (
            <>
              Free to deploy:{" "}
              <span className="font-mono font-semibold text-foreground">
                {currency(availableUsdc, 2)} USDC
              </span>
              . Put it into trading or liquidity below.
            </>
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Available", v: availableUsdc, hint: "Ready to deploy", hot: needsFund },
            {
              k: "In trading",
              v: tradeWorkingUsdc,
              hint: tradeLive ? "Strategy active" : "No open trades",
              hot: tradeLive,
            },
            {
              k: "In liquidity",
              v: liquidityWorkingUsdc,
              hint: liquidityLive ? "Earning now" : "No positions",
              hot: liquidityLive,
            },
            {
              k: "Result so far",
              v: totalResult,
              hint: totalWorking > 0 ? "Combined PnL / yield" : "Shows after money works",
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
                  s.k === "Result so far" && totalResult > 0 && "text-primary",
                  s.k === "Result so far" && totalResult < 0 && "text-destructive",
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
          <div className={cn("grid gap-4", path ? "md:grid-cols-1" : "md:grid-cols-2")}>
            {(!path || path === "trade") && (
              <PathCard
                active={path === "trade"}
                onClick={() => onPath(path === "trade" ? null : "trade")}
                icon={<LineChart className="h-6 w-6" />}
                title="Trade with AI"
                body="Aura opens and closes trades for you — or follows smart money. Growth = trade profit/loss."
                cta="Start trading"
                badge={tradeLive ? "Working" : availableUsdc >= 5 ? "Recommended" : null}
                compact={path === "trade"}
              />
            )}
            {(!path || path === "liquidity") && (
              <PathCard
                active={path === "liquidity"}
                onClick={() => onPath(path === "liquidity" ? null : "liquidity")}
                icon={<Droplets className="h-6 w-6" />}
                title="Provide liquidity"
                body="Park USDC in lending or pools. Growth = interest and trading fees over time."
                cta="Start earning"
                badge={liquidityLive ? "Working" : null}
                compact={path === "liquidity"}
              />
            )}
          </div>

          {path ? (
            <button
              type="button"
              onClick={() => onPath(null)}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
            >
              ← Choose a different path
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
                issuingKey={issuingKey}
                armBusy={armBusy}
                paperBusy={paperBusy}
                onPickStrategy={onPickStrategy}
                onIssueKey={onIssueKey}
                onStart={onStartTrade}
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
            <Panel label="Provide liquidity">
              <p className="text-[13px] text-muted-foreground">
                Finish onboarding to unlock this path.
              </p>
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
        "group rounded-[1.75rem] border text-left transition-colors",
        compact ? "flex items-center gap-4 p-4" : "p-6",
        active
          ? "border-primary/45 bg-primary/[0.09]"
          : "border-border/55 bg-foreground/[0.03] hover:border-border",
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
          {badge ? <Chip tone={badge === "Working" ? "primary" : "gold"}>{badge}</Chip> : null}
        </div>
        {!compact ? (
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
        ) : (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{body}</p>
        )}
        {!compact ? (
          <span className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary">
            {active ? "Selected — continue below" : cta}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : null}
      </div>
    </button>
  );
}
