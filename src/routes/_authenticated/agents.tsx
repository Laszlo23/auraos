import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { AssignAgentTask } from "@/components/aura/assign-agent-task";
import { Chip, Meter, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { useCompanyTable } from "@/hooks/use-aura";
import { setAgentPaused } from "@/lib/economy.functions";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({
    meta: [
      { title: "Employees — Aura OS" },
      {
        name: "description",
        content:
          "Economic workers: tasks, AURA spent, attributed revenue, memory, pause and configure.",
      },
      { property: "og:title", content: "Employees — Aura OS" },
      { property: "og:description", content: "Your autonomous workforce, live." },
    ],
  }),
  component: AgentsPage,
});

type Agent = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  accent: string;
  current_task: string;
  health: number;
  performance: number;
  activity: number;
  revenue_generated: number;
  credits_used: number;
  tasks_completed: number;
  lessons_count: number;
  memory: string;
  paused?: boolean;
  status?: string;
};

function memoryFactCount(memory: string | null | undefined) {
  if (!memory?.trim()) return 0;
  return memory
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 8).length;
}

function AgentsPage() {
  const { data: agents = [] } = useCompanyTable<Agent>("agents", { orderBy: "created_at" });
  const { data: tasks = [] } = useCompanyTable<{
    id: string;
    status: string;
    agent_id?: string | null;
  }>("tasks", { orderBy: "created_at" });
  const [open, setOpen] = useState<Agent | null>(null);
  const qc = useQueryClient();

  const pause = useMutation({
    mutationFn: ({ agentId, paused }: { agentId: string; paused: boolean }) =>
      setAgentPaused({ data: { agentId, paused } }),
    onSuccess: (_, vars) => {
      toast.success(vars.paused ? "Employee paused — no new assignments" : "Employee resumed");
      qc.invalidateQueries({ queryKey: ["table", "agents"] });
      qc.invalidateQueries({ queryKey: ["company-economy"] });
      setOpen((o) => (o && o.id === vars.agentId ? { ...o, paused: vars.paused } : o));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function agentBusy(agentId: string) {
    return tasks.some(
      (t) => t.agent_id === agentId && (t.status === "running" || t.status === "queued"),
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workforce"
        title={
          agents.length <= 1 ? "Atlas is ready to build a team" : "Employees as economic workers"
        }
        description="Status comes from real tasks (queued/running). Pause stops new assignment."
      />

      {agents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No agents yet — your company will wake Atlas on first login.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((a, i) => (
            <Panel
              key={a.id}
              delay={0.04 * i}
              className="cursor-pointer p-6"
              onClick={() => setOpen(a)}
            >
              <div className="flex items-center gap-3.5">
                <span
                  className={`grid h-12 w-12 place-items-center rounded-2xl text-lg ${
                    a.accent === "gold" ? "bg-gold/14 text-gold" : "bg-primary/14 text-primary"
                  }`}
                >
                  {a.avatar}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {a.role} · {a.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.paused ? "Paused" : (a.status ?? "active")}
                  </p>
                </div>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Pulse tone={a.paused ? "muted" : agentBusy(a.id) ? "primary" : "muted"} />
                  {a.paused ? "paused" : agentBusy(a.id) ? "working" : "idle"}
                </span>
              </div>

              <p className="mt-5 line-clamp-2 text-[13px] leading-relaxed text-foreground/80">
                {a.current_task || "Waiting for founder direction"}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <div>
                  <p className="num text-lg font-semibold">{a.tasks_completed ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Tasks
                  </p>
                </div>
                <div>
                  <p className="num text-lg font-semibold text-gold">{a.credits_used ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">AURA</p>
                </div>
                <div>
                  <p className="num text-lg font-semibold">{a.revenue_generated ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rev</p>
                </div>
                <div>
                  <p className="num text-lg font-semibold">{memoryFactCount(a.memory)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Memory
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <Meter
                  value={a.tasks_completed ? a.performance : 0}
                  tone={a.accent === "gold" ? "gold" : "primary"}
                />
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {a.tasks_completed
                    ? `Performance ${a.performance}%`
                    : "Unrated — no completed work yet"}
                </p>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-5 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-lg rounded-[2rem] p-8"
            >
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-3xl bg-primary/14 text-2xl text-primary">
                  {open.avatar}
                </span>
                <div>
                  <h3 className="text-xl font-semibold">
                    {open.role} · {open.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">Economic worker card</p>
                </div>
                <Chip tone={open.paused ? "gold" : "primary"} className="ml-auto">
                  <Pulse /> {open.paused ? "paused" : "live"}
                </Chip>
              </div>

              <p className="mt-7 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Current task
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                {open.current_task || "Waiting for founder direction"}
              </p>

              <div className="mt-6">
                <AssignAgentTask
                  agentId={open.id}
                  agentName={open.name}
                  paused={open.paused}
                  variant="sheet"
                  onAssigned={() => setOpen(null)}
                />
              </div>

              <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Memory ({memoryFactCount(open.memory)} facts)
              </p>
              <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {open.memory || "Empty — lessons appear after approved tasks complete."}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="glass-soft rounded-2xl p-4">
                  <p className="num text-2xl font-semibold text-gold">
                    <Counter value={open.tasks_completed ?? 0} />
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Tasks
                  </p>
                </div>
                <div className="glass-soft rounded-2xl p-4">
                  <p className="num text-2xl font-semibold">
                    <Counter value={open.credits_used ?? 0} />
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    AURA spent
                  </p>
                </div>
                <div className="glass-soft rounded-2xl p-4">
                  <p className="num text-2xl font-semibold">
                    <Counter value={open.revenue_generated ?? 0} />
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Attr. rev
                  </p>
                </div>
                <div className="glass-soft rounded-2xl p-4">
                  <p className="num text-2xl font-semibold">
                    {open.tasks_completed ? `${open.performance}%` : "—"}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Perf
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={pause.isPending}
                onClick={() => pause.mutate({ agentId: open.id, paused: !open.paused })}
                className="mt-6 w-full rounded-2xl bg-primary/14 py-3 text-sm font-semibold text-primary"
              >
                {open.paused ? "Resume employee" : "Pause — no new tasks"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(null)}
                className="mt-3 w-full rounded-2xl bg-foreground/8 py-3 text-sm transition-colors hover:bg-foreground/12"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
