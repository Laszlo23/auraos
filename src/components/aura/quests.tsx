import { motion } from "motion/react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type Quest = {
  key: string;
  label: string;
  hint: string;
  glyph: string;
  xp: number;
};

export const COMMUNITY_QUESTS: Quest[] = [
  {
    key: "community:follow-x",
    label: "Follow on X",
    hint: "Follow @bihary41418 — post the Quest + Squads ship",
    glyph: "⌁",
    xp: 80,
  },
  {
    key: "community:join-discord",
    label: "Join Discord",
    hint: "Enter the Ninty server — drop your squad invite",
    glyph: "◈",
    xp: 120,
  },
  {
    key: "community:join-telegram",
    label: "Join Telegram",
    hint: "Get launch updates — share a world-pulse win",
    glyph: "▲",
    xp: 120,
  },
  {
    key: "community:follow-farcaster",
    label: "Join on Farcaster",
    hint: "Join /auraos — cast your first quest badge",
    glyph: "◎",
    xp: 80,
  },
  {
    key: "community:open-quest",
    label: "Open Quest hub",
    hint: "Hit /quest — claim daily spin + next badge",
    glyph: "🎮",
    xp: 60,
  },
  {
    key: "squad:created",
    label: "Found a squad",
    hint: "Start a 2–8 crew on Community",
    glyph: "👥",
    xp: 100,
  },
  {
    key: "squad:joined",
    label: "Join a squad",
    hint: "Enter a 6-char invite — work with someone",
    glyph: "🤝",
    xp: 80,
  },
  {
    key: "squad:task",
    label: "Close a shared task",
    hint: "Finish a squad task so the board moves",
    glyph: "⚡",
    xp: 40,
  },
  {
    key: "community:first-post",
    label: "World pulse",
    hint: "Post to your squad with share-to-world on",
    glyph: "✍",
    xp: 120,
  },
  {
    key: "community:cohort-join",
    label: "Founding seat",
    hint: "Claim your seat in the cohort",
    glyph: "◇",
    xp: 180,
  },
  {
    key: "tickpix:mint",
    label: "Take a Tickpix seat",
    hint: "Mint at nft.aibusiness.fun · link wallet · claim Pit badge",
    glyph: "▣",
    xp: 100,
  },
  {
    key: "tickpix:clock-in",
    label: "Clock in on the tape",
    hint: "Daily show-up on the Tickpix contract",
    glyph: "⏱",
    xp: 25,
  },
  {
    key: "tickpix:share-tape",
    label: "Share a tape card",
    hint: "Print + post a Tickpix tape card",
    glyph: "🖨",
    xp: 40,
  },
];

/**
 * A quiet badge trail: three small rites of passage, lit as they are earned.
 */
export function QuestTrail({
  quests,
  completed,
  className,
}: {
  quests: Quest[];
  completed: Set<string>;
  className?: string;
}) {
  const done = quests.filter((q) => completed.has(q.key)).length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Initiation</span>
        <span className="num text-primary">
          {done} / {quests.length}
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {quests.map((q, i) => {
          const earned = completed.has(q.key);
          return (
            <motion.div
              key={q.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative flex items-start gap-3 rounded-2xl px-3.5 py-3 transition-colors",
                earned ? "bg-primary/10" : "bg-foreground/5",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[13px] transition-all",
                  earned
                    ? "bg-primary/20 text-primary shadow-[0_0_18px_var(--primary)]"
                    : "bg-foreground/6 text-muted-foreground/70",
                )}
              >
                {earned ? <Check className="h-3.5 w-3.5" /> : q.glyph}
              </span>
              <div className="min-w-0">
                <p className={cn("text-[13px] font-medium", !earned && "text-muted-foreground")}>
                  {q.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/70">
                  {q.hint}
                </p>
                <p
                  className={cn(
                    "num mt-1 text-[11px]",
                    earned ? "text-primary" : "text-muted-foreground/60",
                  )}
                >
                  +{q.xp} XP
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
