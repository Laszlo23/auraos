import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ProofOfWork } from "@/components/aura/proof-of-work";
import { ShareBar } from "@/components/aura/share";
import { Chip, Meter, PageHeader, Panel, Pulse, Shimmer } from "@/components/aura/primitives";
import { AGENT_ROSTER } from "@/lib/agent-roster";
import { currency, timeAgo } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import {
  completeRevenueMission,
  computeNextBestAction,
  deleteRevenueMission,
  evaluateRevenueMission,
  executeNextBestAction,
  getRevenueMission,
  pauseRevenueMission,
  startRevenueMission,
} from "@/lib/revenue-mission.functions";
import { useAwardXp } from "@/hooks/use-progress";
import { useCompanyTable } from "@/hooks/use-aura";

export const Route = createFileRoute("/_authenticated/missions/$id")({
  head: () => ({
    meta: [{ title: "Mission — Aura OS" }],
  }),
  component: MissionDetailPage,
});

function MissionDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const award = useAwardXp();

  const { data, isLoading } = useQuery({
    queryKey: ["revenue-mission", id],
    queryFn: () => getRevenueMission({ data: { missionId: id } }),
    refetchInterval: 10_000,
  });

  const { data: agents = [] } = useCompanyTable<{ id: string; name: string }>("agents");
  const agentName = (agentId?: string | null) =>
    agents.find((a) => a.id === agentId)?.name ?? null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["revenue-mission", id] });
    qc.invalidateQueries({ queryKey: ["revenue-missions"] });
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
      const feas = mission.plan?.feasibility ?? "plan";
      toast.success(
        `Valued · ${feas} · ${currency(mission.projected?.revenue_usdc ?? 0)} projected revenue`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteRevenueMission({ data: { missionId: id } }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["revenue-missions"] });
      toast.success("Mission deleted");
      await navigate({ to: "/missions" });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue-mission", id] }),
  });

  const complete = useMutation({
    mutationFn: () => completeRevenueMission({ data: { missionId: id } }),
    onSuccess: async (mission) => {
      await award.mutateAsync({ quest: "mission:complete", amount: 120 });
      if ((mission.actuals?.revenue_usdc ?? 0) > 0) {
        await award.mutateAsync({ quest: "mission:first_settlement", amount: 80 });
      }
      invalidate();
      toast.success("Mission complete — share card unlocked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-24" />
        <Shimmer className="h-64" />
      </div>
    );
  }

  const { mission, events, tasks } = data;
  const nba = mission.next_best_action as {
    title?: string;
    detail?: string;
    assignee?: string;
    expected_cost_aura?: number;
    expected_upside_usdc?: number;
    confidence?: number;
  };
  const progress = Math.round((mission.progress ?? 0) * 100);
  const shareUrl =
    mission.share_slug && mission.status === "complete"
      ? `${SITE_URL}/m/${mission.share_slug}`
      : null;
  const canDelete = ["planned", "paused", "failed", "draft"].includes(mission.status);
  const canEvaluate = mission.status !== "complete";
  const busy =
    start.isPending ||
    pause.isPending ||
    evaluate.isPending ||
    remove.isPending ||
    complete.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Mission #${mission.mission_number}`}
        title={mission.goal_text}
        description="Projected figures are estimates. Current progress uses settled ledger rows only."
        actions={
          <div className="flex flex-wrap gap-2">
            <Chip tone="primary">{mission.status}</Chip>
            <Link
              to="/missions"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              All missions
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Target" value={currency(mission.target_usdc)} hint="goal" />
        <Stat
          label="Current"
          value={currency(mission.actuals?.revenue_usdc ?? 0)}
          hint="actual · settled"
        />
        <Stat
          label="Projected revenue"
          value={currency(mission.projected?.revenue_usdc ?? 0)}
          hint="projected"
        />
        <Stat
          label="Projected profit"
          value={currency(mission.projected?.profit_usdc ?? 0)}
          hint="projected"
        />
      </div>

      <div>
        <Meter value={progress} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          {progress}% actual / target · 0 until a ledger settlement with source=mission
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {mission.status === "planned" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => start.mutate()}
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Start mission
          </button>
        )}
        {mission.status === "paused" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => start.mutate()}
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Resume mission
          </button>
        )}
        {mission.status === "active" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => pause.mutate()}
              className="rounded-2xl border border-border px-5 py-2.5 text-xs font-semibold"
            >
              Put on hold
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => complete.mutate()}
              className="rounded-2xl bg-foreground px-5 py-2.5 text-xs font-semibold text-background"
            >
              Mark complete
            </button>
          </>
        )}
        {canEvaluate && (
          <button
            type="button"
            disabled={busy}
            onClick={() => evaluate.mutate()}
            className="rounded-2xl border border-border px-5 py-2.5 text-xs font-semibold"
          >
            {evaluate.isPending ? "Valuing…" : "AI value this mission"}
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                !window.confirm(
                  "Delete this mission? This cannot be undone. Use this for wrong or abandoned goals.",
                )
              ) {
                return;
              }
              remove.mutate();
            }}
            className="rounded-2xl border border-destructive/40 px-5 py-2.5 text-xs font-semibold text-destructive"
          >
            Delete mission
          </button>
        )}
        {mission.status === "active" && (
          <p className="w-full text-[11px] text-muted-foreground">
            To delete an active mission, put it on hold first.
          </p>
        )}
        {shareUrl && (
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-border px-5 py-2.5 text-xs font-semibold"
          >
            Open share card
          </a>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel label="Plan">
          <p className="text-[13px] text-muted-foreground">{mission.plan?.summary}</p>
          {mission.plan?.feasibility_note && (
            <p className="mt-3 rounded-2xl border border-border/50 bg-foreground/[0.03] px-3 py-2 text-[12px]">
              <span className="font-semibold capitalize">{mission.plan.feasibility ?? "plan"}</span>
              {" — "}
              {mission.plan.feasibility_note}
            </p>
          )}
          {mission.plan?.path_to_target && (
            <p className="mt-3 text-[12px] text-muted-foreground">
              Path · {mission.plan.path_to_target}
            </p>
          )}
          <p className="mt-3 text-[12px]">
            Offer · {mission.plan?.offer} · Price · {currency(mission.plan?.price_usdc ?? 0)} ·
            Customers needed · {mission.plan?.customers_needed ?? "—"}
            {mission.plan?.capital_usdc != null && (
              <> · Capital · {currency(mission.plan.capital_usdc)}</>
            )}
            {mission.plan?.timeline_days != null && <> · {mission.plan.timeline_days}d</>}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 text-[12px]">
            <div className="rounded-xl border border-border/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Cost</p>
              <p className="font-semibold tabular-nums">
                {currency(mission.projected?.cost_usdc ?? 0)}
                {mission.projected?.cost_aura ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {mission.projected.cost_aura} AURA
                  </span>
                ) : null}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Revenue</p>
              <p className="font-semibold tabular-nums">
                {currency(mission.projected?.revenue_usdc ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Profit</p>
              <p className="font-semibold tabular-nums">
                {currency(mission.projected?.profit_usdc ?? 0)}
              </p>
            </div>
          </div>
          {mission.plan?.assumptions?.length || mission.plan?.risks?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-[12px] text-muted-foreground">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em]">Assumptions</p>
                <ul className="mt-1 space-y-1">
                  {(mission.plan?.assumptions || []).map((a) => (
                    <li key={a}>· {a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em]">Risks</p>
                <ul className="mt-1 space-y-1">
                  {(mission.plan?.risks || []).map((a) => (
                    <li key={a}>· {a}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          <ol className="mt-4 space-y-2 text-[13px]">
            {(mission.plan?.steps || []).map((s) => (
              <li key={s.order}>
                <span className="text-muted-foreground">{s.order}.</span>{" "}
                <span className="font-medium">{s.agent}</span>
                {s.day ? <span className="text-muted-foreground"> · day {s.day}</span> : null}
                {" · "}
                {s.title}
                <span className="text-muted-foreground"> · {s.kind}</span>
                {s.detail ? (
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{s.detail}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel label="Next best action">
          {nba?.title ? (
            <>
              <p className="text-sm font-semibold">{nba.title}</p>
              <p className="mt-2 text-[13px] text-muted-foreground">{nba.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip tone="primary">{nba.assignee}</Chip>
                <Chip tone="gold">
                  {nba.expected_cost_aura ?? 0} AURA · projected
                </Chip>
                <Chip tone="gold">+{currency(nba.expected_upside_usdc ?? 0)} · projected</Chip>
              </div>
              {mission.status === "active" && (
                <button
                  type="button"
                  disabled={execute.isPending}
                  onClick={() => execute.mutate()}
                  className="mt-4 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
                >
                  Execute
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => refreshNba.mutate()}
              className="text-sm font-semibold text-primary"
            >
              Compute next best action
            </button>
          )}
          <p className="mt-4 text-[11px] text-muted-foreground">
            Manual/Assisted gate execute. Supervised/Autonomous may queue under daily AURA budget.
            Email send always founder-approved.
          </p>
        </Panel>
      </div>

      <Panel label="Employees">
        <div className="flex flex-wrap gap-2">
          {Object.entries(mission.agents_status || {}).map(([name, st]) => (
            <Chip key={name} tone={st === "working" || st === "coordinating" ? "primary" : "gold"}>
              {AGENT_ROSTER[name]?.avatar ?? "·"}{" "}
              {st === "working" || st === "coordinating" ? "●" : "○"} {name} · {st}
            </Chip>
          ))}
        </div>
      </Panel>

      <Panel label="Live feed">
        <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
          <Pulse /> WHO · WHAT · WHEN · COST · RESULT
        </p>
        <ul className="space-y-3 text-[12px]">
          {(
            events as {
              id: string;
              agent_name: string;
              message: string;
              cost_aura: number;
              cost_usdc: number;
              result: string | null;
              created_at: string;
              status: string;
            }[]
          ).map((e) => (
            <li key={e.id} className="border-b border-border/40 pb-2">
              <span className="font-medium">{e.agent_name}</span>
              <span className="text-muted-foreground"> · {e.message}</span>
              <span className="text-muted-foreground"> · {timeAgo(e.created_at)}</span>
              {(e.cost_aura > 0 || e.cost_usdc > 0) && (
                <span className="text-muted-foreground">
                  {" "}
                  · {e.cost_aura > 0 ? `${e.cost_aura} AURA` : ""}
                  {e.cost_usdc > 0 ? ` ${currency(e.cost_usdc)}` : ""}
                </span>
              )}
              {e.result && <span className="text-muted-foreground"> · {e.result}</span>}
              <Chip tone={e.status === "ok" ? "primary" : "gold"}>{e.status}</Chip>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel label="Proof of work">
        <div className="grid gap-3 md:grid-cols-2">
          {(
            tasks as {
              id: string;
              title: string;
              status: string;
              result?: string | null;
              agent_id?: string | null;
              completed_at?: string | null;
              created_at?: string | null;
            }[]
          ).map((t) => (
            <ProofOfWork
              key={t.id}
              agentName={agentName(t.agent_id)}
              title={t.title}
              status={t.status}
              result={t.result}
              completedAt={t.completed_at}
              createdAt={t.created_at}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tasks and Akquise runs linked to this mission show up here.
            </p>
          )}
        </div>
        {mission.akquise_campaign_id && (
          <Link
            to="/akquise"
            className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
          >
            Open lead hunter →
          </Link>
        )}
      </Panel>

      {shareUrl && (
        <Panel label="Share">
          <p className="text-[13px] text-muted-foreground">
            Public card shows actual ledger economics for completed missions only.
          </p>
          <div className="mt-4">
            <ShareBar
              url={shareUrl}
              text={`Aura mission complete: "${mission.goal_text.slice(0, 80)}" — actual ${currency(mission.actuals?.revenue_usdc ?? 0)} USDC settled.`}
              title="Aura OS mission"
            />
          </div>
        </Panel>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="glass-soft rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
