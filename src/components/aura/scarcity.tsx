import { motion } from "motion/react";

import { num } from "@/lib/format";
import { useNetworkTotals } from "@/hooks/use-public";
import { Meter } from "./primitives";

const TOTAL_SEATS = 2000;

/**
 * Founding cohort counter driven by real company count (no inflated seat theater).
 */
export function FoundingCohort({
  seat,
  compactMode = false,
}: {
  seat?: number | undefined;
  compactMode?: boolean;
}) {
  const { data: totals } = useNetworkTotals();
  const taken = Math.min(TOTAL_SEATS, Math.max(seat ?? 0, totals?.companies ?? 0));
  const remaining = Math.max(0, TOTAL_SEATS - taken);
  const pct = (taken / TOTAL_SEATS) * 100;

  if (compactMode) {
    return (
      <span className="text-[11px] tracking-wide text-muted-foreground">
        Founding cohort · <span className="num text-gold">{remaining}</span> seats remain
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
      <div className="mb-2 flex items-baseline justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Founding cohort</span>
        <span className="num text-gold">
          {num(taken)} / {num(TOTAL_SEATS)}
        </span>
      </div>
      <Meter value={pct} tone="gold" />
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/80">
        Founding companies keep their token rate for life. When the cohort closes, it closes
        quietly.
      </p>
    </motion.div>
  );
}
