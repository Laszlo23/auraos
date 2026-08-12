import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { Pulse } from "@/components/aura/primitives";
import {
  SOCIAL_LINKS,
  TOKEN_LAUNCH_DISPLAY,
  TOKEN_LAUNCH_LABEL,
  TOKEN_LAUNCH_MS,
} from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

type Parts = { d: number; h: number; m: number; s: number; live: boolean };

function split(msLeft: number): Parts {
  if (msLeft <= 0) return { d: 0, h: 0, m: 0, s: 0, live: true };
  const total = Math.floor(msLeft / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s, live: false };
}

function useLaunchClock(): Parts {
  const [parts, setParts] = useState<Parts>(() => split(TOKEN_LAUNCH_MS - Date.now()));
  useEffect(() => {
    const tick = () => setParts(split(TOKEN_LAUNCH_MS - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return parts;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Unit({ value, label, large }: { value: string; label: string; large?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "num font-semibold tabular-nums text-foreground",
          large
            ? "text-[clamp(2rem,8vw,3.6rem)] leading-none tracking-tight"
            : "text-[13px] leading-none",
        )}
      >
        {value}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

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
 * Fair-launch countdown. Compact for chrome; hero for the dedicated section.
 * After T-0 flips to “live” + social CTAs (no invented CA).
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
  const { d, h, m, s, live } = useLaunchClock();

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
        {live ? (
          <span className="text-primary">{TOKEN_LAUNCH_LABEL} is live</span>
        ) : (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="text-primary">{TOKEN_LAUNCH_LABEL}</span>
            <span className="num text-foreground">
              {d}d {pad(h)}:{pad(m)}:{pad(s)}
            </span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)} aria-live="polite">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
        <Pulse />
        {live ? `${TOKEN_LAUNCH_LABEL} is live` : `${TOKEN_LAUNCH_LABEL} · ${TOKEN_LAUNCH_DISPLAY}`}
      </div>

      {live ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[clamp(1.8rem,5vw,2.8rem)] leading-[1.05] tracking-tight"
        >
          The fair launch window is open.
          <span className="block text-primary">Follow Building Culture for the reveal.</span>
        </motion.p>
      ) : (
        <div className="flex flex-wrap items-end gap-4 sm:gap-7">
          <Unit value={String(d)} label="Days" large />
          <span className="mb-6 text-2xl text-muted-foreground/50">:</span>
          <Unit value={pad(h)} label="Hours" large />
          <span className="mb-6 text-2xl text-muted-foreground/50">:</span>
          <Unit value={pad(m)} label="Mins" large />
          <span className="mb-6 text-2xl text-muted-foreground/50">:</span>
          <Unit value={pad(s)} label="Secs" large />
        </div>
      )}

      {showSocials ? <SocialJoinRow placement={placement} /> : null}
    </div>
  );
}
