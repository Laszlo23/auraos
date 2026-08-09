import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Chip, Meter, Panel, Pulse, Shimmer } from "@/components/aura/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAwardXp } from "@/hooks/use-progress";
import { currency, timeAgo } from "@/lib/format";
import {
  completeRevenueMission,
  computeNextBestAction,
  evaluateRevenueMission,
  executeNextBestAction,
  getRevenueMission,
  pauseRevenueMission,
  startRevenueMission,
} from "@/lib/revenue-mission.functions";

/**
 * Closer mission peek — opens over console/missions without leaving the page.
 * Full page remains available via deep link.
 */
export function MissionDetailSheet({
  missionId,
  open,
  onOpenChange,
}: {
  missionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = missionId ?? "";
  const qc = useQueryClient();
  const award = useAwardXp();

  const { data, isLoading } = useQuery({
    queryKey: ["revenue-mission", id],
    queryFn: () => getRevenueMission({ data: { missionId: id } }),
    enabled: open && Boolean(id),
    refetchInterval: open ? 10_000 : false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["revenue-mission", id] });
    void qc.invalidateQueries({ queryKey: ["revenue-missions"] });
    void qc.invalidateQueries({ queryKey: ["table", "tasks"] });
  };

  const start = useMutation({
    mutationFn: () => startRevenueMission({ data: { missionId: id } }),
    onSuccess: async (mission) => {
      if (mission.status === "active") {
        await award.mutateAsync({ quest: "mission:started", amount: 60 });
      }
      invalidate();
      toast.success("Mission live");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pause = useMutation({
    mutationFn: () => pauseRevenueMission({ data: { missionId: id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Mission on hold");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evaluate = useMutation({
    mutationFn: () => evaluateRevenueMission({ data: { missionId: id } }),
    onSuccess: (mission) => {
      invalidate();
      toast.success(
        `Valued · ${mission.plan?.feasibility ?? "plan"} · ${currency(mission.projected?.revenue_usdc ?? 0)} projected`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const execute = useMutation({
    mutationFn: () => executeNextBestAction({ data: { missionId: id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Action dispatched");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshNba = useMutation({
    mutationFn: () => computeNextBestAction({ data: { missionId: id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["revenue-mission", id] }),
  });

  const complete = useMutation({
    mutationFn: () => completeRevenueMission({ data: { missionId: id } }),
    onSuccess: async (mission) => {
      await award.mutateAsync({ quest: "mission:complete", amount: 120 });
      if ((mission.actuals?.revenue_usdc ?? 0) > 0) {
        await award.mutateAsync({ quest: "mission:first_settlement", amount: 80 });
      }
      invalidate();
      toast.success("Mission complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mission = data?.mission;
  const events = data?.events ?? [];
  const nba = mission?.next_best_action as {
    title?: string;
    detail?: string;
    assignee?: string;
    expected_cost_aura?: number;
    expected_upside_usdc?: number;
    confidence?: number;
  } | null;
  const progress = Math.round((mission?.progress ?? 0) * 100);
  const busy =
    start.isPending ||
    pause.isPending ||
    evaluate.isPending ||
    execute.isPending ||
    complete.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[min(100vw-1.5rem,42rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4 pr-12 text-left">
          {mission ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                Mission #{mission.mission_number}
              </p>
              <DialogTitle className="mt-1 text-left text-xl leading-snug">
                {mission.goal_text}
              </DialogTitle>
              <DialogDescription className="text-left text-[12px]">
                Closer view — projected figures are estimates; progress uses settled ledger only.
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>Mission</DialogTitle>
              <DialogDescription>Loading…</DialogDescription>
            </>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {isLoading || !mission ? (
            <div className="space-y-3">
              <Shimmer className="h-16" />
              <Shimmer className="h-40" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={mission.status === "active" ? "primary" : "gold"}>{mission.status}</Chip>
                {mission.plan?.feasibility ? (
                  <Chip tone="gold">{mission.plan.feasibility}</Chip>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Mini label="Target" value={currency(mission.target_usdc)} />
                <Mini
                  label="Current"
                  value={currency(mission.actuals?.revenue_usdc ?? 0)}
                />
                <Mini
                  label="Projected"
                  value={currency(mission.projected?.revenue_usdc ?? 0)}
                />
                <Mini
                  label="Deadline"
                  value={mission.deadline_at ? timeAgo(mission.deadline_at) : "—"}
                />
              </div>

              <div>
                <Meter value={progress} />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {progress}% actual / target
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {mission.status === "planned" || mission.status === "paused" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => start.mutate()}
                    className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {mission.status === "paused" ? "Resume" : "Start mission"}
                  </button>
                ) : null}
                {mission.status === "active" ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => pause.mutate()}
                      className="rounded-2xl border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      Put on hold
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => complete.mutate()}
                      className="rounded-2xl bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-50"
                    >
                      Mark complete
                    </button>
                  </>
                ) : null}
                {mission.status !== "complete" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => evaluate.mutate()}
                    className="rounded-2xl border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    {evaluate.isPending ? "Valuing…" : "AI value"}
                  </button>
                ) : null}
              </div>

              {mission.plan?.summary ? (
                <Panel label="Plan">
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {mission.plan.summary}
                  </p>
                  {mission.plan.feasibility_note ? (
                    <p className="mt-3 rounded-xl border border-border/50 bg-foreground/[0.03] px-3 py-2 text-[12px]">
                      <span className="font-semibold capitalize">
                        {mission.plan.feasibility ?? "plan"}
                      </span>
                      {" — "}
                      {mission.plan.feasibility_note}
                    </p>
                  ) : null}
                </Panel>
              ) : null}

              <Panel label="Next best action">
                {nba?.title ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{nba.title}</p>
                    {nba.detail ? (
                      <p className="text-[12px] leading-relaxed text-muted-foreground">
                        {nba.detail}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">
                      {nba.assignee ? `${nba.assignee} · ` : ""}
                      {nba.expected_cost_aura != null
                        ? `${nba.expected_cost_aura} AURA`
                        : null}
                      {nba.expected_upside_usdc != null
                        ? ` · upside ${currency(nba.expected_upside_usdc)}`
                        : null}
                    </p>
                    {mission.status === "active" ? (
                      <button
                        type="button"
                        disabled={busy || execute.isPending}
                        onClick={() => execute.mutate()}
                        className="rounded-2xl bg-primary/14 px-4 py-2 text-xs font-semibold text-primary disabled:opacity-50"
                      >
                        {execute.isPending ? "Dispatching…" : "Execute now"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={refreshNba.isPending}
                    onClick={() => refreshNba.mutate()}
                    className="text-[12px] font-semibold text-primary"
                  >
                    {refreshNba.isPending ? "Thinking…" : "Compute next action"}
                  </button>
                )}
              </Panel>

              <Panel label="Live feed">
                <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
                  <Pulse /> Recent
                </p>
                <ul className="max-h-40 space-y-2 overflow-y-auto text-[12px]">
                  {events.length === 0 ? (
                    <li className="text-muted-foreground">Events appear as employees work…</li>
                  ) : (
                    events.slice(0, 12).map(
                      (ev: {
                        id: string;
                        agent_name?: string | null;
                        message?: string | null;
                        created_at?: string | null;
                      }) => (
                        <li key={ev.id} className="border-b border-border/40 pb-2 last:border-0">
                          <span className="font-medium">{ev.agent_name ?? "Aura"}</span>
                          <span className="text-muted-foreground"> · {ev.message}</span>
                          {ev.created_at ? (
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              {timeAgo(ev.created_at)}
                            </span>
                          ) : null}
                        </li>
                      ),
                    )
                  )}
                </ul>
              </Panel>
            </>
          )}
        </div>

        {mission ? (
          <div className="shrink-0 border-t border-border/60 px-5 py-3">
            <Link
              to="/missions/$id"
              params={{ id: mission.id }}
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
              onClick={() => onOpenChange(false)}
            >
              Open full page →
            </Link>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-foreground/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
