import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { Counter } from "@/components/aura/counter";
import { Chip, DataRow, Meter, Panel, Pulse, Shimmer } from "@/components/aura/primitives";
import { RevenueMissionsBand } from "@/components/aura/revenue-missions";
import { RevenueWallet } from "@/components/aura/revenue-wallet";
import { StartHere } from "@/components/aura/start-here";
import { DailyWheel } from "@/components/aura/wheel";
import { QuestTrail } from "@/components/aura/quests";
import { COMPANY_QUESTS } from "@/lib/gamify";
import { levelFromXp, useProgress } from "@/hooks/use-progress";
import { StreamText } from "@/components/aura/stream-text";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { useChannels } from "@/hooks/use-connections";
import { useSimpleMode } from "@/hooks/use-simple-mode";
import { useSubscription } from "@/hooks/use-tokens";
import { useApproveTask, useProposeNextActions, useRejectTask } from "@/lib/actions";
import { autonomyLabel } from "@/lib/company-economy";
import { getCompanyEconomy } from "@/lib/economy.functions";
import { TOKEN_SYMBOL } from "@/lib/plans";
import { compact, currency, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/console")({
  head: () => ({
    meta: [
      { title: "Command Center — Aura OS" },
      {
        name: "description",
        content:
          "Executive command center: company P&L from the real ledger, autonomy, missions, and proof of work.",
      },
      { property: "og:title", content: "Command Center — Aura OS" },
      { property: "og:description", content: "Own the company. Watch AI employees work." },
    ],
  }),
  component: Home,
});

type Agent = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  activity: number;
  current_task: string;
  paused?: boolean;
};
type Event = {
  id: string;
  kind: string;
  message: string;
  value: number | null;
  created_at: string;
};
type Insight = { id: string; kind: string; title: string; body: string; impact: string | null };
type Task = {
  id: string;
  status: string;
  title: string;
  roi: number;
  progress: number;
  result?: string | null;
  agent_id?: string | null;
  completed_at?: string | null;
};

function Home() {
  const { data: company, isLoading } = useCompany();
  const { data: economy } = useQuery({
    queryKey: ["company-economy"],
    queryFn: () => getCompanyEconomy(),
    staleTime: 15_000,
  });
  const { data: sub } = useSubscription();
  const { data: progress } = useProgress();
  const { data: agents = [] } = useCompanyTable<Agent>("agents", { orderBy: "created_at" });
  const { data: events = [] } = useCompanyTable<Event>("activity_events", {
    orderBy: "created_at",
    ascending: false,
    limit: 12,
  });
  const { data: insights = [] } = useCompanyTable<Insight>("insights");
  const { data: tasks = [] } = useCompanyTable<Task>("tasks");
  const { data: channels = [] } = useChannels();
  const { simple } = useSimpleMode();
  const propose = useProposeNextActions();
  const approve = useApproveTask();
  const reject = useRejectTask();

  const running = tasks.filter((t) => t.status === "running" || t.status === "queued");
  const awaiting = tasks.filter((t) => t.status === "pending_approval");
  const done = tasks.filter((t) => t.status === "completed" || t.status === "done").length;
  const briefing = insights.find((i) => i.kind === "thought");
  const totals = economy?.totals;
  const isEmpty =
    (totals?.lifetime ?? 0) === 0 && done === 0 && (company?.mrr ?? 0) === 0;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Shimmer className="h-20" />
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Shimmer className="h-[520px]" />
          <Shimmer className="h-[520px]" />
        </div>
      </div>
    );
  }

  const level = levelFromXp(progress?.xp ?? 0).level;
  const autonomy = economy?.autonomy ?? company?.autonomy ?? 0;

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
            <Pulse /> Command center · {autonomyLabel(autonomy)}
          </p>
          <h1 className="text-gradient max-w-3xl text-3xl font-semibold leading-[1.06] md:text-4xl">
            {company?.name ?? "Your company"}
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            Level {level}
            {economy?.slug ? (
              <>
                {" "}
                ·{" "}
                <Link
                  to="/company/$slug"
                  params={{ slug: economy.slug }}
                  className="text-primary hover:underline"
                >
                  /company/{economy.slug}
                </Link>
              </>
            ) : null}
            {" · "}
            Numbers below are zero or backed by the company ledger.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="primary">Rep {economy?.reputation ?? "—"}</Chip>
          <Chip tone="gold">
            {compact(sub?.tokens_remaining ?? 0)} {TOKEN_SYMBOL}
          </Chip>
          <Chip tone="primary">
            Budget {economy?.auraSpentToday ?? 0}/{economy?.dailyAuraBudget ?? 120} AURA today
          </Chip>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Revenue"
          value={currency(totals?.revenue ?? 0)}
          hint="Settled USDC in"
        />
        <Stat
          label="Expenses"
          value={currency(totals?.expenses ?? 0)}
          hint="Fees + compute (USDC)"
        />
        <Stat
          label="Profit"
          value={currency(totals?.profit ?? 0)}
          hint="Revenue − outflows"
          gold
        />
        <Stat
          label="Lifetime"
          value={currency(totals?.lifetime ?? 0)}
          hint="All settled revenue"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="AI employees" value={String(economy?.agentsActive ?? agents.length)} />
        <Stat label="Tasks done" value={String(economy?.tasksCompleted ?? done)} />
        <Stat label="Customers" value={String(economy?.customers ?? 0)} />
        <Stat
          label="Memory"
          value={String(economy?.memory.facts ?? 0)}
          hint={`${economy?.memory.decisions ?? 0} decisions · ${economy?.memory.interactions ?? 0} channels`}
        />
      </div>

      <RevenueMissionsBand />

      {simple && (
        <StartHere
          hasConnections={channels.some((c) => c.status === "connected")}
          hasInstructed={events.some((e) => e.kind === "instruction" || e.kind === "decision")}
          hasTasks={tasks.length > 0}
        />
      )}

      {awaiting.length > 0 && (
        <Panel label="Needs your approval" glow delay={0.01}>
          <div className="space-y-3">
            {awaiting.slice(0, 5).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 text-[13px] font-medium">{t.title}</p>
                <button
                  type="button"
                  onClick={() => approve.mutate(t.id)}
                  className="rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold text-primary"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => reject.mutate(t.id)}
                  className="rounded-xl bg-foreground/6 px-3 py-1.5 text-[11px] text-muted-foreground"
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
          <Link
            to="/tasks"
            className="mt-4 inline-flex text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
          >
            Open task board
          </Link>
        </Panel>
      )}

      {isEmpty && awaiting.length === 0 && (
        <Panel label="Start here" glow delay={0.01}>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            No fake numbers — launch a mission above, or ask Atlas to propose next actions.
          </p>
          <button
            type="button"
            onClick={() => propose.mutate()}
            disabled={propose.isPending}
            className="mt-4 rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/22 disabled:opacity-50"
          >
            {propose.isPending ? "Proposing…" : "Propose next actions"}
          </button>
        </Panel>
      )}

      <RevenueWallet compact />

      <Panel label={simple ? "Your daily reward" : "Daily reserve drop"} glow delay={0.02}>
        <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <DailyWheel />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Spin once a day for AURA or XP. Milestone leveling below is tied to real company events
            when the ledger fills in.
          </p>
        </div>
        <div className="mt-6 border-t border-border/50 pt-5">
          <QuestTrail
            quests={COMPANY_QUESTS}
            completed={new Set(progress?.completed_quests ?? [])}
          />
        </div>
        {economy?.milestones && (
          <div className="mt-5 flex flex-wrap gap-2">
            {economy.milestones.map((m) => (
              <Chip key={m.key} tone={m.reached ? "primary" : "gold"}>
                Lv {m.level} · {m.label}
                {m.reached ? " ✓" : ""}
              </Chip>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel label="Compute & reserve" delay={0.08}>
            <DataRow
              label="Runway"
              value={
                (company?.runway_days ?? 0) > 0
                  ? `${company?.runway_days} days`
                  : "Not modeled yet"
              }
            />
            <DataRow
              label="MRR"
              value={
                (company?.mrr ?? 0) > 0 ? `$${(company?.mrr ?? 0).toLocaleString()}` : "No settlements yet"
              }
            />
            <DataRow
              label={`${TOKEN_SYMBOL} reserve`}
              value={compact(sub?.tokens_remaining ?? 0)}
              tone="gold"
            />
            <DataRow
              label="AURA spent today"
              value={`${economy?.auraSpentToday ?? 0} / ${economy?.dailyAuraBudget ?? 120}`}
            />
            <div className="mt-4">
              <Meter
                value={
                  economy
                    ? Math.min(
                        100,
                        (economy.auraSpentToday / Math.max(1, economy.dailyAuraBudget)) * 100,
                      )
                    : 0
                }
                tone="gold"
              />
            </div>
            <Link
              to="/wallet"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-foreground/8 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] hover:bg-foreground/12"
            >
              Open wallet
            </Link>
          </Panel>

          <Panel
            label="In flight"
            delay={0.1}
            action={
              <Link
                to="/tasks"
                className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
              >
                board
              </Link>
            }
          >
            <p className="num text-3xl font-semibold">
              <Counter value={running.length} />
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              queued / running
            </p>
            <div className="mt-4 space-y-3">
              {running.slice(0, 4).map((t) => (
                <div key={t.id}>
                  <div className="flex items-center gap-2 text-[12px]">
                    <Pulse />
                    <span className="min-w-0 truncate">{t.title}</span>
                  </div>
                  <div className="mt-1.5">
                    <Meter value={t.progress} />
                  </div>
                </div>
              ))}
              {running.length === 0 && (
                <p className="text-[12px] text-muted-foreground">No work in flight.</p>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            label="Atlas"
            glow
            delay={0.06}
            action={
              <Link
                to="/ceo"
                className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
              >
                talk to atlas <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          >
            <h3 className="text-xl font-semibold leading-snug">
              {briefing?.title ?? (isEmpty ? "Waiting for your first mission" : "Latest note")}
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-foreground/85">
              <StreamText
                text={
                  briefing?.body ??
                  (isEmpty
                    ? "Launch a mission or approve a proposal. I will not invent revenue."
                    : "No new briefing filed yet — check Activity for what the team completed.")
                }
                speed={14}
              />
            </p>
          </Panel>

          <Panel
            label="Activity"
            delay={0.1}
            bodyClassName="p-0"
            action={
              <span className="text-[10px] uppercase tracking-[0.18em] text-primary">live</span>
            }
          >
            <div className="max-h-[320px] divide-y divide-border/40 overflow-y-auto">
              {events.length === 0 ? (
                <p className="px-5 py-6 text-[13px] text-muted-foreground">No activity yet.</p>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 px-5 py-2.5">
                    <span className="mt-1.5">
                      <Pulse
                        tone={
                          e.kind === "revenue"
                            ? "gold"
                            : e.kind === "mission"
                              ? "primary"
                              : "muted"
                        }
                      />
                    </span>
                    <p className="min-w-0 flex-1 font-mono text-[12px] leading-relaxed text-foreground/85">
                      {e.message}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {e.value ? (
                        <span className="mr-2 text-gold">+{currency(e.value)}</span>
                      ) : null}
                      {timeAgo(e.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel
            label="Workforce"
            delay={0.14}
            action={
              <Link
                to="/agents"
                className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
              >
                view all
              </Link>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {agents.slice(0, 8).map((a) => (
                <div key={a.id} className="glass-soft rounded-2xl p-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-foreground/7 text-sm">
                      {a.avatar}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold">
                        {a.role} · {a.name}
                      </p>
                      <p className="truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {a.paused ? "paused" : a.activity > 60 ? "working" : "idle"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                    {a.current_task}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  gold,
}: {
  label: string;
  value: string;
  hint?: string;
  gold?: boolean;
}) {
  return (
    <div className="glass-soft rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`num mt-1 text-2xl font-semibold ${gold ? "text-gold" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
