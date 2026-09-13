import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { Pulse } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import {
  padLaunchUnit,
  TOKEN_LAUNCH_AT_ISO,
  TOKEN_LAUNCH_LABEL,
  tokenLaunchDisplay,
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

type ClockUnit = { n: number; label: string; pad: boolean };

function clockUnits(
  remain: ReturnType<typeof tokenLaunchRemain>,
  labels: { days: string; hours: string; mins: string; secs: string },
  hideDaysWhenZero: boolean,
): ClockUnit[] {
  const units: ClockUnit[] = [
    { n: remain.days, label: labels.days, pad: false },
    { n: remain.hours, label: labels.hours, pad: true },
    { n: remain.minutes, label: labels.mins, pad: true },
    { n: remain.seconds, label: labels.secs, pad: true },
  ];
  return hideDaysWhenZero && remain.days === 0 ? units.slice(1) : units;
}

function StageDigits({ units }: { units: ClockUnit[] }) {
  return (
    <div
      aria-hidden
      className={cn("mt-4 grid gap-2", units.length === 3 ? "grid-cols-3" : "grid-cols-4")}
    >
      {units.map((u) => (
        <div
          key={u.label}
          className="rounded-2xl border border-neon-lime/35 bg-charcoal/80 px-2 py-3 text-center shadow-[0_0_24px_rgba(207,255,4,0.12)]"
        >
          <div
            className="font-display text-[clamp(1.7rem,6vw,2.5rem)] leading-none tabular-nums tracking-tight text-neon-lime"
            style={{ textShadow: "0 0 28px rgba(207, 255, 4, 0.45)" }}
          >
            {u.pad ? padLaunchUnit(u.n) : u.n}
          </div>
          <div className="mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/65">
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
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
  variant?: "compact" | "hero" | "stage";
  className?: string;
  showSocials?: boolean;
  placement?: string;
}) {
  const { locale, t } = useLocale();
  const remain = useLaunchRemain();
  const when = tokenLaunchDisplay(locale);
  const labels = {
    days: t("landing.days"),
    hours: t("landing.hours"),
    mins: t("landing.mins"),
    secs: t("landing.secs"),
  };

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
          {remain?.live ? t("landing.launchLiveCa") : t("landing.launchCompact", { when })}
        </span>
      </div>
    );
  }

  if (variant === "stage") {
    const units = remain && !remain.live ? clockUnits(remain, labels, true) : null;

    return (
      <Link
        to="/token"
        onClick={() => trackTeaser("cta_click", { placement })}
        className={cn(
          "group block max-w-xl rounded-3xl border-2 border-neon-lime/45 bg-charcoal/75 p-4 shadow-[0_0_40px_rgba(207,255,4,0.22)] backdrop-blur-md transition-all sm:p-5",
          "hover:border-neon-lime hover:bg-charcoal/85 hover:shadow-[0_0_56px_rgba(207,255,4,0.4)]",
          className,
        )}
        aria-label={`${t("landing.heroClockKicker")}. ${when}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.32em] text-neon-lime">
            <Pulse />
            {t("landing.heroClockKicker")}
          </div>
          <time
            dateTime={TOKEN_LAUNCH_AT_ISO}
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/70"
          >
            {when}
          </time>
        </div>

        {remain?.live ? (
          <p
            className="mt-4 font-display text-[clamp(1.5rem,4vw,2.1rem)] leading-[1.08] text-neon-lime"
            style={{ textShadow: "0 0 32px rgba(207, 255, 4, 0.45)" }}
            aria-live="polite"
          >
            {t("landing.launchLiveCa")}
          </p>
        ) : units ? (
          <StageDigits units={units} />
        ) : (
          <div className="mt-4 h-[4.6rem] animate-pulse rounded-2xl bg-foreground/8" />
        )}

        <p className="mt-4 text-[13px] font-semibold leading-relaxed text-foreground/85">
          {remain?.live ? t("landing.heroClockLiveLine") : t("landing.heroClockLine")}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide text-neon-lime transition-transform group-hover:translate-x-0.5">
          {t("landing.heroClockCta")} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    );
  }

  if (variant === "hero") {
    const units = remain && !remain.live ? clockUnits(remain, labels, false) : null;

    return (
      <div className={cn("space-y-6", className)} aria-live="polite">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          <Pulse />
          {TOKEN_LAUNCH_LABEL} · {when}
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

  const _exhaustive: never = variant;
  return _exhaustive;
}
