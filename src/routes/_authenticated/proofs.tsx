import { createFileRoute, Link } from "@tanstack/react-router";

import { ProofOfWork } from "@/components/aura/proof-of-work";
import { Chip, PageHeader, Panel, Shimmer } from "@/components/aura/primitives";
import { useCompanyTable } from "@/hooks/use-aura";

export const Route = createFileRoute("/_authenticated/proofs")({
  head: () => ({
    meta: [
      { title: "Proof — Aura OS" },
      {
        name: "description",
        content: "Completed work with source, cost, duration, and result — never vanity metrics.",
      },
    ],
  }),
  component: ProofsPage,
});

type Task = {
  id: string;
  title: string;
  status: string;
  result?: string | null;
  agent_id?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  progress?: number | null;
  roi?: number | null;
};

type Agent = { id: string; name: string };

function ProofsPage() {
  const { data: tasks = [], isLoading } = useCompanyTable<Task>("tasks", {
    orderBy: "created_at",
    ascending: false,
    limit: 40,
  });
  const { data: agents = [] } = useCompanyTable<Agent>("agents");

  const proven = tasks.filter(
    (t) => t.status === "completed" || t.status === "done" || t.status === "failed",
  );
  const running = tasks.filter((t) => t.status === "running" || t.status === "queued");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evidence"
        title="Proof of work"
        description="Who did what, when, at what cost. Projected numbers never appear as revenue."
      />

      <div className="flex flex-wrap gap-2">
        <Chip>Executed · {proven.filter((t) => t.status !== "failed").length}</Chip>
        <Chip tone="gold">In motion · {running.length}</Chip>
        <Chip>Verified · settled ledger only</Chip>
      </div>

      {isLoading ? <Shimmer className="h-40" /> : null}

      {!isLoading && proven.length === 0 ? (
        <Panel glow>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Your company has not filed proof yet.
          </h2>
          <p className="mt-2 max-w-lg text-[15px] text-muted-foreground">
            Approve a plan. When work finishes, the result lands here — not a vanity chart.
          </p>
          <Link
            to="/missions"
            className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Give your company something to do
          </Link>
        </Panel>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {proven.map((t) => (
          <ProofOfWork
            key={t.id}
            agentName={agents.find((a) => a.id === t.agent_id)?.name}
            title={t.title}
            status={t.status}
            result={t.result}
            completedAt={t.completed_at}
            createdAt={t.created_at}
            progress={t.progress}
          />
        ))}
      </div>
    </div>
  );
}
