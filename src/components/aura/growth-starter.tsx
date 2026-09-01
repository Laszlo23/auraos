import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ExternalLink, Sparkles } from "lucide-react";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { Panel } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { useAwardXp, useProgress } from "@/hooks/use-progress";
import { useSignupGrowth } from "@/hooks/use-signup-growth";
import { GROWTH_STARTER_QUESTS } from "@/lib/gamify";
import { SOCIAL_LINKS } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

const X_LINK = SOCIAL_LINKS.find((s) => s.id === "x");
const DISCORD_LINK = SOCIAL_LINKS.find((s) => s.id === "discord");

type SharedProps = {
  customers?: number;
};

type CompanyProps = SharedProps & {
  hasMission?: boolean;
};

type AwardFn = (label: string, amount: number, quest: string) => void;

function GrowthStarterBody({
  completed,
  onAward,
  onCelebrate,
  variant,
  hasMission = false,
}: {
  completed: Set<string>;
  onAward: AwardFn;
  onCelebrate: (label: string, amount: number) => void;
  variant: "company" | "signup";
  hasMission?: boolean;
}) {
  const { t } = useLocale();
  const [goalDraft, setGoalDraft] = useState("");
  const [goalBusy, setGoalBusy] = useState(false);
  const signup = useSignupGrowth({ enabled: variant === "signup" });
  const missionAwarded = useRef(false);

  useEffect(() => {
    if (variant !== "company" || !hasMission || missionAwarded.current) return;
    if (completed.has("growth:first-mission")) return;
    missionAwarded.current = true;
    onAward(t("growth.rewardMission"), GROWTH_STARTER_QUESTS[2]!.xp, "growth:first-mission");
  }, [completed, hasMission, onAward, t, variant]);

  const doneCount = GROWTH_STARTER_QUESTS.filter((q) => completed.has(q.key)).length;
  const active = GROWTH_STARTER_QUESTS.find((q) => !completed.has(q.key));
  if (!active) return null;

  const activeIndex = GROWTH_STARTER_QUESTS.indexOf(active);

  const openSocial = (id: "x" | "discord") => {
    const link = id === "x" ? X_LINK : DISCORD_LINK;
    if (!link) return;
    trackTeaser("social_join", { placement: `${id}:growth-starter` });
    window.open(link.href, "_blank", "noopener,noreferrer");
  };

  const submitGoal = async () => {
    const trimmed = goalDraft.trim();
    if (trimmed.length < 4 || goalBusy) return;
    setGoalBusy(true);
    try {
      const result = await signup.saveGoal.mutateAsync(trimmed);
      if ((result.awarded ?? 0) > 0) {
        onCelebrate(t("growth.rewardMission"), result.awarded ?? GROWTH_STARTER_QUESTS[2]!.xp);
      }
    } finally {
      setGoalBusy(false);
    }
  };

  return (
    <Panel label={t("growth.panelLabel")} glow variant="gold">
      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="label-luxury-gold">{t("growth.eyebrow")}</p>
            <h2 className="mt-2 display-editorial text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              {t("growth.title")}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {t("growth.body")}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-foreground/[0.05] px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="num text-sm font-semibold">
              {doneCount}/{GROWTH_STARTER_QUESTS.length}
            </span>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {GROWTH_STARTER_QUESTS.map((q, i) => (
            <div
              key={q.key}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-500",
                completed.has(q.key)
                  ? "bg-primary"
                  : i === activeIndex
                    ? "bg-primary/35"
                    : "bg-foreground/10",
              )}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {GROWTH_STARTER_QUESTS.map((q, i) => {
            const done = completed.has(q.key);
            const isActive = q.key === active.key;
            return (
              <div
                key={q.key}
                className={cn(
                  "rounded-2xl border p-4 transition-all duration-300",
                  done
                    ? "border-primary/20 bg-primary/5 opacity-80"
                    : isActive
                      ? "border-primary/35 bg-primary/10 shadow-[var(--shadow-glow)]"
                      : "border-border/40 bg-foreground/[0.03] opacity-60",
                )}
              >
                <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {done ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <span className="num">{i + 1}</span>
                  )}
                  {t("growth.step")} {i + 1}
                </span>
                <p className={cn("mt-2 text-sm font-medium", done && "line-through opacity-70")}>
                  {q.label}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">{q.hint}</p>
                <p className="num mt-2 text-[11px] font-semibold text-primary">+{q.xp} XP</p>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 rounded-2xl border border-primary/25 bg-primary/8 p-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
              {t("growth.nextUp")}
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight">{active.label}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{active.hint}</p>

            {active.key === "growth:follow-x" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openSocial("x")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-foreground/6 px-4 py-2.5 text-xs font-semibold hover:bg-foreground/10"
                >
                  {t("growth.openX")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAward(
                      t("growth.rewardFollow"),
                      GROWTH_STARTER_QUESTS[0]!.xp,
                      "growth:follow-x",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
                >
                  {t("growth.confirmDone")}
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            {active.key === "growth:join-discord" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openSocial("discord")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-foreground/6 px-4 py-2.5 text-xs font-semibold hover:bg-foreground/10"
                >
                  {t("growth.openDiscord")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAward(
                      t("growth.rewardDiscord"),
                      GROWTH_STARTER_QUESTS[1]!.xp,
                      "growth:join-discord",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
                >
                  {t("growth.confirmDone")}
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            {active.key === "growth:first-mission" && variant === "company" ? (
              <Link
                to="/missions"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                {t("growth.createMission")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}

            {active.key === "growth:first-mission" && variant === "signup" ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitGoal();
                }}
              >
                <input
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  placeholder={t("growth.goalPlaceholder")}
                  className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={goalDraft.trim().length < 4 || goalBusy}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {goalBusy ? t("common.loading") : t("growth.saveGoal")}
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </Panel>
  );
}

function GrowthStarterShell({
  completed,
  onAward,
  variant,
  hasMission,
  customers = 0,
}: {
  completed: Set<string>;
  onAward: AwardFn;
  variant: "company" | "signup";
  hasMission?: boolean;
  customers?: number;
}) {
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<{ label: string; amount: number } | null>(null);

  const awardWithFx = useCallback(
    (label: string, amount: number, quest: string) => {
      if (completed.has(quest)) return;
      setBurst((n) => n + 1);
      setToast({ label, amount });
      window.setTimeout(() => setToast(null), 2600);
      onAward(label, amount, quest);
    },
    [completed, onAward],
  );

  const celebrateOnly = useCallback((label: string, amount: number) => {
    setBurst((n) => n + 1);
    setToast({ label, amount });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const doneCount = GROWTH_STARTER_QUESTS.filter((q) => completed.has(q.key)).length;
  if (customers > 0 || doneCount >= GROWTH_STARTER_QUESTS.length) return null;

  return (
    <>
      <Celebrate trigger={burst} />
      <XpToast label={toast?.label ?? ""} amount={toast?.amount ?? 0} show={Boolean(toast)} />
      <GrowthStarterBody
        completed={completed}
        onAward={awardWithFx}
        onCelebrate={celebrateOnly}
        variant={variant}
        hasMission={hasMission}
      />
    </>
  );
}

function GrowthStarterCompany({ hasMission = false, customers = 0 }: CompanyProps) {
  const { data: progress } = useProgress();
  const award = useAwardXp();
  const completed = new Set(progress?.completed_quests ?? []);

  const onAward = useCallback(
    (_label: string, amount: number, quest: string) => {
      award.mutate({ amount, quest });
    },
    [award],
  );

  return (
    <GrowthStarterShell
      completed={completed}
      onAward={onAward}
      variant="company"
      hasMission={hasMission}
      customers={customers}
    />
  );
}

function GrowthStarterSignup({ customers = 0 }: SharedProps) {
  const signup = useSignupGrowth({ enabled: true });
  const completed = new Set(signup.data?.quests ?? []);

  const onAward = useCallback(
    (_label: string, amount: number, quest: string) => {
      signup.award.mutate({ quest, amount });
    },
    [signup.award],
  );

  return (
    <GrowthStarterShell
      completed={completed}
      onAward={onAward}
      variant="signup"
      customers={customers}
    />
  );
}

export function GrowthStarterTrack({
  variant,
  hasMission = false,
  customers = 0,
}: CompanyProps & { variant: "company" | "signup" }) {
  if (variant === "signup") {
    return <GrowthStarterSignup customers={customers} />;
  }
  return <GrowthStarterCompany hasMission={hasMission} customers={customers} />;
}
