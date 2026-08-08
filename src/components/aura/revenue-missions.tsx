import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { Chip, Meter, Panel, Pulse } from "@/components/aura/primitives";
import { AGENT_ROSTER } from "@/lib/agent-roster";
import { autonomyLabel } from "@/lib/company-economy";
import { currency, timeAgo } from "@/lib/format";
import {
  computeNextBestAction,
  createRevenueMission,
  executeNextBestAction,
  listRevenueMissions,
  startRevenueMission,
  type RevenueMissionRow,
} from "@/lib/revenue-mission.functions";
import { useAwardXp } from "@/hooks/use-progress";
import { useCompany } from "@/hooks/use-aura";

type Phase = "idle" | "building" | "planned" | "starting";

export function RevenueMissionsBand() {
  const qc = useQueryClient();
  const award = useAwardXp();
  const { data: company } = useCompany();
  const [goal, setGoal] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [revealStep, setRevealStep] = useState(0);
  const [draft, setDraft] = useState<RevenueMissionRow | null>(null);

  useEffect(() => {
    try {
      const draftGoal = sessionStorage.getItem("aura_mission_draft");
      if (draftGoal) {
        setGoal(draftGoal);
        sessionStorage.removeItem("aura_mission_draft");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["revenue-missions"],
    queryFn: () => listRevenueMissions(),
    staleTime: 10_000,
  });

  const active = useMemo(
    () => missions.find((m) => m.status === "active") ?? missions[0] ?? null,
    [missions],
  );

  const createMut = useMutation({
    mutationFn: () => createRevenueMission({ data: { goal } }),
    onMutate: () => {
      setPhase("building");
      setRevealStep(0);
    },
    onSuccess: async (mission) => {
      setDraft(mission);
      setRevealStep(1);
      await award.mutateAsync({ quest: "mission:created", amount: 40 });
      // staged reveal
      window.setTimeout(() => setRevealStep(2), 700);
      window.setTimeout(() => {
        setRevealStep(3);
        setPhase("planned");
      }, 1400);
      qc.invalidateQueries({ queryKey: ["revenue-missions"] });
      toast.success("Mission planned — review, then start.");
    },
    onError: (e: Error) => {
      setPhase("idle");
      toast.error(e.message || "Could not plan mission");
    },
  });

  const startMut = useMutation({
    mutationFn: (missionId: string) => startRevenueMission({ data: { missionId } }),
    onMutate: () => setPhase("starting"),
    onSuccess: async (mission) => {
      setDraft(mission);
      setPhase("idle");
      setGoal("");
      await award.mutateAsync({ quest: "mission:started", amount: 60 });
      qc.invalidateQueries({ queryKey: ["revenue-missions"] });
      qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      qc.invalidateQueries({ queryKey: ["table", "agents"] });
      qc.invalidateQueries({ queryKey: ["company-economy"] });
      toast.success("Mission live — employees activating.");
    },
    onError: (e: Error) => {
      setPhase("planned");
      toast.error(e.message || "Could not start");
    },
  });

  const nbaMut = useMutation({
    mutationFn: (missionId: string) => executeNextBestAction({ data: { missionId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue-missions"] });
      qc.invalidateQueries({ queryKey: ["revenue-mission"] });
      qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      toast.success("Next action dispatched");
    },
    onError: (e: Error) => toast.error(e.message || "Execute failed"),
  });

  const refreshNba = useMutation({
    mutationFn: (missionId: string) => computeNextBestAction({ data: { missionId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue-missions"] }),
  });

  const showPlan = draft && (phase === "planned" || phase === "building" || phase === "starting");
  const agents = Object.keys(draft?.agents_status || draft?.plan?.steps?.reduce((acc, s) => {
    acc[s.agent] = "waiting";
    return acc;
  }, {} as Record<string, string>) || {});

  return (
    <div className="space-y-5">
      <Panel label="Revenue Missions" glow delay={0.01}>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Goal → strategy → execution → result. Settled USDC only from the ledger. Everything else is
          labeled projected. Autonomy: {autonomyLabel(company?.autonomy)} — Manual/Assisted gate
          execute; Supervised/Autonomous may queue under daily AURA budget. Mailbox send always needs
          you.
        </p>

        <label className="mt-5 block">
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            What do you want your company to achieve?
          </span>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder='e.g. "Make €1,000 this month selling website audits in Vienna"'
            aria-label="Revenue mission goal"
            disabled={phase === "building" || phase === "starting"}
            className="mt-2 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40 disabled:opacity-60"
          />
        </label>

        <button
          type="button"
          disabled={createMut.isPending || goal.trim().length < 8 || phase === "building"}
          onClick={() => createMut.mutate()}
          className="mt-3 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {phase === "building" ? "Building…" : "Build my mission"}
        </button>

        <AnimatePresence mode="wait">
          {(phase === "building" || showPlan) && draft && (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 space-y-4 border-t border-border/50 pt-5"
            >
              {revealStep >= 1 && (
                <p className="text-sm font-medium text-primary">Understood.</p>
              )}
              {revealStep >= 2 && (
                <div className="flex flex-wrap gap-2">
                  {agents.map((name) => (
                    <Chip key={name} tone="primary">
                      {AGENT_ROSTER[name]?.avatar ?? "·"} {name} · activating
                    </Chip>
                  ))}
                </div>
              )}
              {revealStep >= 3 && (
                <>
                  <p className="text-sm font-medium">I have a plan.</p>
                  <p className="text-[13px] text-muted-foreground">{draft.plan?.summary}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MiniStat label="Target" value={currency(draft.target_usdc)} hint="goal amount" />
                    <MiniStat
                      label="Est. cost"
                      value={`${draft.projected?.cost_aura ?? 0} AURA`}
                      hint="projected"
                    />
                    <MiniStat
                      label="Projected revenue"
                      value={currency(draft.projected?.revenue_usdc ?? 0)}
                      hint="projected"
                    />
                    <MiniStat
                      label="Projected profit"
                      value={currency(draft.projected?.profit_usdc ?? 0)}
                      hint="projected"
                    />
                  </div>
                  <ol className="space-y-2 text-[13px]">
                    {(draft.plan?.steps || []).slice(0, 8).map((s) => (
                      <li key={s.order}>
                        <span className="text-muted-foreground">{s.order}.</span>{" "}
                        <span className="font-medium">{s.agent}</span> · {s.title}
                      </li>
                    ))}
                  </ol>
                  {draft.status === "planned" && (
                    <button
                      type="button"
                      disabled={startMut.isPending}
                      onClick={() => startMut.mutate(draft.id)}
                      className="rounded-2xl bg-foreground px-5 py-2.5 text-xs font-semibold text-background disabled:opacity-50"
                    >
                      {startMut.isPending ? "Starting…" : "Start mission"}
                    </button>
                  )}
                  {draft.status !== "planned" && (
                    <Link
                      to="/missions/$id"
                      params={{ id: draft.id }}
                      className="inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
                    >
                      Open mission →
                    </Link>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      {!isLoading && missions.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {missions.slice(0, 4).map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      )}

      {active?.status === "active" && (
        <ActiveMissionStrip
          mission={active}
          onExecute={() => nbaMut.mutate(active.id)}
          onRefreshNba={() => refreshNba.mutate(active.id)}
          executing={nbaMut.isPending}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="glass-soft rounded-2xl p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function MissionCard({ mission }: { mission: RevenueMissionRow }) {
  const actual = mission.actuals?.revenue_usdc ?? 0;
  const progress = Math.round((mission.progress ?? 0) * 100);
  return (
    <Link
      to="/missions/$id"
      params={{ id: mission.id }}
      className="glass-soft block rounded-2xl p-4 transition hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Mission #{mission.mission_number}
          </p>
          <p className="mt-1 text-sm font-medium leading-snug">{mission.goal_text}</p>
        </div>
        <Chip tone={mission.status === "active" ? "primary" : "gold"}>{mission.status}</Chip>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-muted-foreground">Target</p>
          <p className="font-semibold tabular-nums">{currency(mission.target_usdc)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Current (actual)</p>
          <p className="font-semibold tabular-nums">{currency(actual)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Projected rev</p>
          <p className="tabular-nums">{currency(mission.projected?.revenue_usdc ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Deadline</p>
          <p>{mission.deadline_at ? timeAgo(mission.deadline_at) : "—"}</p>
        </div>
      </div>
      <div className="mt-3">
        <Meter value={progress} />
        <p className="mt-1 text-[10px] text-muted-foreground">
          {progress}% · actual / target (0 until ledger settlement)
        </p>
      </div>
    </Link>
  );
}

function ActiveMissionStrip({
  mission,
  onExecute,
  onRefreshNba,
  executing,
}: {
  mission: RevenueMissionRow;
  onExecute: () => void;
  onRefreshNba: () => void;
  executing: boolean;
}) {
  const { data: detail } = useQuery({
    queryKey: ["revenue-mission", mission.id],
    queryFn: async () => {
      const { getRevenueMission } = await import("@/lib/revenue-mission.functions");
      return getRevenueMission({ data: { missionId: mission.id } });
    },
    refetchInterval: 12_000,
  });

  const events = detail?.events ?? [];
  const nba = mission.next_best_action as {
    title?: string;
    detail?: string;
    assignee?: string;
    expected_cost_aura?: number;
    expected_upside_usdc?: number;
    confidence?: number;
    status?: string;
    label?: string;
  };

  useEffect(() => {
    if (mission.status === "active" && !nba?.title) onRefreshNba();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id, mission.status]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Panel label="Live feed" delay={0.02}>
        <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
          <Pulse /> Mission #{mission.mission_number}
        </p>
        <ul className="max-h-56 space-y-2 overflow-y-auto text-[12px]">
          {events.length === 0 && (
            <li className="text-muted-foreground">Events appear as employees work…</li>
          )}
          {events.map((e: {
            id: string;
            agent_name: string;
            message: string;
            cost_aura: number;
            result: string | null;
            created_at: string;
            status: string;
          }) => (
            <li key={e.id} className="border-b border-border/40 pb-2">
              <span className="font-medium">{e.agent_name}</span>
              <span className="text-muted-foreground"> · {e.message}</span>
              {e.cost_aura > 0 && (
                <span className="text-muted-foreground"> · {e.cost_aura} AURA</span>
              )}
              {e.result && <span className="text-muted-foreground"> · {e.result}</span>}
              <span className="ml-2 text-[10px] text-muted-foreground">{timeAgo(e.created_at)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(mission.agents_status || {}).map(([name, st]) => (
            <Chip key={name} tone={st === "working" || st === "coordinating" ? "primary" : "gold"}>
              {st === "working" || st === "coordinating" ? "●" : "○"} {name} · {st}
            </Chip>
          ))}
        </div>
      </Panel>

      <Panel label="Next best action" delay={0.03}>
        {nba?.title ? (
          <>
            <p className="text-sm font-semibold">{nba.title}</p>
            <p className="mt-2 text-[13px] text-muted-foreground">{nba.detail}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="primary">{nba.assignee}</Chip>
              <Chip tone="gold">{nba.expected_cost_aura ?? 0} AURA · projected</Chip>
              <Chip tone="gold">
                +{currency(nba.expected_upside_usdc ?? 0)} upside · projected
              </Chip>
              <Chip tone="primary">
                {Math.round((nba.confidence ?? 0.5) * 100)}% confidence
              </Chip>
            </div>
            <button
              type="button"
              disabled={executing}
              onClick={onExecute}
              className="mt-4 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {executing ? "Executing…" : "Execute"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onRefreshNba}
            className="text-[12px] font-semibold text-primary"
          >
            Compute next best action →
          </button>
        )}
        <Link
          to="/missions/$id"
          params={{ id: mission.id }}
          className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
        >
          Full mission detail →
        </Link>
      </Panel>
    </div>
  );
}
