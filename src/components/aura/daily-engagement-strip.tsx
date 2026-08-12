import { Link } from "@tanstack/react-router";
import { Flame, Target, Sparkles, ArrowUpRight } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { DailyWheel } from "@/components/aura/wheel";
import { useTodaySpin } from "@/hooks/use-wheel";
import { COMPANY_QUESTS } from "@/lib/gamify";
import { cn } from "@/lib/utils";

type MissionPulse = {
  id: string;
  status: string;
  goal_text?: string | null;
  next_best_action?: {
    title?: string;
    status?: string;
  } | null;
};

type Props = {
  streakDays: number;
  mission: MissionPulse | null;
  completedQuests: string[];
  awaitingApproval: number;
  className?: string;
};

/**
 * Above-fold daily engagement: streak + wheel + mission CTA + one quest.
 */
export function DailyEngagementStrip({
  streakDays,
  mission,
  completedQuests,
  awaitingApproval,
  className,
}: Props) {
  const { data: todaySpin } = useTodaySpin();
  const done = new Set(completedQuests);
  const quest = COMPANY_QUESTS.find((q) => !done.has(q.key)) ?? null;

  const nba = mission?.next_best_action;
  const missionTitle =
    mission?.goal_text?.trim().slice(0, 72) || (mission ? "Active mission" : "No mission yet");
  const missionCta =
    awaitingApproval > 0
      ? { label: `Approve ${awaitingApproval} waiting`, to: "/tasks" as const }
      : nba?.title && nba.status === "pending_approval"
        ? { label: "Run next action", to: "/missions" as const }
        : mission?.status === "active"
          ? { label: "Open mission", to: "/missions" as const }
          : mission?.status === "planned"
            ? { label: "Start mission", to: "/missions" as const }
            : { label: "Plan a mission", to: "/missions" as const };

  return (
    <Panel label="Daily engagement" glow delay={0.01} {...(className ? { className } : {})}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2",
                streakDays > 0
                  ? "border-gold/40 bg-gold/10 text-gold"
                  : "border-border/50 text-muted-foreground",
              )}
            >
              <Flame className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                {streakDays > 0 ? `${streakDays}-day streak` : "Start a streak"}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground">
              {todaySpin
                ? `Today’s drop · ${todaySpin.label}`
                : "Spin once per day — XP + AURA reserve"}
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/40 px-3.5 py-3">
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Mission pulse
                </p>
                <p className="mt-1 text-[13px] text-foreground/90">{missionTitle}</p>
                {nba?.title ? (
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Next: {nba.title}
                    {nba.status === "pending_approval" ? " · needs you" : ""}
                  </p>
                ) : null}
                <Link
                  to={missionCta.to}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                >
                  {missionCta.label} <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {quest ? (
            <div className="rounded-2xl border border-border/40 px-3.5 py-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Quest of the day
                  </p>
                  <p className="mt-1 text-[13px] text-foreground/90">
                    {quest.glyph} {quest.label}
                    <span className="ml-2 text-[11px] text-muted-foreground">+{quest.xp} XP</span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{quest.hint}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">All company quests complete — nice.</p>
          )}
        </div>

        <div className="flex justify-center lg:justify-end">
          <DailyWheel />
        </div>
      </div>
    </Panel>
  );
}
