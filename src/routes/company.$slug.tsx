import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Chip, Panel, Shimmer } from "@/components/aura/primitives";
import { autonomyLabel } from "@/lib/company-economy";
import { getPublicCompany } from "@/lib/economy.functions";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/company/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Company passport | Aura OS` },
      {
        name: "description",
        content: "Public company passport — stats from the real ledger. Zeros are honest.",
      },
    ],
  }),
  component: PublicCompanyPage,
});

function PublicCompanyPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["public-company", slug],
    queryFn: () => getPublicCompany({ data: { slug } }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Shimmer className="h-24" />
        <Shimmer className="h-48" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg p-12 text-center">
        <h1 className="text-2xl font-semibold">Company not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">No public passport for this slug.</p>
        <Link to="/" className="mt-6 inline-block text-primary">
          Back to Aura OS
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <div>
        <p className="text-[10px] uppercase tracking-[0.32em] text-primary">Company passport</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{data.name}</h1>
        {data.tagline && (
          <p className="mt-3 text-[15px] text-muted-foreground">{data.tagline}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone="primary">Lv {data.level}</Chip>
          <Chip tone="gold">Rep {data.reputation}</Chip>
          <Chip tone="primary">{autonomyLabel(data.autonomy)}</Chip>
          {data.seat != null && <Chip tone="gold">Seat #{data.seat}</Chip>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={currency(data.revenue)} />
        <Stat label="Profit" value={currency(data.profit)} />
        <Stat label="Employees" value={String(data.agents)} />
        <Stat label="Tasks done" value={String(data.tasksCompleted)} />
      </div>

      <Panel label="Honesty">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Figures come from settled company ledger rows. Empty companies show zero — not demo
          theater.
        </p>
      </Panel>

      <Link to="/" className="text-[12px] uppercase tracking-[0.18em] text-primary">
        Build yours on Aura OS →
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-soft rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
