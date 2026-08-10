import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";

import { num } from "@/lib/format";
import { useNetworkTotals } from "@/hooks/use-public";
import { supabase } from "@/integrations/supabase/client";
import {
  FOUNDING_SEATS_TOTAL,
  WAVE1_CLOSES_DISPLAY,
  WAVE1_INVITE_CAP,
  WAVE1_LABEL,
  wave1Closed,
  wave1RemainingMs,
  wave1TakenFromSeats,
} from "@/lib/marketing-scarcity";
import { Meter } from "./primitives";

function useFoundingSeatsTaken() {
  return useQuery({
    queryKey: ["founding-seats-taken"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("founding_seats_taken");
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Closed";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Founding companies counter driven by paid founding seats (cap 1000).
 */
export function FoundingCohort({
  seat,
  compactMode = false,
}: {
  seat?: number | undefined;
  compactMode?: boolean;
}) {
  const { data: totals } = useNetworkTotals();
  const { data: seatsTaken } = useFoundingSeatsTaken();
  const taken = Math.min(
    FOUNDING_SEATS_TOTAL,
    Math.max(seat ?? 0, seatsTaken ?? 0, totals?.companies ?? 0),
  );
  const remaining = Math.max(0, FOUNDING_SEATS_TOTAL - taken);
  const pct = (taken / FOUNDING_SEATS_TOTAL) * 100;

  if (compactMode) {
    return (
      <span className="text-[11px] tracking-wide text-muted-foreground">
        Founding companies · <span className="num text-gold">{num(remaining)}</span> seats remaining
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.3 }}
      className="w-full max-w-sm"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Founding companies</span>
        <span className="num text-gold">{num(remaining)} seats remaining</span>
      </div>
      <Meter value={pct} tone="gold" />
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/80">
        Locked pricing. Founding badge. One invite each. When the cohort closes, it closes quietly.
      </p>
    </motion.div>
  );
}

/**
 * Marketing scarcity: Wave 1 invite pressure + countdown to private-access close.
 * Invite slots use founding seats taken (capped at WAVE1_INVITE_CAP) — not a fake inventory.
 */
export function MarketingWaveScarcity({ className }: { className?: string }) {
  const { data: seatsTaken = 0 } = useFoundingSeatsTaken();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const taken = wave1TakenFromSeats(seatsTaken);
  const remaining = Math.max(0, WAVE1_INVITE_CAP - taken);
  const pct = (taken / WAVE1_INVITE_CAP) * 100;
  const closed = wave1Closed(now);
  const clock = formatCountdown(wave1RemainingMs(now));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6 }}
      className={className}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>{WAVE1_LABEL}</span>
        <span className="num text-gold">
          {closed ? "Wave closed" : `${num(remaining)} invite slots left`}
        </span>
      </div>
      <Meter value={closed ? 100 : pct} tone="gold" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground/85">
        <p className="leading-relaxed">
          First {num(WAVE1_INVITE_CAP)} private-access invites before fair launch. After that, the
          door gets quieter.
        </p>
        <p className="num shrink-0 font-semibold tracking-wide text-foreground">
          {closed ? WAVE1_CLOSES_DISPLAY : clock}
        </p>
      </div>
    </motion.div>
  );
}
