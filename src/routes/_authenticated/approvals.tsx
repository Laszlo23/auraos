import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Chip, PageHeader, Panel, Shimmer } from "@/components/aura/primitives";
import { ExpandableCopy } from "@/components/aura/expandable-copy";
import { SocialReplyBulkBar } from "@/components/aura/social-reply-bulk";
import { useCompanyTable, liveWorkInterval } from "@/hooks/use-aura";
import { useApproveTask, useRejectTask } from "@/lib/actions";
import { listRevenueMissions, startRevenueMission } from "@/lib/revenue-mission.functions";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — Aura OS" },
      {
        name: "description",
        content: "One inbox for spend, outreach, and anything that goes public.",
      },
    ],
  }),
  component: ApprovalsPage,
});

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  result?: string | null;
};

function ApprovalsPage() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useCompanyTable<Task>("tasks", {
    orderBy: "created_at",
    ascending: false,
    refetchInterval: liveWorkInterval(12_000),
  });
  const { data: missions = [] } = useQuery({
    queryKey: ["revenue-missions"],
    queryFn: () => listRevenueMissions(),
    staleTime: 5_000,
  });
  const approve = useApproveTask();
  const reject = useRejectTask();
  const startMission = useMutation({
    mutationFn: (missionId: string) => startRevenueMission({ data: { missionId } }),
    onSuccess: async () => {
      toast.success("Mission approved — the company is working.");
      await qc.invalidateQueries({ queryKey: ["revenue-missions"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not start mission."),
  });

  const awaiting = tasks.filter((t) => t.status === "pending_approval");
  const social = awaiting.filter((t) => Boolean(t.result?.startsWith("social-reply:")));
  const other = awaiting.filter((t) => !t.result?.startsWith("social-reply:"));
  const planned = missions.filter((m) => m.status === "planned");
  const empty = awaiting.length === 0 && planned.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner"
        title="Needs your approval"
        description="Nothing spends or goes public until you say so. One queue. One decision."
      />

      {isLoading ? <Shimmer className="h-40" /> : null}

      {empty && !isLoading ? (
        <Panel glow>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Nothing is waiting on you.
          </h2>
          <p className="mt-2 max-w-lg text-[15px] text-muted-foreground">
            Give the company a mission, or wait for the next draft. You stay the owner.
          </p>
          <Link
            to="/missions"
            className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Give it something to do
          </Link>
        </Panel>
      ) : null}

      {planned.length > 0 ? (
        <Panel label="Missions ready to start" glow>
          <ul className="space-y-3">
            {planned.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{m.goal_text}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Approval required before anyone spends or publishes.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={startMission.isPending}
                  onClick={() => startMission.mutate(m.id)}
                  className="rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold text-primary disabled:opacity-50"
                >
                  Approve & execute
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {social.length > 0 ? (
        <Panel label="Public replies" glow>
          <p className="mb-4 text-[13px] text-muted-foreground">
            Preview the draft. Approve to send. The customer writes their own words — we never
            invent them.
          </p>
          <SocialReplyBulkBar count={social.length} showFreeAuto />
          <div className="mt-4 space-y-3">
            {social.slice(0, 8).map((t) => (
              <ApprovalCard
                key={t.id}
                task={t}
                approveLabel="Send"
                approve={approve}
                reject={reject}
              />
            ))}
          </div>
        </Panel>
      ) : null}

      {other.length > 0 ? (
        <Panel label="Company work" glow>
          <div className="space-y-3">
            {other.map((t) => (
              <ApprovalCard
                key={t.id}
                task={t}
                approveLabel="Approve & run"
                approve={approve}
                reject={reject}
              />
            ))}
          </div>
        </Panel>
      ) : null}

      <p className="text-[12px] text-muted-foreground">
        Advanced work still lives on{" "}
        <Link to="/tasks" className="text-primary">
          Tasks
        </Link>{" "}
        if you want the full board.
      </p>
    </div>
  );
}

function ApprovalCard({
  task,
  approveLabel,
  approve,
  reject,
}: {
  task: Task;
  approveLabel: string;
  approve: { isPending: boolean; mutate: (id: string) => void };
  reject: { isPending: boolean; mutate: (id: string) => void };
}) {
  const preview = task.description
    ? task.description
        .replace(/^Draft:\s*/i, "")
        .split("\n\nOriginal:")[0]
        ?.trim()
    : null;
  return (
    <div className="rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium leading-snug">{task.title}</p>
          {preview ? (
            <ExpandableCopy text={preview} title={task.title} maxLines={3} className="mt-1.5" />
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Chip>Preview</Chip>
          <button
            type="button"
            disabled={approve.isPending || reject.isPending}
            onClick={() => approve.mutate(task.id)}
            className="rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold text-primary disabled:opacity-50"
          >
            {approve.isPending ? "…" : approveLabel}
          </button>
          <button
            type="button"
            disabled={approve.isPending || reject.isPending}
            onClick={() => reject.mutate(task.id)}
            className="rounded-xl bg-foreground/6 px-3 py-1.5 text-[11px] text-muted-foreground disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
