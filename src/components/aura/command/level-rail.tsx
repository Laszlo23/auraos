import { Link } from "@tanstack/react-router";

import { Meter, Panel } from "@/components/aura/primitives";
import { currency } from "@/lib/format";

export type Milestone = {
  level: number;
  key: string;
  label: string;
  reached: boolean;
};

type Props = {
  xpLevel: number;
  milestones: Milestone[];
  lifetimeRevenue: number;
  customers: number;
};

export function LevelProgressRail({
  xpLevel,
  milestones,
  lifetimeRevenue,
  customers,
}: Props) {
  const next = milestones.find((m) => !m.reached) ?? milestones[milestones.length - 1];
  const reached = milestones.filter((m) => m.reached);

  let progress = 0;
  let progressLabel = "On track";
  if (next?.key === "first_customer") {
    progress = Math.min(100, customers * 100);
    progressLabel = `${customers} / 1 customer`;
  } else if (next?.key === "earn_100") {
    progress = Math.min(100, (lifetimeRevenue / 100) * 100);
    progressLabel = `${currency(lifetimeRevenue)} / $100`;
  } else if (next?.key === "earn_1000") {
    progress = Math.min(100, (lifetimeRevenue / 1000) * 100);
    progressLabel = `${currency(lifetimeRevenue)} / $1,000`;
  } else if (next?.key === "customers_10") {
    progress = Math.min(100, (customers / 10) * 100);
    progressLabel = `${customers} / 10 customers`;
  } else if (next?.key === "earn_10000") {
    progress = Math.min(100, (lifetimeRevenue / 10_000) * 100);
    progressLabel = `${currency(lifetimeRevenue)} / $10,000`;
  } else if (next?.reached) {
    progress = 100;
    progressLabel = "Milestone set complete";
  }

  return (
    <Panel label="Company progression" delay={0.14}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Current level
          </p>
          <p className="num text-3xl font-semibold">Level {xpLevel}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Next milestone
          </p>
          <p className="text-sm font-semibold">
            Lv {next?.level} · {next?.label}
            {next?.reached ? " ✓" : ""}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Meter value={progress} tone="primary" />
        <p className="mt-2 text-[12px] text-muted-foreground">{progressLabel}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {milestones.map((m) => (
          <span
            key={m.key}
            className={
              m.reached
                ? "rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary"
                : "rounded-full bg-foreground/6 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            }
          >
            Lv {m.level} · {m.label}
            {m.reached ? " ✓" : ""}
          </span>
        ))}
      </div>
      {reached.length > 0 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Unlocks only from real company events — customers and settled revenue, not vanity clicks.
        </p>
      ) : null}
      <Link
        to="/arena"
        className="mt-4 inline-flex text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
      >
        Season board →
      </Link>
    </Panel>
  );
}
