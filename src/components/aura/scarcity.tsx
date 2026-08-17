import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";

import { num } from "@/lib/format";
import { useNetworkTotals } from "@/hooks/use-public";
import { supabase } from "@/integrations/supabase/client";
import {
  FOUNDING_SEATS_TOTAL,
  WAVE1_CLOSES_DISPLAY,
  WAVE1_LABEL,
  WAVE1_LAUNCH_TRUST,
} from "@/lib/marketing-scarcity";
import { Meter } from "./primitives";

function useFoundingSeatsTaken() {
  return useQuery({
    queryKey: ["founding-seats-taken"],
    refetchInterval: 30_000,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("founding_seats_taken");
      if (error) {
        console.warn("founding_seats_taken", error.message);
        return 0;
      }
      const n = typeof data === "number" ? data : Number(data);
      return Number.isFinite(n) ? n : 0;
    },
  });
}

/**
 * Founding seats counter — paid seats RPC only (cap 1000).
 * Personal `seat` is shown as your number, never mixed into remaining.
 */
export function FoundingCohort({
  seat,
  compactMode = false,
}: {
  seat?: number | undefined;
  compactMode?: boolean;
}) {
  const { data: seatsTaken = 0, isFetched } = useFoundingSeatsTaken();
  const taken = Math.min(FOUNDING_SEATS_TOTAL, Math.max(0, seatsTaken));
  const remaining = Math.max(0, FOUNDING_SEATS_TOTAL - taken);
  const pct = (taken / FOUNDING_SEATS_TOTAL) * 100;
  const ready = isFetched;

  if (compactMode) {
    return (
      <span className="text-[11px] tracking-wide text-muted-foreground">
        Founding seats · <span className="num text-gold">{ready ? num(remaining) : "—"}</span> of{" "}
        {num(FOUNDING_SEATS_TOTAL)} left
        {seat != null ? (
          <>
            {" "}
            · yours <span className="num text-foreground">#{seat}</span>
          </>
        ) : null}
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
        <span>Founding seats · of {num(FOUNDING_SEATS_TOTAL)}</span>
        <span className="num text-gold">{ready ? `${num(remaining)} left` : "—"}</span>
      </div>
      <Meter value={ready ? pct : 0} tone="gold" />
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/80">
        Paid inventory only — {ready ? `${num(taken)} seated` : "counting…"}. Locked pricing.
        Founding badge. One invite each after you seat.
        {seat != null ? (
          <>
            {" "}
            Your seat is <span className="num text-foreground">#{seat}</span>.
          </>
        ) : null}
      </p>
    </motion.div>
  );
}

/**
 * Wave 1 pressure: real founding seats remaining + fair-launch announce policy.
 * No remapped “invite slot” inventory. No fixed public T-0 clock.
 */
export function MarketingWaveScarcity({ className }: { className?: string }) {
  const { data: seatsTaken = 0, isFetched } = useFoundingSeatsTaken();
  const { data: totals } = useNetworkTotals();

  const taken = Math.min(FOUNDING_SEATS_TOTAL, Math.max(0, seatsTaken));
  const remaining = Math.max(0, FOUNDING_SEATS_TOTAL - taken);
  const pct = (taken / FOUNDING_SEATS_TOTAL) * 100;
  const soldOut = remaining === 0;
  const companies = totals?.companies;

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
          {soldOut
            ? "Wave sold out"
            : isFetched
              ? `${num(remaining)} of ${num(FOUNDING_SEATS_TOTAL)} seats left`
              : "—"}
        </span>
      </div>
      <Meter value={soldOut ? 100 : isFetched ? pct : 0} tone="gold" />
      <div className="mt-3 flex flex-col gap-2 text-[12px] text-muted-foreground/85 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-xl leading-relaxed">
          Paid founding seats only
          {companies != null ? (
            <>
              {" "}
              · <span className="num text-foreground/80">{num(companies)}</span> companies live on
              the network
            </>
          ) : null}
          . {WAVE1_LAUNCH_TRUST}
        </p>
        <p className="num shrink-0 font-semibold tracking-wide text-foreground">
          {WAVE1_CLOSES_DISPLAY}
        </p>
      </div>
    </motion.div>
  );
}
