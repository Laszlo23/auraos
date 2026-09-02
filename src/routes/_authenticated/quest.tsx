import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Flame, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { DailyWheel } from "@/components/aura/wheel";
import { Chip, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { useReferralCode } from "@/hooks/use-earn";
import { useProgress } from "@/hooks/use-progress";
import {
  useAchievements,
  useJoinScout,
  useMergeSignupGrowth,
  useUserProgress,
  userLevelRail,
} from "@/hooks/use-user-progress";
import { useTodaySpin } from "@/hooks/use-wheel";
import { SITE_URL } from "@/lib/site";
import { DAILY_QUEST_KEYS, QUEST_REGISTRY, WEEKLY_QUEST_KEYS } from "@/lib/progress/registry";
import { REP_EARN_RULES } from "@/lib/progress/registry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quest")({
  head: () => ({
    meta: [
      { title: "AURA Quest — daily missions & achievements | Aura OS" },
      {
        name: "description",
        content:
          "Daily missions, weekly challenges, streaks, and contribution REP — one progression layer across OS, Local, and Nachbar.",
      },
      { property: "og:title", content: "AURA Quest" },
      {
        property: "og:description",
        content: "Complete quests, earn XP and REP, unlock badges — no tokenomics on day one.",
      },
    ],
  }),
  component: QuestHubPage,
});

function QuestHubPage() {
  const { data: userProg } = useUserProgress();
  const { data: companyProg } = useProgress();
  const { data: achievements } = useAchievements();
  const { data: todaySpin } = useTodaySpin();
  const joinScout = useJoinScout();
  const mergeGrowth = useMergeSignupGrowth();
  const { data: referralCode } = useReferralCode();
  const mergedOnce = useRef(false);

  useEffect(() => {
    if (mergedOnce.current || mergeGrowth.isPending || mergeGrowth.isSuccess) return;
    mergedOnce.current = true;
    void mergeGrowth.mutateAsync().catch(() => {
      /* RPC may be absent on older envs — Quest still works */
    });
  }, [mergeGrowth]);

  const completed = useMemo(
    () => new Set(userProg?.completed_quests ?? companyProg?.completed_quests ?? []),
    [userProg?.completed_quests, companyProg?.completed_quests],
  );

  const xp = userProg?.xp ?? companyProg?.xp ?? 0;
  const rep = userProg?.rep ?? 0;
  const streak = userProg?.streak_days ?? companyProg?.streak_days ?? 0;
  const rail = userLevelRail(xp);

  const dailyQuests = QUEST_REGISTRY.filter((q) => DAILY_QUEST_KEYS.includes(q.key));
  const weeklyQuests = QUEST_REGISTRY.filter((q) => WEEKLY_QUEST_KEYS.includes(q.key));
  const nextBadge =
    achievements?.definitions.find((d) => !achievements.unlocked.has(d.id)) ?? null;

  const scoutJoined = completed.has("scout:joined");
  const scoutLink = referralCode?.code
    ? `${SITE_URL}/lokal?ref=${encodeURIComponent(referralCode.code)}`
    : null;

  const copyScoutLink = async () => {
    if (!scoutLink) {
      toast.message("Join Scouts first — then your invite link appears here.");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        `Join Aura Local via my Scout link — when your seat pays, I earn REP for connecting you.\n${scoutLink}`,
      );
      toast.success("Scout invite copied");
    } catch {
      toast.error("Copy failed — select the link manually");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-6 pb-16">
      <PageHeader
        eyebrow="AURA Quest"
        title="Your world progress"
        lead="One XP bar, contribution REP, and badges — across OS, Local, and the city. No tokenomics required on day one."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel label="Level" glow delay={0}>
          <p className="text-3xl font-semibold tabular-nums">Lv {rail.level}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {rail.into} / {rail.needed} XP to next
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/40">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (rail.into / rail.needed) * 100)}%` }}
            />
          </div>
        </Panel>
        <Panel label="Contribution REP" delay={0.02}>
          <p className="text-3xl font-semibold tabular-nums text-gold">{rep}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Earned from verified check-ins, missions, and scout work — not the Local SaaS product.
          </p>
        </Panel>
        <Panel label="Streak" delay={0.04}>
          <div className="flex items-center gap-2">
            <Flame className={cn("h-5 w-5", streak > 0 ? "text-gold" : "text-muted-foreground")} />
            <p className="text-3xl font-semibold tabular-nums">{streak}</p>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">Days active in the world</p>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <Panel label="Daily" glow>
            <ul className="space-y-3">
              {dailyQuests.map((q) => {
                const done = completed.has(q.key) || (q.key === "company:spin" && Boolean(todaySpin));
                return (
                  <li
                    key={q.key}
                    className={cn(
                      "rounded-2xl border px-4 py-3",
                      done ? "border-primary/30 bg-primary/5" : "border-border/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-medium">
                          {q.glyph} {q.label}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">{q.hint}</p>
                      </div>
                      <Chip tone={done ? "gold" : "default"}>
                        +{q.xp} XP{q.rep ? ` · +${q.rep} REP` : ""}
                      </Chip>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-center">
              <DailyWheel />
            </div>
          </Panel>

          <Panel label="Weekly">
            <ul className="space-y-3">
              {weeklyQuests.map((q) => {
                const done = completed.has(q.key);
                return (
                  <li
                    key={q.key}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 px-4 py-3"
                  >
                    <div>
                      <p className="text-[13px] font-medium">
                        {q.glyph} {q.label}
                      </p>
                      <p className="text-[12px] text-muted-foreground">{q.hint}</p>
                    </div>
                    <Link
                      to="/nachbar/heute"
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                    >
                      {done ? "Done" : "Go"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel label="Scouts · Vienna">
            <p className="text-[13px] text-muted-foreground">
              Onboard verified local businesses. When their seat pays, you earn REP and the Connector
              badge.
            </p>
            {!scoutJoined ? (
              <button
                type="button"
                disabled={joinScout.isPending}
                onClick={() => void joinScout.mutateAsync()}
                className="mt-4 rounded-2xl bg-primary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
              >
                Join Scouts
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <Chip tone="gold">
                  <Pulse /> Scout active
                </Chip>
                {scoutLink ? (
                  <div className="rounded-2xl border border-border/50 bg-foreground/[0.03] px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Your Scout invite
                    </p>
                    <p className="mt-1 break-all font-mono text-[12px] text-foreground">{scoutLink}</p>
                    <button
                      type="button"
                      onClick={() => void copyScoutLink()}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary/14 px-3 py-2 text-[11px] font-semibold text-primary"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Scout link
                    </button>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Share with shops. Attribution lands when their Local seat pays.
                    </p>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    Minting your Scout invite… open Earn if the link does not appear.
                  </p>
                )}
              </div>
            )}
            <Link
              to="/leaderboard"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              Vienna standings <Trophy className="h-3 w-3" />
            </Link>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel label="Next badge">
            {nextBadge ? (
              <div>
                <p className="text-2xl">{nextBadge.glyph}</p>
                <p className="mt-2 text-[14px] font-semibold">{nextBadge.title}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">{nextBadge.description}</p>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">All badges unlocked — legend.</p>
            )}
          </Panel>

          <Panel label="Achievements">
            <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {(achievements?.definitions ?? []).map((d) => {
                const unlocked = achievements?.unlocked.has(d.id);
                return (
                  <li
                    key={d.id}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-[12px]",
                      unlocked ? "border-gold/30 bg-gold/5" : "border-border/40 opacity-60",
                    )}
                  >
                    <span className="mr-2">{d.glyph}</span>
                    {d.title}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel label="How REP works">
            <ul className="space-y-2">
              {REP_EARN_RULES.slice(0, 5).map((r) => (
                <li key={r.eventKey} className="text-[12px] text-muted-foreground">
                  <span className="text-foreground">+{r.rep}</span> {r.label}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
