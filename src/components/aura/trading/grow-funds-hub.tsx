import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Droplets, LineChart, Settings2, Timer, Wallet } from "lucide-react";
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
  const guideStep = needsFund ? 1 : !path ? 2 : 3;

  const setPath = (next: GrowPath) => {
    onPath(next);
    writeGrowPathQuery(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("moneyHub.eyebrow")}
        title={t("moneyHub.title")}
        description={t("moneyHub.description")}
        actions={
          <button
            type="button"
            onClick={() => onAdvanced(!advanced)}
            className={cn(
              "inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors",
              advanced ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {advanced ? t("moneyHub.simpleView") : t("moneyHub.proDesk")}
          </button>
        }
      />

      {!advanced ? <HowDeFiWorks step={guideStep} /> : null}

      <Panel label={t("moneyHub.statsLabel")} glow>
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          {totalWorking > 0 ? (
            <>
              {t("moneyHub.workingLead", { amount: currency(totalWorking, 2) })}{" "}
              {totalResult !== 0 ? (
                <span
                  className={cn(
                    "font-mono font-semibold",
                    totalResult > 0 ? "text-primary" : "text-destructive",
                  )}
                >
                  {totalResult > 0 ? "+" : ""}
                  {currency(totalResult, 2)}
                </span>
              ) : null}{" "}
              <Link
                to="/wallet"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {t("moneyHub.workingWallet")}
              </Link>
            </>
          ) : (
            t("moneyHub.readyLead", { amount: currency(availableUsdc, 2) })
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              k: t("moneyHub.statsReady"),
              v: availableUsdc,
              hint: needsFund ? t("moneyHub.statsReadyHintEmpty") : t("moneyHub.statsReadyHint"),
              hot: needsFund,
              kind: "ready" as const,
            },
            {
              k: t("moneyHub.statsWorking"),
              v: totalWorking,
              hint:
                tradeLive || liquidityLive
                  ? t("moneyHub.statsWorkingHintOn")
                  : t("moneyHub.statsWorkingHintOff"),
              hot: totalWorking > 0,
              kind: "working" as const,
            },
            {
              k: t("moneyHub.statsResult"),
              v: totalResult,
              hint:
                totalWorking > 0
                  ? t("moneyHub.statsResultHintOn")
                  : t("moneyHub.statsResultHintOff"),
              hot: totalResult !== 0,
              kind: "result" as const,
            },
          ].map((s) => (
            <div
              key={s.kind}
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
                  s.kind === "result" && totalResult > 0 && "text-primary",
                  s.kind === "result" && totalResult < 0 && "text-destructive",
                )}
              >
                {currency(s.v, 2)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.hint}</p>
            </div>
          ))}
        </div>
      </Panel>

      {!advanced && needsFund ? (
        <div className="flex flex-col gap-3 rounded-[1.5rem] border border-primary/30 bg-primary/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/16 text-primary">
              <Wallet className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("moneyHub.firstTitle")}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {t("moneyHub.firstBody")}
              </p>
            </div>
          </div>
          <Link
            to="/wallet"
            className="shrink-0 rounded-2xl bg-primary px-4 py-2.5 text-center text-xs font-semibold text-primary-foreground"
          >
            {t("moneyHub.firstCta")}
          </Link>
        </div>
      ) : null}

      {!advanced ? (
        <>
          {!path ? (
            <div>
              <p className="text-sm font-semibold text-foreground">{t("moneyHub.pickTitle")}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {tradeLive || liquidityLive ? t("moneyHub.pickBodyLive") : t("moneyHub.pickBody")}
              </p>
            </div>
          ) : null}

          <div className={cn("grid gap-4", path ? "md:grid-cols-1" : "md:grid-cols-3")}>
            {(!path || path === "trade") && (
              <PathCard
                active={path === "trade"}
                onClick={() => setPath(path === "trade" ? null : "trade")}
                icon={<LineChart className="h-6 w-6" />}
                title={t("moneyHub.pathTrade")}
                body={t("moneyHub.pathTradeBody")}
                risk={t("moneyHub.pathTradeRisk")}
                cta={t("moneyHub.pathTradeCta")}
                badge={
                  tradeLive
                    ? t("moneyHub.pathOn")
                    : availableUsdc >= 5
                      ? t("moneyHub.pathPopular")
                      : null
                }
                badgeTone={tradeLive ? "primary" : "gold"}
                compact={path === "trade"}
                continueLabel={t("moneyHub.continue")}
              />
            )}
            {(!path || path === "liquidity") && (
              <PathCard
                active={path === "liquidity"}
                onClick={() => setPath(path === "liquidity" ? null : "liquidity")}
                icon={<Droplets className="h-6 w-6" />}
                title={t("moneyHub.pathEarn")}
                body={t("moneyHub.pathEarnBody")}
                risk={t("moneyHub.pathEarnRisk")}
                cta={t("moneyHub.pathEarnCta")}
                badge={liquidityLive ? t("moneyHub.pathOn") : null}
                badgeTone="primary"
                compact={path === "liquidity"}
                continueLabel={t("moneyHub.continue")}
              />
            )}
            {(!path || path === "pulse") && (
              <PathCard
                active={path === "pulse"}
                onClick={() => setPath(path === "pulse" ? null : "pulse")}
                icon={<Timer className="h-6 w-6" />}
                title={t("moneyHub.pathPlay")}
                body={t("moneyHub.pathPlayBody")}
                risk={t("moneyHub.pathPlayRisk")}
                cta={t("moneyHub.pathPlayCta")}
                badge={t("moneyHub.pathPlayRisk")}
                badgeTone="gold"
                compact={path === "pulse"}
                continueLabel={t("moneyHub.continue")}
              />
            )}
          </div>

          {path ? (
            <button
              type="button"
              onClick={() => setPath(null)}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
            >
              {t("moneyHub.allPaths")}
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
            <Panel label={t("moneyHub.pathEarn")}>
              <p className="text-[13px] text-muted-foreground">{t("moneyHub.earnLocked")}</p>
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
            <Panel label={t("moneyHub.pathPlay")}>
              <p className="text-[13px] text-muted-foreground">{t("moneyHub.playLocked")}</p>
            </Panel>
          ) : null}
        </>
      ) : (
        childrenAdvanced
      )}
    </div>
  );
}

function HowDeFiWorks({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useLocale();
  const steps = [
    { n: 1 as const, title: t("moneyHub.step1"), body: t("moneyHub.step1Body") },
    { n: 2 as const, title: t("moneyHub.step2"), body: t("moneyHub.step2Body") },
    { n: 3 as const, title: t("moneyHub.step3"), body: t("moneyHub.step3Body") },
  ];

  return (
    <ol className="grid gap-2 sm:grid-cols-3" data-tour="defi-how">
      {steps.map((s) => {
        const hot = s.n === step;
        const done = s.n < step;
        return (
          <li
            key={s.n}
            className={cn(
              "rounded-2xl border px-4 py-3",
              hot
                ? "border-primary/40 bg-primary/[0.08]"
                : done
                  ? "border-border/35 bg-foreground/[0.02]"
                  : "border-border/40 bg-foreground/[0.03]",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em]",
                hot ? "text-primary" : "text-muted-foreground",
              )}
            >
              {String(s.n).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[13px] font-semibold tracking-tight">{s.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        );
      })}
    </ol>
  );
}

function PathCard({
  active,
  onClick,
  icon,
  title,
  body,
  risk,
  cta,
  badge,
  badgeTone = "gold",
  compact,
  continueLabel,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  body: string;
  risk: string;
  cta: string;
  badge?: string | null;
  badgeTone?: "primary" | "gold";
  compact?: boolean;
  continueLabel: string;
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
          {badge ? <Chip tone={badgeTone}>{badge}</Chip> : null}
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
          <>
            <p className="mt-2 text-[11px] font-medium text-foreground/70">{risk}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary">
              {active ? continueLabel : cta}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </>
        ) : null}
      </div>
    </button>
  );
}
