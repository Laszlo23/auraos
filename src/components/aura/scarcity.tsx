import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";

import { num } from "@/lib/format";
import { useNetworkTotals } from "@/hooks/use-public";
import {
  FOUNDING_SEATS_TOTAL,
  WAVE1_CLOSES_DISPLAY,
  WAVE1_LABEL,
  WAVE1_LAUNCH_TRUST,
} from "@/lib/marketing-scarcity";
import { getPublicSeatScarcity } from "@/lib/reviews.functions";
import { Meter } from "./primitives";

/** Paid founding inventory: $299 OS seats + paid Local seats. Cap stays 1000. */
export function useFoundingSeatScarcity() {
  return useQuery({
    queryKey: ["founding-seats-scarcity"],
    refetchInterval: 30_000,
    staleTime: 10_000,
    queryFn: () => getPublicSeatScarcity(),
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
  const { data, isSuccess } = useFoundingSeatScarcity();
  const cap = data?.cap ?? FOUNDING_SEATS_TOTAL;
  const taken = data?.taken ?? 0;
  const remaining = data?.remaining ?? 0;
  const pct = (taken / cap) * 100;
  const ready = isSuccess && data?.remaining != null;

  if (compactMode) {
    return (
      <span className="text-[11px] tracking-wide text-muted-foreground">
        Founding seats · <span className="num text-gold">{ready ? num(remaining) : "—"}</span> of{" "}
        {num(cap)} left
        {ready ? (
          <>
            {" "}
            · <span className="num text-foreground">{num(taken)}</span> seated
          </>
        ) : null}
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
        <span>
          Founding seats · {ready ? `${num(taken)} seated` : "counting…"} of {num(cap)}
        </span>
        <span className="num text-gold">{ready ? `${num(remaining)} left` : "—"}</span>
      </div>
      <Meter value={ready ? pct : 0} tone="gold" />
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/80">
        Paid inventory only — {ready ? `${num(taken)} seated, ${num(remaining)} left` : "counting…"}.
        Locked pricing. Founding badge. One invite each after you seat.
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
  const { data, isSuccess } = useFoundingSeatScarcity();
  const { data: totals } = useNetworkTotals();

  const cap = data?.cap ?? FOUNDING_SEATS_TOTAL;
  const taken = data?.taken ?? 0;
  const remaining = data?.remaining ?? 0;
  const pct = (taken / cap) * 100;
  const ready = isSuccess && data?.remaining != null;
  const soldOut = ready && remaining === 0;
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
            : ready
              ? `${num(remaining)} of ${num(cap)} left · ${num(taken)} seated`
              : "—"}
        </span>
      </div>
      <Meter value={soldOut ? 100 : ready ? pct : 0} tone="gold" />
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
