import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Chip, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import {
  getAutomationDeskStatus,
  runAutomationDeskNow,
  type AutomationDeskStatus,
} from "@/lib/automation-desk.functions";

export const Route = createFileRoute("/_authenticated/automation")({
  head: () => ({
    meta: [
      { title: "Automation — Aura OS" },
      {
        name: "description",
        content:
          "Real worker jobs for your company — task queue, channels, trading desk, and site follow-ups.",
      },
      { property: "og:title", content: "Automation — Aura OS" },
      { property: "og:description", content: "Standing worker jobs with honest status." },
    ],
  }),
  component: AutomationPage,
});

function AutomationPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation-desk"],
    queryFn: () => getAutomationDeskStatus() as Promise<AutomationDeskStatus>,
    refetchInterval: 30_000,
  });

  const runNow = useMutation({
    mutationFn: () => runAutomationDeskNow(),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["automation-desk"] });
      void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      toast.success(
        res.tasksProcessed
          ? `Worker ran — ${res.tasksProcessed} task${res.tasksProcessed === 1 ? "" : "s"} processed.`
          : "Worker ran — nothing queued yet.",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Worker tick failed"),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Live worker"
        title="Standing instructions"
        description="These jobs are what /api/workers/tick actually runs for your company. No inflated run counters — counts come from your tasks, posts, and desk flags."
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={runNow.isPending}
          onClick={() => runNow.mutate()}
          className="rounded-2xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"
        >
          {runNow.isPending ? "Running…" : "Run worker now"}
        </button>
        <Link to="/tasks" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          Tasks
        </Link>
        <Link
          to="/trading"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Trading
        </Link>
        <Link
          to="/channels"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Channels
        </Link>
        <p className="text-[11px] text-muted-foreground">
          Production cron hits the worker about every 10 minutes.
        </p>
      </div>

      {isLoading ? (
        <Panel className="p-8 text-sm text-muted-foreground">Loading worker status…</Panel>
      ) : null}
      {error ? (
        <Panel className="p-8 text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load automation desk."}
        </Panel>
      ) : null}

      {data ? (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-4">
            <Stat label="Awaiting approval" value={data.tasks.pendingApproval} />
            <Stat label="Queued" value={data.tasks.queued} />
            <Stat label="Done / 24h" value={data.tasks.done24h} />
            <Stat label="Activity / 24h" value={data.activity24h} />
          </div>

          <div className="space-y-5">
            {data.jobs.map((job, i) => (
              <Panel key={job.key} className="p-7" delay={0.05 * i}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <Pulse tone={job.live ? "primary" : "muted"} />
                      <h3 className="text-lg font-semibold">{job.name}</h3>
                      <Chip tone={job.live ? "primary" : "neutral"}>
                        {job.live ? "live" : "idle"}
                      </Chip>
                    </div>
                    <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                      {job.description}
                    </p>
                    <p className="mt-2 text-[12px] text-foreground/80">{job.detail}</p>
                  </div>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-2">
                  {job.nodes.map((n, idx) => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="glass-soft rounded-2xl px-3.5 py-2 text-[12px]">{n}</span>
                      {idx < job.nodes.length - 1 ? (
                        <svg width="30" height="8" className="text-primary/60" aria-hidden>
                          <line
                            x1="0"
                            y1="4"
                            x2="30"
                            y2="4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className={job.live ? "flow-line" : ""}
                          />
                        </svg>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Panel className="p-4">
      <p className="num text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </Panel>
  );
}
