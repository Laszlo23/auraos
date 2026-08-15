import { Link } from "@tanstack/react-router";

import { AssignAgentTask } from "@/components/aura/assign-agent-task";
import { ExpandableCopy } from "@/components/aura/expandable-copy";
import { Chip, Panel } from "@/components/aura/primitives";
import { agentStatusLine, agentVoice } from "@/lib/agent-personality";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type WorkforceAgent = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  activity: number;
  current_task: string | null;
  paused?: boolean;
  performance?: number | null;
  tasks_completed?: number | null;
  credits_used?: number | null;
  revenue_generated?: number | null;
  status?: string | null;
};

type TaskLite = {
  id: string;
  status: string;
  agent_id?: string | null;
};

type Props = {
  agents: WorkforceAgent[];
  tasks: TaskLite[];
};

function failedCount(agentId: string, tasks: TaskLite[]) {
  return tasks.filter((t) => t.agent_id === agentId && t.status === "failed").length;
}

function hasOpenWork(agentId: string, tasks: TaskLite[]) {
  return tasks.some(
    (t) => t.agent_id === agentId && (t.status === "running" || t.status === "queued"),
  );
}

export function WorkforceBoard({ agents, tasks }: Props) {
  return (
    <Panel
      label="AI workforce"
      delay={0.08}
      action={
        <Link
          to="/agents"
          className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
        >
          View all
        </Link>
      }
    >
      <p className="mb-4 text-[13px] text-muted-foreground">
        You own the company. They do the work. Active means a real task is queued or running.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => {
          const fails = failedCount(a.id, tasks);
          const busy = hasOpenWork(a.id, tasks);
          const voice = agentVoice(a.name);
          const line = agentStatusLine(a.name, {
            busy,
            currentTask: a.current_task,
            failed: fails > 0 && !busy,
            ...(a.paused ? { paused: true as const } : {}),
          });
          const active = !a.paused && busy;
          return (
            <div
              key={a.id}
              className={cn(
                "rounded-2xl border border-border/50 bg-foreground/[0.03] p-4",
                active && "border-primary/30",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-foreground/8 text-base">
                  {a.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold tracking-tight">{a.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {a.role}
                  </p>
                </div>
                <Chip tone={a.paused ? "neutral" : active ? "primary" : "neutral"}>
                  {a.paused ? "Paused" : active ? "Active" : "Idle"}
                </Chip>
              </div>
              <p className="mt-3 text-[12px] italic leading-snug text-muted-foreground">
                {voice.tagline}
              </p>
              <ExpandableCopy
                text={busy && a.current_task?.trim() ? a.current_task : line}
                title={`${a.name} · status`}
                maxLines={2}
                className="mt-2"
              />
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <span>Done · {a.tasks_completed ?? 0}</span>
                <span>Failed · {fails}</span>
                <span>AURA · {a.credits_used ?? 0}</span>
                <span>
                  Attributed ·{" "}
                  {(a.revenue_generated ?? 0) > 0 ? currency(a.revenue_generated ?? 0) : "$0"}
                </span>
              </div>
              {(a.performance ?? 0) > 0 ? (
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Performance {a.performance}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <AssignAgentTask
                  agentId={a.id}
                  agentName={a.name}
                  variant="inline"
                  {...(a.paused !== undefined ? { paused: a.paused } : {})}
                />
                <Link
                  to="/tasks"
                  className="rounded-xl bg-foreground/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                >
                  View work
                </Link>
                {a.name === "Atlas" ? (
                  <Link
                    to="/ceo"
                    className="rounded-xl bg-foreground/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                  >
                    Ask Atlas
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
        {agents.length === 0 ? (
          <div className="sm:col-span-2">
            <p className="font-medium">Your company is ready for its first employee.</p>
            <Link
              to="/missions"
              className="mt-2 inline-flex text-[12px] font-semibold text-primary"
            >
              Build my workforce
            </Link>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
