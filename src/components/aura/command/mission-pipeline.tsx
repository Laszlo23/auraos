import { ExpandableCopy } from "@/components/aura/expandable-copy";
import { cn } from "@/lib/utils";

export type PipelineStageState = "locked" | "waiting" | "active" | "completed" | "failed";

export type PipelineStage = {
  id: string;
  label: string;
  state: PipelineStageState;
  detail?: string;
};

const STATE_STYLE: Record<PipelineStageState, string> = {
  locked: "border-border/40 text-muted-foreground/50",
  waiting: "border-gold/40 bg-gold/10 text-gold",
  active: "border-primary/50 bg-primary/10 text-primary",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
};

const DOT: Record<PipelineStageState, string> = {
  locked: "bg-muted-foreground/30",
  waiting: "bg-gold",
  active: "bg-primary animate-pulse",
  completed: "bg-emerald-400",
  failed: "bg-destructive",
};

type Props = {
  stages: PipelineStage[];
  className?: string;
};

export function MissionPipeline({ stages, className }: Props) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <ol className="flex min-w-[640px] items-stretch gap-0 md:min-w-0 md:flex-wrap md:gap-2">
        {stages.map((stage, i) => (
          <li key={stage.id} className="flex flex-1 items-center md:flex-none">
            <div
              className={cn(
                "min-w-[7.5rem] flex-1 rounded-2xl border px-3 py-2.5 md:min-w-[8.5rem]",
                STATE_STYLE[stage.state],
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[stage.state])} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                  {stage.label}
                </span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] opacity-80">
                {stage.state}
              </p>
              {stage.detail ? (
                <ExpandableCopy
                  text={stage.detail}
                  title={stage.label}
                  maxLines={2}
                  className="mt-1 text-[11px] opacity-90"
                />
              ) : null}
            </div>
            {i < stages.length - 1 ? (
              <span
                className="mx-1 hidden text-muted-foreground/40 md:inline"
                aria-hidden
              >
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Derive pipeline from real company + mission + task state — never invent completion. */
export function deriveMissionPipeline(input: {
  hasMission: boolean;
  missionStatus?: string | null;
  awaitingApproval: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  actualRevenue: number;
  customers: number;
}): PipelineStage[] {
  const st = (input.missionStatus ?? "").toLowerCase();
  const planned = st === "planned";
  const active = st === "active";
  const complete = st === "completed" || st === "done" || st === "complete";
  const failedMission = st === "failed" || st === "cancelled";

  const mission: PipelineStageState = input.hasMission
    ? complete || active || planned
      ? "completed"
      : failedMission
        ? "failed"
        : "active"
    : "waiting";

  const plan: PipelineStageState = !input.hasMission
    ? "locked"
    : planned || active || complete
      ? planned
        ? "waiting"
        : "completed"
      : failedMission
        ? "failed"
        : "locked";

  const approval: PipelineStageState =
    input.awaitingApproval > 0
      ? "waiting"
      : planned
        ? "waiting"
        : active || complete
          ? "completed"
          : input.hasMission
            ? "locked"
            : "locked";

  const execution: PipelineStageState =
    input.failedTasks > 0 && input.runningTasks === 0 && !complete && active
      ? "failed"
      : input.runningTasks > 0
        ? "active"
        : complete || input.completedTasks > 0
          ? "completed"
          : "locked";

  const proof: PipelineStageState =
    input.completedTasks > 0
      ? "completed"
      : input.runningTasks > 0
        ? "active"
        : "locked";

  const results: PipelineStageState =
    input.actualRevenue > 0
      ? "completed"
      : complete
        ? "waiting"
        : active
          ? "active"
          : "locked";

  const grow: PipelineStageState =
    input.customers > 0 || input.actualRevenue > 0
      ? "completed"
      : results === "completed" || complete
        ? "waiting"
        : "locked";

  return [
    {
      id: "mission",
      label: "Mission",
      state: mission,
      detail: input.hasMission ? "Goal on record" : "Tell Atlas what to achieve",
    },
    {
      id: "plan",
      label: "Atlas plan",
      state: plan,
      detail: planned ? "Review before start" : active || complete ? "Plan filed" : undefined,
    },
    {
      id: "approval",
      label: "Founder approval",
      state: approval,
      detail:
        input.awaitingApproval > 0
          ? `${input.awaitingApproval} waiting`
          : planned
            ? "Approve to execute"
            : undefined,
    },
    {
      id: "execution",
      label: "AI execution",
      state: execution,
      detail:
        input.runningTasks > 0
          ? `${input.runningTasks} in flight`
          : input.failedTasks > 0
            ? `${input.failedTasks} failed`
            : undefined,
    },
    {
      id: "proof",
      label: "Proof of work",
      state: proof,
      detail: input.completedTasks > 0 ? `${input.completedTasks} recorded` : undefined,
    },
    {
      id: "results",
      label: "Results",
      state: results,
      detail:
        input.actualRevenue > 0
          ? "Settled revenue on ledger"
          : "Actual only — never projected",
    },
    {
      id: "grow",
      label: "Reinvest / grow",
      state: grow,
      detail: input.customers > 0 ? `${input.customers} customers` : "Next mission",
    },
  ];
}
