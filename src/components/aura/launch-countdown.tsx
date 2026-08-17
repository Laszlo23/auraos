import { motion } from "motion/react";

import { Pulse } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import {
  SOCIAL_LINKS,
  TOKEN_LAUNCH_DISPLAY,
  TOKEN_LAUNCH_LABEL,
  TOKEN_LAUNCH_NOTICE_HOURS,
} from "@/lib/site";
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

/**
 * Fair-launch announce panel — no fixed public countdown.
 * Exact T-0 is published on official channels 48 hours ahead (never by DM / surprise CA).
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
          {t("landing.launchCompact", { hours: TOKEN_LAUNCH_NOTICE_HOURS })}
        </span>
      </div>
    );
  }

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
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {t("landing.launchTrust")}
        </p>
      </motion.div>

      {showSocials ? <SocialJoinRow placement={placement} /> : null}
    </div>
  );
}
