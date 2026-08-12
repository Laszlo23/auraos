import { Link } from "@tanstack/react-router";

import { ExpandableCopy } from "@/components/aura/expandable-copy";
import { Panel } from "@/components/aura/primitives";

type Props = {
  revenue: number;
  customers: number;
  tasksCompleted: number;
  agents: number;
  actions24hApprox: number;
  productHint?: string | null;
};

export function ActivationChallenge({
  revenue,
  customers,
  tasksCompleted,
  agents,
  actions24hApprox,
  productHint,
}: Props) {
  const zeroMoney = revenue <= 0;
  const zeroCustomers = customers <= 0;
  if (!zeroMoney && !zeroCustomers) return null;

  const missionHint =
    productHint?.trim() || "Find and contact 20 qualified prospects for our offer.";

  return (
    <div className="space-y-4">
      {zeroMoney ? (
        <Panel label="Current company" glow delay={0.02}>
          <div className="relative z-10 max-w-[min(100%,36rem)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Revenue" value="$0" />
              <Stat label="Customers" value={String(customers)} />
              <Stat label="Tasks completed" value={String(tasksCompleted)} />
              <Stat label="AI employees" value={String(agents)} />
              <Stat label="Actions recorded" value={String(actions24hApprox)} />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">
              Your company exists. Now let&apos;s make it earn.
            </h3>
            <p className="mt-2 text-[13px] text-muted-foreground">
              $0 earned. Good — now we have something to beat.
            </p>
            <a
              href="#primary-mission"
              className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              Create first revenue mission
            </a>
          </div>
        </Panel>
      ) : null}

      {zeroCustomers ? (
        <Panel label="First customer" glow delay={0.03}>
          <div className="relative z-10 max-w-[min(100%,28rem)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
              Next milestone
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">
              Get your first paying customer.
            </h3>
            <ExpandableCopy
              text={`Recommended mission: “${missionHint}”`}
              title="Recommended mission"
              maxLines={3}
              className="mt-2"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#primary-mission"
                className="rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary"
              >
                Ask Atlas to plan it
              </a>
              <Link
                to="/ceo"
                className="rounded-2xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Talk to Atlas
              </Link>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-foreground/[0.04] px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="num mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
