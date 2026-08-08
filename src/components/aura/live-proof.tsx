import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { Pulse } from "@/components/aura/primitives";
import { useNetworkTotals } from "@/hooks/use-public";

/**
 * Permanent proof strip on the landing page. Every number is read from the
 * network's own ledgers — nothing here is written by hand.
 */
export function LiveProof() {
  const { data } = useNetworkTotals();
  const stats = [
    {
      label: "Companies on Aura OS",
      value: Number(data?.companies ?? 0).toLocaleString(),
    },
    {
      label: "AI employees at work",
      value: Number(data?.agents ?? 0).toLocaleString(),
    },
    {
      label: "Actions in 24h",
      value: Number(data?.actions_24h ?? 0).toLocaleString(),
    },
  ];

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-6 md:p-8"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
              <Pulse /> Live system
            </p>
            <h2 className="font-display text-[clamp(1.5rem,4vw,2.4rem)] leading-[1.05] tracking-tight">
              The operating system is already online.
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              Real companies waking, real AI employees on the roster, real activity in the last day —
              counted from the live database.
            </p>
          </div>
          <Link
            to="/live"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-foreground/8 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Watch it live <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="border-t border-border/50 pt-4 sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0 first:border-l-0 first:pl-0">
              <p className="num text-[clamp(1.75rem,4vw,2.4rem)] font-semibold leading-none tracking-tight">
                {s.value}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
