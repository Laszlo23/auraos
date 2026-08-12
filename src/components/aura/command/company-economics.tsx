import { Link } from "@tanstack/react-router";

import { Chip, Panel } from "@/components/aura/primitives";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Totals = {
  revenue: number;
  expenses: number;
  profit: number;
  lifetime: number;
};

type Props = {
  totals?: Totals | null;
  customers: number;
  auraSpentToday: number;
  dailyAuraBudget: number;
  missionBudgetUsdc?: number | null;
  activeProjectedRevenue?: number | null;
  activeTargetUsdc?: number | null;
};

function Bucket({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "actual" | "projected" | "allocated";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        tone === "actual" && "border-emerald-500/25 bg-emerald-500/[0.06]",
        tone === "projected" && "border-border/50 bg-foreground/[0.03]",
        tone === "allocated" && "border-primary/25 bg-primary/[0.06]",
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="num mt-1 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export function CompanyEconomicsPanel({
  totals,
  customers,
  auraSpentToday,
  dailyAuraBudget,
  missionBudgetUsdc,
  activeProjectedRevenue,
  activeTargetUsdc,
}: Props) {
  const rev = totals?.revenue ?? 0;
  const exp = totals?.expenses ?? 0;
  const profit = totals?.profit ?? 0;
  const life = totals?.lifetime ?? 0;

  return (
    <Panel
      label="Company economics"
      delay={0.05}
      action={
        <Link
          to="/wallet"
          className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
        >
          Wallet
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip tone="primary">Actual = ledger settled</Chip>
        <Chip>Projected ≠ revenue</Chip>
        <Chip>Allocated = budget</Chip>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Bucket
          label="Revenue · actual"
          value={currency(rev)}
          hint="Settled USDC in"
          tone="actual"
        />
        <Bucket
          label="Expenses · actual"
          value={currency(exp)}
          hint="Fees + compute (USDC)"
          tone="actual"
        />
        <Bucket
          label="Profit · actual"
          value={currency(profit)}
          hint="Revenue − outflows"
          tone="actual"
        />
        <Bucket
          label="Lifetime · actual"
          value={currency(life)}
          hint="All settled revenue"
          tone="actual"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Bucket
          label="Customers · verified"
          value={String(customers)}
          hint="Real customer rows only"
          tone="actual"
        />
        <Bucket
          label="AURA spent · today"
          value={`${auraSpentToday} / ${dailyAuraBudget}`}
          hint="Compute burn (not revenue)"
          tone="actual"
        />
        <Bucket
          label="Mission budget · allocated"
          value={missionBudgetUsdc != null ? currency(missionBudgetUsdc) : "—"}
          hint="Capital reserved for active plan"
          tone="allocated"
        />
        <Bucket
          label="Projected · not actual"
          value={activeProjectedRevenue != null ? currency(activeProjectedRevenue) : "—"}
          hint={
            activeTargetUsdc != null
              ? `Target ${currency(activeTargetUsdc)} · projection — not actual revenue`
              : "Projection — not actual revenue"
          }
          tone="projected"
        />
      </div>

      {(activeProjectedRevenue ?? 0) > 0 ? (
        <p className="mt-4 rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
          Projection — not actual revenue. Assumptions live on the mission plan. Nothing here is a
          guarantee.
        </p>
      ) : null}
    </Panel>
  );
}
