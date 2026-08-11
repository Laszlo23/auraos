import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Panel } from "@/components/aura/primitives";
import { TASK_COST } from "@/lib/task-cost";
import { timeAgo } from "@/lib/format";
import { retryFailedAiTasks } from "@/lib/worker.functions";

export type FailedTask = {
  id: string;
  title: string;
  description?: string | null;
  result?: string | null;
  agent_id?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  status: string;
};

type Agent = { id: string; name: string };

type Props = {
  tasks: FailedTask[];
  agents: Agent[];
};

function reasonFrom(task: FailedTask): string {
  const raw = (task.result || task.description || "").trim();
  if (!raw) return "No detailed failure reason was recorded.";
  return raw.slice(0, 280);
}

export function FailedWorkPanel({ tasks, agents }: Props) {
  const qc = useQueryClient();
  const failed = tasks.filter((t) => t.status === "failed").slice(0, 6);
  const retry = useMutation({
    mutationFn: (taskId?: string) =>
      retryFailedAiTasks(taskId ? { data: { taskId } } : { data: {} }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["company-table", "tasks"] });
      toast.success(
        res.requeued === 0
          ? "Nothing left to retry"
          : `Retried ${res.requeued} · ${res.tasksProcessed} completed just now`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (failed.length === 0) return null;

  const nameFor = (id?: string | null) =>
    agents.find((a) => a.id === id)?.name ?? "Agent";

  return (
    <Panel label="Failures · honest" glow delay={0.03}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          Failed work stays visible. Most of these were{" "}
          <span className="text-foreground">freellm_unreachable</span> while FreeLLM was down —
          retry once AI is healthy again.
        </p>
        <button
          type="button"
          disabled={retry.isPending}
          onClick={() => retry.mutate(undefined)}
          className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {retry.isPending ? "Retrying…" : `Retry all (${failed.length})`}
        </button>
      </div>
      <div className="space-y-3">
        {failed.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">
                  Failed · {nameFor(t.agent_id)}
                </p>
                <p className="mt-1 text-[14px] font-medium">{t.title}</p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {timeAgo(t.completed_at ?? t.created_at ?? new Date().toISOString())}
              </span>
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Cost · up to {TASK_COST} AURA (if compute ran)
            </p>
            <p className="mt-2 text-[13px] leading-relaxed">
              <span className="text-muted-foreground">What happened · </span>
              {reasonFrom(t)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={retry.isPending}
                onClick={() => retry.mutate(t.id)}
                className="rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold text-primary disabled:opacity-50"
              >
                Retry now
              </button>
              <Link
                to="/ceo"
                className="rounded-xl bg-foreground/8 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
              >
                Ask Atlas
              </Link>
              <Link
                to="/tasks"
                className="rounded-xl bg-foreground/8 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
              >
                Open board
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
