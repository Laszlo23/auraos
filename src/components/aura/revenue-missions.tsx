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
import { parseMissionBrief } from "@/lib/revenue-mission-brief";
import { useAwardXp } from "@/hooks/use-progress";
import { useCompany } from "@/hooks/use-aura";

type Phase = "idle" | "briefing" | "building" | "planned" | "starting";

export function RevenueMissionsBand() {
  const qc = useQueryClient();
  const award = useAwardXp();
  const { data: company } = useCompany();
  const [goal, setGoal] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [revealStep, setRevealStep] = useState(0);
  const [draft, setDraft] = useState<RevenueMissionRow | null>(null);
  const [targetUsdc, setTargetUsdc] = useState(1000);
  const [budgetUsdc, setBudgetUsdc] = useState(50);
  const [timelineDays, setTimelineDays] = useState(30);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [ackedDecisions, setAckedDecisions] = useState<Record<string, boolean>>({});
  const [ackedFeasibility, setAckedFeasibility] = useState(false);

  useEffect(() => {
    try {
      const draftGoal = sessionStorage.getItem("aura_mission_draft");
      if (draftGoal) {
        setGoal(draftGoal);
        sessionStorage.removeItem("aura_mission_draft");
        applyBrief(draftGoal);
        setPhase("briefing");
      }
    } catch {
      /* ignore */
    }
  }, []);

  function applyBrief(text: string) {
    const brief = parseMissionBrief(text);
    setTargetUsdc(brief.targetUsdc);
    setBudgetUsdc(brief.budgetUsdc);
    setTimelineDays(brief.timelineDays);
    setRisk(brief.risk);
  }

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["revenue-missions"],
    queryFn: () => listRevenueMissions(),
    staleTime: 10_000,
  });

  const active = useMemo(
    () => missions.find((m) => m.status === "active") ?? missions[0] ?? null,
    [missions],
  );

  const deadlineAt = useMemo(
    () => new Date(Date.now() + timelineDays * 24 * 60 * 60 * 1000).toISOString(),
    [timelineDays],
  );

  const createMut = useMutation({
    mutationFn: () =>
      createRevenueMission({
        data: {
          goal,
          targetUsdc,
          budgetUsdc,
          deadlineAt,
          risk,
        },
      }),
    onMutate: () => {
      setPhase("building");
      setRevealStep(0);
      setAckedDecisions({});
      setAckedFeasibility(false);
    },
    onSuccess: async (mission) => {
      setDraft(mission);
      setRevealStep(1);
      await award.mutateAsync({ quest: "mission:created", amount: 40 });
      window.setTimeout(() => setRevealStep(2), 900);
      window.setTimeout(() => setRevealStep(3), 1800);
      window.setTimeout(() => {
        setRevealStep(4);
        setPhase("planned");
      }, 2800);
      qc.invalidateQueries({ queryKey: ["revenue-missions"] });
      toast.success("Plan ready — read it with Atlas, then start when you agree.");
    },
    onError: (e: Error) => {
      setPhase("briefing");
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
  const plan = draft?.plan;
  const decisions = plan?.founder_decisions ?? [];
  const allDecisionsAcked =
    decisions.length === 0 || decisions.every((d) => ackedDecisions[d.id]);
  const needsFeasibilityAck =
    plan?.feasibility === "stretch" || plan?.feasibility === "unlikely";
  const canStart =
    draft?.status === "planned" &&
    allDecisionsAcked &&
    (!needsFeasibilityAck || ackedFeasibility);

  const agents = Object.keys(
    draft?.agents_status ||
      draft?.plan?.steps?.reduce(
        (acc, s) => {
          acc[s.agent] = "waiting";
          return acc;
        },
        {} as Record<string, string>,
      ) ||
      {},
  );

  function openBriefing() {
    if (goal.trim().length < 8) {
      toast.error("Describe the outcome in a sentence or two.");
      return;
    }
    applyBrief(goal);
    setPhase("briefing");
    setDraft(null);
  }

  return (
    <div className="space-y-5">
      <Panel label="Revenue Missions" glow delay={0.01}>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          You set the goal and the constraints. Atlas drafts a plan you can challenge — then you
          start. Settled USDC only from the ledger; everything else is labeled projected. Autonomy:{" "}
          {autonomyLabel(company?.autonomy)}.
        </p>

        <label className="mt-5 block">
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            What do you want your company to achieve?
          </span>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder='e.g. "Make €1,000 this week with trading — I will deposit €10"'
            aria-label="Revenue mission goal"
            disabled={phase === "building" || phase === "starting"}
            className="mt-2 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40 disabled:opacity-60"
          />
        </label>

        {phase === "idle" || phase === "briefing" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {phase === "idle" ? (
              <button
                type="button"
                disabled={goal.trim().length < 8}
                onClick={openBriefing}
                className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                Review with Atlas
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={createMut.isPending}
                  onClick={() => createMut.mutate()}
                  className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Build the plan
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("idle")}
                  className="rounded-2xl border border-border px-5 py-2.5 text-xs font-semibold text-muted-foreground"
                >
                  Edit goal
                </button>
              </>
            )}
          </div>
        ) : null}

        {phase === "briefing" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4 border-t border-border/50 pt-5"
          >
            <p className="text-sm font-medium text-primary">Before we plan — confirm the numbers.</p>
            <p className="text-[13px] text-muted-foreground">
              Atlas read your goal. Adjust anything that looks wrong; this becomes the brief the
              company works from.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <BriefField
                label="Target"
                suffix="USDC"
                value={targetUsdc}
                onChange={setTargetUsdc}
                min={1}
              />
              <BriefField
                label="Your deposit / capital"
                suffix="USDC"
                value={budgetUsdc}
                onChange={setBudgetUsdc}
                min={0}
              />
              <BriefField
                label="Timeline"
                suffix="days"
                value={timelineDays}
                onChange={setTimelineDays}
                min={1}
                max={365}
              />
              <label className="glass-soft block rounded-2xl p-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Risk appetite
                </span>
                <select
                  value={risk}
                  onChange={(e) => setRisk(e.target.value as "low" | "medium" | "high")}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  aria-label="Risk appetite"
                >
                  <option value="low">Low — protect capital</option>
                  <option value="medium">Medium — balanced</option>
                  <option value="high">High — stretch for target</option>
                </select>
              </label>
            </div>
            {budgetUsdc > 0 && targetUsdc / budgetUsdc >= 10 && timelineDays <= 14 && (
              <p className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-[13px] text-foreground/90">
                Heads-up: ~{(targetUsdc / budgetUsdc).toFixed(0)}× in {timelineDays} days is extreme
                (especially for trading). Atlas will still draft a plan — expect an honest
                feasibility call, not a guarantee.
              </p>
            )}
          </motion.div>
        )}

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
                <p className="text-sm font-medium text-primary">
                  Understood — target {currency(draft.target_usdc)}, capital{" "}
                  {currency(Number(draft.budget_usdc ?? plan?.capital_usdc ?? 0))}, ~
                  {plan?.timeline_days ?? timelineDays} days.
                </p>
              )}
              {revealStep >= 2 && (
                <div className="flex flex-wrap gap-2">
                  {agents.map((name) => (
                    <Chip key={name} tone="primary">
                      {AGENT_ROSTER[name]?.avatar ?? "·"} {name} · on the brief
                    </Chip>
                  ))}
                  {plan?.feasibility && (
                    <Chip
                      tone={
                        plan.feasibility === "realistic"
                          ? "primary"
                          : plan.feasibility === "stretch"
                            ? "gold"
                            : "gold"
                      }
                    >
                      {plan.feasibility}
                    </Chip>
                  )}
                </div>
              )}
              {revealStep >= 3 && plan && (
                <>
                  <p className="text-sm font-medium">Here is the plan for you to own.</p>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{plan.summary}</p>
                  {plan.feasibility_note && (
                    <p className="rounded-2xl border border-border/60 bg-foreground/[0.03] px-4 py-3 text-[13px]">
                      <span className="font-semibold capitalize">{plan.feasibility}</span>
                      {" — "}
                      {plan.feasibility_note}
                    </p>
                  )}
                  {plan.path_to_target && (
                    <p className="text-[13px]">
                      <span className="text-muted-foreground">Path to target · </span>
                      {plan.path_to_target}
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MiniStat label="Target" value={currency(draft.target_usdc)} hint="goal amount" />
                    <MiniStat
                      label="Est. cost"
                      value={`${draft.projected?.cost_aura ?? 0} AURA`}
                      hint={`+ ${currency(draft.projected?.cost_usdc ?? 0)} capital · projected`}
                    />
                    <MiniStat
                      label="Projected revenue"
                      value={currency(draft.projected?.revenue_usdc ?? 0)}
                      hint="projected — not settled"
                    />
                    <MiniStat
                      label="Offer math"
                      value={`${currency(plan.price_usdc)} × ${plan.customers_needed}`}
                      hint={plan.offer}
                    />
                  </div>
                </>
              )}
              {revealStep >= 4 && plan && (
                <>
                  {((plan.assumptions?.length ?? 0) > 0 || (plan.risks?.length ?? 0) > 0) && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="glass-soft rounded-2xl p-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          Assumptions
                        </p>
                        <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
                          {(plan.assumptions || []).map((a) => (
                            <li key={a}>· {a}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="glass-soft rounded-2xl p-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          Risks
                        </p>
                        <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
                          {(plan.risks || []).map((a) => (
                            <li key={a}>· {a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {plan.milestones && plan.milestones.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Checkpoints with you
                      </p>
                      <ol className="mt-2 space-y-2 text-[13px]">
                        {plan.milestones.map((m) => (
                          <li key={`${m.day}-${m.label}`}>
                            <span className="font-medium">Day {m.day} · {m.label}</span>
                            <span className="text-muted-foreground"> — {m.checkpoint}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Steps
                    </p>
                    <ol className="mt-2 space-y-2.5 text-[13px]">
                      {(plan.steps || []).slice(0, 10).map((s) => (
                        <li key={s.order} className="rounded-xl border border-border/40 px-3 py-2">
                          <div>
                            <span className="text-muted-foreground">{s.order}.</span>{" "}
                            <span className="font-medium">{s.agent}</span>
                            {s.day ? (
                              <span className="text-muted-foreground"> · day {s.day}</span>
                            ) : null}{" "}
                            · {s.title}
                          </div>
                          {s.detail && (
                            <p className="mt-1 text-[12px] text-muted-foreground">{s.detail}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {decisions.length > 0 && draft.status === "planned" && (
                    <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
                      <p className="text-sm font-medium">Your calls before we start</p>
                      <p className="text-[12px] text-muted-foreground">
                        Check each item so Atlas knows you own the constraints.
                      </p>
                      {decisions.map((d) => (
                        <label
                          key={d.id}
                          className="flex cursor-pointer items-start gap-3 text-[13px]"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={Boolean(ackedDecisions[d.id])}
                            onChange={(e) =>
                              setAckedDecisions((prev) => ({
                                ...prev,
                                [d.id]: e.target.checked,
                              }))
                            }
                          />
                          <span>
                            <span className="font-medium">{d.question}</span>
                            {d.suggestion ? (
                              <span className="text-muted-foreground">
                                {" "}
                                · suggested: {d.suggestion}
                              </span>
                            ) : null}
                            {d.why ? (
                              <span className="mt-0.5 block text-[12px] text-muted-foreground">
                                {d.why}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {needsFeasibilityAck && draft.status === "planned" && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-[13px]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={ackedFeasibility}
                        onChange={(e) => setAckedFeasibility(e.target.checked)}
                      />
                      <span>
                        I understand this mission is <strong>{plan.feasibility}</strong> and that
                        projected numbers are not a promise of settled revenue.
                      </span>
                    </label>
                  )}

                  {draft.status === "planned" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={startMut.isPending || !canStart}
                        onClick={() => startMut.mutate(draft.id)}
                        className="rounded-2xl bg-foreground px-5 py-2.5 text-xs font-semibold text-background disabled:opacity-50"
                      >
                        {startMut.isPending
                          ? "Starting…"
                          : canStart
                            ? "Start mission"
                            : "Confirm your calls above"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhase("briefing");
                          setDraft(null);
                        }}
                        className="rounded-2xl border border-border px-5 py-2.5 text-xs font-semibold text-muted-foreground"
                      >
                        Revise brief
                      </button>
                    </div>
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

function BriefField({
  label,
  suffix,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="glass-soft block rounded-2xl p-3">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none"
          aria-label={label}
        />
        <span className="text-[11px] text-muted-foreground">{suffix}</span>
      </div>
    </label>
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
  const feasibility = mission.plan?.feasibility;
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
        <div className="flex flex-col items-end gap-1">
          <Chip tone={mission.status === "active" ? "primary" : "gold"}>{mission.status}</Chip>
          {feasibility && <Chip tone="gold">{feasibility}</Chip>}
        </div>
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
          {events.map(
            (e: {
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
            ),
          )}
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
