import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { Chip, Meter, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { ProofOfWork, type PowStep } from "@/components/aura/proof-of-work";
import { useCompanyTable, useRowMutation } from "@/hooks/use-aura";
import { useApproveTask, useProposeNextActions, useRejectTask } from "@/lib/actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Aura OS" },
      {
        name: "description",
        content:
          "Approve agent proposals, then watch them plan, research, and file proof of work.",
      },
      { property: "og:title", content: "Tasks — Aura OS" },
      { property: "og:description", content: "Approve work. Agents execute for real." },
    ],
  }),
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  roi: number;
  progress: number;
  agent_id: string | null;
  result?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  steps?: PowStep[] | null;
  artifact?: {
    plan?: string[];
    sources?: { url: string; title: string; snippet?: string }[];
    searched?: boolean;
    searchQuery?: string;
  } | null;
};
type Agent = { id: string; name: string; avatar: string };

function boardStatus(status: string): string {
  if (status === "queue" || status === "pending") return "queued";
  if (status === "done") return "completed";
  if (status === "blocked") return "failed";
  return status;
}

const COLUMNS = [
  { key: "pending_approval", label: "Needs approval" },
  { key: "queued", label: "Queued" },
  { key: "running", label: "Running" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Needs attention" },
] as const;

const PRIORITY = {
  critical: "danger",
  high: "gold",
  medium: "primary",
  low: "neutral",
} as const;

function currentStep(steps: PowStep[] | null | undefined): PowStep | null {
  if (!steps?.length) return null;
  return (
    steps.find((s) => s.status === "running") ??
    steps.find((s) => s.status === "pending") ??
    steps[steps.length - 1] ??
    null
  );
}

function stepSummary(steps: PowStep[] | null | undefined) {
  if (!steps?.length) return null;
  const done = steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  return `${done}/${steps.length}`;
}

function TasksPage() {
  const { data: tasks = [] } = useCompanyTable<Task>("tasks", {
    orderBy: "created_at",
    refetchInterval: 3000,
  });
  const { data: agents = [] } = useCompanyTable<Agent>("agents");
  const mutate = useRowMutation("tasks");
  const approve = useApproveTask();
  const reject = useRejectTask();
  const propose = useProposeNextActions();
  const byId = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pending = tasks.filter((t) => boardStatus(t.status) === "pending_approval").length;
  const runningCount = tasks.filter((t) => boardStatus(t.status) === "running").length;

  const selected =
    tasks.find((t) => t.id === selectedId) ??
    tasks.find((t) => boardStatus(t.status) === "running") ??
    tasks.find((t) => boardStatus(t.status) === "queued") ??
    null;

  const selectedAgent = selected?.agent_id ? byId.get(selected.agent_id) : undefined;
  const selectedStatus = selected ? boardStatus(selected.status) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Execution"
        title="Approve, then watch them work"
        description={
          runningCount > 0
            ? `${runningCount} agent${runningCount === 1 ? "" : "s"} executing — open a card for the full trail.`
            : pending > 0
              ? `${pending} proposal${pending === 1 ? "" : "s"} waiting. Approve to start plan → research → deliverable.`
              : "No pending proposals. Ask Atlas to propose next actions, or dispatch work yourself."
        }
        actions={
          <button
            type="button"
            onClick={() => propose.mutate()}
            disabled={propose.isPending}
            className="rounded-2xl bg-primary/14 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/22 disabled:opacity-50"
          >
            {propose.isPending ? "Proposing…" : "Propose next actions"}
          </button>
        }
      />

      {/* Horizontal board — columns keep a readable min width */}
      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4 px-1 lg:min-w-0 lg:grid lg:grid-cols-5 lg:gap-4">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => boardStatus(t.status) === col.key);
            return (
              <div key={col.key} className="w-[260px] shrink-0 lg:w-auto lg:min-w-0">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <Pulse
                    tone={
                      col.key === "running"
                        ? "primary"
                        : col.key === "failed"
                          ? "destructive"
                          : col.key === "pending_approval"
                            ? "gold"
                            : "muted"
                    }
                  />
                  <p className="truncate text-sm font-medium">{col.label}</p>
                  <span className="num ml-auto shrink-0 text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {items.map((t, i) => {
                    const agent = t.agent_id ? byId.get(t.agent_id) : undefined;
                    const status = boardStatus(t.status);
                    const active = selected?.id === t.id;
                    const step = currentStep(t.steps);
                    const summary = stepSummary(t.steps);

                    return (
                      <Panel
                        key={t.id}
                        delay={0.02 * i}
                        className={cn(
                          "cursor-pointer p-3.5 transition-shadow",
                          active && "ring-1 ring-primary/35",
                        )}
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setSelectedId(t.id)}
                        >
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug">
                              {t.title}
                            </p>
                            <Chip
                              tone={PRIORITY[t.priority as keyof typeof PRIORITY] ?? "neutral"}
                            >
                              {t.priority}
                            </Chip>
                          </div>

                          {t.description && status === "pending_approval" && (
                            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                              {t.description}
                            </p>
                          )}

                          {(status === "running" || status === "queued") && (
                            <div className="mt-3 space-y-2">
                              <Meter value={t.progress} />
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="truncate text-muted-foreground">
                                  {status === "running" ? (
                                    <>
                                      <span className="text-primary">●</span>{" "}
                                      {step?.label ?? "Working…"}
                                    </>
                                  ) : (
                                    "Waiting to start"
                                  )}
                                </span>
                                {summary && (
                                  <span className="shrink-0 tabular-nums text-muted-foreground">
                                    {summary}
                                  </span>
                                )}
                              </div>
                              {step?.detail && status === "running" && (
                                <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                                  {step.detail}
                                </p>
                              )}
                            </div>
                          )}

                          {(status === "completed" || status === "failed") && (
                            <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                              {t.result?.trim() ||
                                (status === "failed" ? "Failed" : "Completed")}
                            </p>
                          )}

                          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                            {agent && (
                              <span className="flex min-w-0 items-center gap-1.5 truncate">
                                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-lg bg-foreground/8 text-[10px]">
                                  {agent.avatar}
                                </span>
                                <span className="truncate">{agent.name}</span>
                              </span>
                            )}
                            {status === "running" && (
                              <span className="ml-auto shrink-0 tabular-nums text-primary">
                                {t.progress}%
                              </span>
                            )}
                          </div>
                        </button>

                        {status === "pending_approval" && (
                          <div className="mt-3 flex gap-1.5">
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              disabled={approve.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(t.id);
                                approve.mutate(t.id);
                              }}
                              className="flex-1 rounded-xl bg-primary/14 px-2 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/22"
                            >
                              {approve.isPending ? "Starting…" : "Approve & run"}
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              disabled={reject.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                reject.mutate(t.id);
                              }}
                              className="rounded-xl bg-foreground/6 px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-destructive/14 hover:text-destructive"
                            >
                              Reject
                            </motion.button>
                          </div>
                        )}
                      </Panel>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border/80 px-3 py-8 text-center text-[11px] text-muted-foreground">
                      {col.key === "pending_approval"
                        ? "No proposals yet"
                        : col.key === "running"
                          ? "Nothing running"
                          : "Empty"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-width detail — readable proof of work */}
      {selected && selectedStatus && (
        <Panel
          label={
            selectedStatus === "running"
              ? "Live execution"
              : selectedStatus === "completed" || selectedStatus === "failed"
                ? "Proof of work"
                : "Task detail"
          }
          glow={selectedStatus === "running"}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-snug">{selected.title}</h2>
              {selected.description && (
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
                  {selected.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="primary">{selectedStatus}</Chip>
              {selectedAgent && <Chip tone="gold">{selectedAgent.name}</Chip>}
              {(selectedStatus === "running" || selectedStatus === "queued") && (
                <span className="text-[12px] tabular-nums text-muted-foreground">
                  {selected.progress}%
                </span>
              )}
            </div>
          </div>

          {(selectedStatus === "running" || selectedStatus === "queued") && (
            <div className="mt-4">
              <Meter value={selected.progress} />
            </div>
          )}

          {selected.steps && selected.steps.length > 0 && (
            <ol className="mt-5 grid gap-2 sm:grid-cols-2">
              {selected.steps.map((s, idx) => (
                <li
                  key={s.id}
                  className={cn(
                    "rounded-2xl border border-border/50 px-3.5 py-3 text-[13px]",
                    s.status === "running" && "border-primary/30 bg-primary/8",
                    s.status === "done" && "bg-foreground/[0.03]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        s.status === "running" && "text-primary",
                      )}
                    >
                      {s.label}
                    </span>
                    <Chip
                      tone={
                        s.status === "done" || s.status === "running" ? "primary" : "gold"
                      }
                    >
                      {s.status}
                    </Chip>
                  </div>
                  {s.detail && (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                      {s.detail}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}

          {(selectedStatus === "completed" || selectedStatus === "failed") && (
            <div className="mt-5 max-w-3xl">
              <ProofOfWork
                agentName={selectedAgent?.name}
                title={selected.title}
                status={selectedStatus}
                result={selected.result}
                completedAt={selected.completed_at}
                createdAt={selected.created_at}
                settlementUsdc={selected.roi > 0 ? selected.roi : null}
                steps={selected.steps}
                sources={selected.artifact?.sources}
                progress={selected.progress}
              />
            </div>
          )}

          {(selectedStatus === "running" || selectedStatus === "queued") &&
            selected.result && (
              <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
                {selected.result}
              </p>
            )}

          {selected.artifact?.sources && selected.artifact.sources.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Sources
              </p>
              <ul className="mt-2 space-y-1 text-[13px]">
                {selected.artifact.sources.map((s) => (
                  <li key={s.url} className="truncate">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {s.title || s.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedStatus !== "pending_approval" &&
            selectedStatus !== "completed" &&
            selectedStatus !== "failed" && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {COLUMNS.filter(
                  (c) =>
                    c.key !== selectedStatus &&
                    c.key !== "completed" &&
                    c.key !== "failed",
                ).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() =>
                      mutate.mutate({
                        id: selected.id,
                        values: {
                          status: c.key,
                          progress:
                            c.key === "queued" || c.key === "pending_approval"
                              ? 0
                              : selected.progress,
                        },
                      })
                    }
                    className="rounded-xl bg-foreground/6 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-primary/14 hover:text-primary"
                  >
                    Move to {c.label}
                  </button>
                ))}
              </div>
            )}
        </Panel>
      )}
    </div>
  );
}
