import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { DataRow, Panel } from "@/components/aura/primitives";
import { getCompanyEconomy } from "@/lib/economy.functions";
import { currency } from "@/lib/format";

export function RevenueWallet({ compact }: { compact?: boolean }) {
  const { data } = useQuery({
    queryKey: ["company-economy"],
    queryFn: () => getCompanyEconomy(),
    staleTime: 15_000,
  });

  if (!data) return null;
  const t = data.totals;
  const split = data.feeSplit;

  return (
    <Panel label="Revenue wallet" delay={0.04}>
      <div className={`grid gap-4 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-3"}`}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Available</p>
          <p className="num mt-1 text-2xl font-semibold text-gold">{currency(t.available)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pending</p>
          <p className="num mt-1 text-2xl font-semibold">{currency(t.pending)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lifetime</p>
          <p className="num mt-1 text-2xl font-semibold">{currency(t.lifetime)}</p>
        </div>
      </div>
      <div className="mt-4 space-y-1">
        <DataRow
          label="Profit"
          value={currency(t.profit)}
          tone={t.profit >= 0 ? "gold" : "primary"}
        />
        <DataRow label="Expenses" value={currency(t.expenses)} />
        <DataRow
          label="Fee split (settlements)"
          value={`${split.owner}% you · ${split.aura}% Aura · ${split.compute}% compute`}
        />
      </div>
      {!compact && data.slug && (
        <Link
          to="/company/$slug"
          params={{ slug: data.slug }}
          className="mt-4 inline-flex text-[11px] uppercase tracking-[0.18em] text-primary"
        >
          Public company passport →
        </Link>
      )}
      {data.recent.length === 0 && (
        <p className="mt-4 text-[12px] text-muted-foreground">
          Ledger empty — zeros are honest. Settlements from jobs, x402, or trades appear here.
        </p>
      )}
    </Panel>
  );
}
