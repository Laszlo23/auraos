import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useProgress } from "@/hooks/use-progress";

const STREAK_KEY = "aura.lokal.streak.seen";

/**
 * Soft engagement hooks for Aura Local owners:
 * - celebrate returning with an active streak
 * - never spam — once per day per browser
 */
export function useLokalEngagement() {
  const { data: progress } = useProgress();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !progress?.onboarded) return;
    const streak = progress.streak_days ?? 0;
    if (streak < 2) return;

    const day = new Date().toISOString().slice(0, 10);
    try {
      if (window.localStorage.getItem(STREAK_KEY) === day) return;
      window.localStorage.setItem(STREAK_KEY, day);
    } catch {
      /* ignore */
    }

    fired.current = true;
    toast.success(
      streak >= 7
        ? `${streak} Tage am Stück — stark für deinen Laden.`
        : `${streak}-Tage-Serie · weiter so mit Sternen & Gästen.`,
      { duration: 4200 },
    );
  }, [progress?.onboarded, progress?.streak_days]);

  return {
    streakDays: progress?.streak_days ?? 0,
    xp: progress?.xp ?? 0,
    level: progress?.level ?? 1,
  };
}

/** Fire a one-shot win toast after a meaningful Lokal action. */
export function celebrateLokalWin(message: string) {
  toast.success(message, { duration: 3600 });
}
