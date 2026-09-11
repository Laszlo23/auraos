import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { Pulse } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import {
  padLaunchUnit,
  TOKEN_LAUNCH_DISPLAY,
  TOKEN_LAUNCH_LABEL,
  tokenLaunchRemain,
} from "@/lib/aura-t0-clock";
import { SOCIAL_LINKS } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

export function SocialJoinRow({ placement, className }: { placement: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {SOCIAL_LINKS.map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackTeaser("social_join", { placement: `${s.id}:${placement}`.slice(0, 40) })
          }
          className="rounded-2xl border border-white/10 bg-foreground/5 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/85 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
        >
          {s.label}
        </a>
      ))}
    </div>
  );
}

function useLaunchRemain() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now === null ? null : tokenLaunchRemain(now);
}

/**
 * Fair-launch clock — T-0 Sunday 13 Sep 2026, 11:11 Europe/Vienna.
 * CA still unpublished until that minute.
 */
export function LaunchCountdown({
  variant = "hero",
  className,
  showSocials = true,
  placement = "countdown",
}: {
  variant?: "compact" | "hero";
  className?: string;
  showSocials?: boolean;
  placement?: string;
}) {
  const { t } = useLocale();
  const remain = useLaunchRemain();

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em]",
          className,
        )}
        aria-live="polite"
      >
        <Pulse />
        <span className="text-muted-foreground">
          <span className="text-primary">{TOKEN_LAUNCH_LABEL}</span>
          {" · "}
          {remain?.live
            ? t("landing.launchLiveCa")
            : t("landing.launchCompact", { when: TOKEN_LAUNCH_DISPLAY })}
        </span>
      </div>
    );
  }

  const units = remain
    ? [
        { n: remain.days, label: t("landing.days"), pad: false },
        { n: remain.hours, label: t("landing.hours"), pad: true },
        { n: remain.minutes, label: t("landing.mins"), pad: true },
        { n: remain.seconds, label: t("landing.secs"), pad: true },
      ]
    : null;

  return (
    <div className={cn("space-y-6", className)} aria-live="polite">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
        <Pulse />
        {TOKEN_LAUNCH_LABEL} · {TOKEN_LAUNCH_DISPLAY}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-display text-[clamp(1.8rem,5vw,2.8rem)] leading-[1.05] tracking-tight">
          {t("landing.launchOpen")}
          <span className="block text-primary">{t("landing.launchFollow")}</span>
        </p>
        {remain?.live ? (
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-primary">
            {t("landing.launchLiveCa")}
          </p>
        ) : units ? (
          <div className="mt-5 grid max-w-md grid-cols-4 gap-2">
            {units.map((u) => (
              <div
                key={u.label}
                className="rounded-2xl border border-white/10 bg-foreground/5 px-2 py-3 text-center"
              >
                <div className="font-display text-2xl tabular-nums tracking-tight text-foreground">
                  {u.pad ? padLaunchUnit(u.n) : u.n}
                </div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {u.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {t("landing.launchTrust")}
        </p>
      </motion.div>

      {showSocials ? <SocialJoinRow placement={placement} /> : null}
    </div>
  );
}
