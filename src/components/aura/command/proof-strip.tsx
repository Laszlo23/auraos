import { Link } from "@tanstack/react-router";

import { ProofOfWork } from "@/components/aura/proof-of-work";
import { Panel } from "@/components/aura/primitives";

export type ProofTask = {
  id: string;
  title: string;
  status: string;
  result?: string | null;
  agent_id?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  progress?: number | null;
};

type Agent = { id: string; name: string };

type Props = {
  tasks: ProofTask[];
  agents: Agent[];
};

export function ProofOfWorkStrip({ tasks, agents }: Props) {
  const proven = tasks
    .filter((t) => t.status === "completed" || t.status === "done" || t.status === "failed")
    .slice(0, 4);

  return (
    <Panel
      label="Proof of work"
      delay={0.09}
      action={
        <Link
          to="/proofs"
          className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
        >
          All proofs
        </Link>
      }
    >
      <p className="mb-4 text-[13px] text-muted-foreground">
        Who · what · when · cost · result. Only real tasks — never fabricated.
      </p>
      {proven.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No proof yet. Approve a plan and completed work will land here.
        </p>
      ) : (
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
      )}
    </Panel>
  );
}
