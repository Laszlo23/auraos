import { useEffect, useState } from "react";

import { SocialJoinRow } from "@/components/aura/launch-countdown";
import { HOOD_EARLY_COPY, HOOD_EARLY_SUPPORTER_CAP } from "@/lib/hood-early";
import {
  formatHoodMintOpens,
  hoodMintIsOpen,
  hoodMintRemaining,
  type HoodMintRemaining,
} from "@/lib/hood-mint";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[4.4rem] rounded-2xl border border-gold/30 bg-hood-stage/70 px-3 py-3 text-center backdrop-blur-sm shadow-[var(--shadow-gold)]">
      <p className="font-display text-[clamp(1.6rem,5vw,2.2rem)] font-semibold leading-none tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-gold/80">
        {label}
      </p>
    </div>
  );
}

export function HoodMintCountdown({
  locale,
  className,
  showSocials = true,
  compact = false,
}: {
  locale: "en" | "de";
  className?: string;
  showSocials?: boolean;
  /** Inside unified mint stage — no early-pass duplicate, no socials */
  compact?: boolean;
}) {
  const [clock, setClock] = useState<HoodMintRemaining>(() => hoodMintRemaining());
  const de = locale === "de";

  useEffect(() => {
    const tick = window.setInterval(() => setClock(hoodMintRemaining()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  if (hoodMintIsOpen() || clock.open) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="label-luxury-gold">{de ? "Mint ist offen" : "Mint is open"}</p>
        {!compact && showSocials ? <SocialJoinRow placement="hood-mint-open" /> : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} aria-live="polite">
      <div>
        <p className="label-luxury-gold">
          {de ? "Ziel — wenn die Pixel mitmachen" : "Target — if the pixels behave"}
        </p>
        <p className="mt-1 text-[13px] text-foreground/80">{formatHoodMintOpens(locale)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Cell value={String(clock.days)} label={de ? "Tage" : "Days"} />
        <Cell value={pad(clock.hours)} label={de ? "Std" : "Hours"} />
        <Cell value={pad(clock.minutes)} label={de ? "Min" : "Min"} />
        <Cell value={pad(clock.seconds)} label={de ? "Sek" : "Sec"} />
      </div>
      {!compact ? (
        <>
          <div className="rounded-2xl border border-gold/25 bg-gold/5 px-4 py-3">
            <p className="label-luxury-gold text-[10px] tracking-[0.2em]">
              {de ? HOOD_EARLY_COPY.kickerDe : HOOD_EARLY_COPY.kicker}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/85">
              {de
                ? `Vor dem Drop: Passwort-Mint für ${HOOD_EARLY_SUPPORTER_CAP} Early Supporters. Sicher, rate-limited, Passwort nur serverseitig.`
                : `Before the drop: password mint for ${HOOD_EARLY_SUPPORTER_CAP} early supporters. Rate-limited; password stays server-side.`}
            </p>
          </div>
          {showSocials ? (
            <div>
              <p className="mb-2 text-[11px] text-muted-foreground">
                {de
                  ? "Folge den offiziellen Kanälen — nie einer CA aus einer DM."
                  : "Follow official channels — never a CA from a DM."}
              </p>
              <SocialJoinRow placement="hood-mint" />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
