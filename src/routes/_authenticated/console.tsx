import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { ActivationChallenge } from "@/components/aura/command/activation-cta";
import { CompanyEconomicsPanel } from "@/components/aura/command/company-economics";
import { CompanyMemoryStrip } from "@/components/aura/command/company-memory";
import { FailedWorkPanel } from "@/components/aura/command/failed-work";
import { LevelProgressRail } from "@/components/aura/command/level-rail";
import { LiveCompanyActivity } from "@/components/aura/command/live-activity";
import { MissionHistoryTimeline } from "@/components/aura/command/mission-history";
import { deriveMissionPipeline, MissionPipeline } from "@/components/aura/command/mission-pipeline";
import { ProofOfWorkStrip } from "@/components/aura/command/proof-strip";
import { WorkforceBoard } from "@/components/aura/command/workforce-board";
import { SocialReplyBulkBar } from "@/components/aura/social-reply-bulk";
import { ExpandableCopy } from "@/components/aura/expandable-copy";
import { FocusCard } from "@/components/aura/focus-card";
import { FocusDeck } from "@/components/aura/focus-deck";
import { Chip, Panel, Pulse, Shimmer } from "@/components/aura/primitives";
import { DailyEngagementStrip } from "@/components/aura/daily-engagement-strip";
import { RevenueMissionsBand } from "@/components/aura/revenue-missions";
import { RevenueWallet } from "@/components/aura/revenue-wallet";
import { StartHere } from "@/components/aura/start-here";
import { StreamText } from "@/components/aura/stream-text";
import { QuestTrail } from "@/components/aura/quests";
import { MissionDetailSheet } from "@/components/aura/mission-detail-sheet";
import { COMPANY_QUESTS } from "@/lib/gamify";
import { levelFromXp, useProgress } from "@/hooks/use-progress";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { useChannels } from "@/hooks/use-connections";
import { useMailboxes } from "@/hooks/use-mailbox";
import { useSimpleMode } from "@/hooks/use-simple-mode";
import { useSubscription } from "@/hooks/use-tokens";
import { useApproveTask, useProposeNextActions, useRejectTask } from "@/lib/actions";
import { autonomyLabel } from "@/lib/company-economy";
import { getCompanyEconomy } from "@/lib/economy.functions";
import { listRevenueMissions } from "@/lib/revenue-mission.functions";
import { getSiteGrowthStats } from "@/lib/sites.functions";
import { TOKEN_SYMBOL } from "@/lib/plans";
import { compact } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/console")({
  head: () => ({
    meta: [
      { title: "Command Center — Aura OS" },
      {
        name: "description",
        content:
          "You own the company. Atlas plans. AI employees execute. Proof and settled revenue stay honest.",
      },
      { property: "og:title", content: "Command Center — Aura OS" },
      {
        property: "og:description",
        content: "Own a company. The staff just happen to be AI.",
      },
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
  performance?: number | null;
  tasks_completed?: number | null;
  credits_used?: number | null;
  revenue_generated?: number | null;
  status?: string | null;
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
  description?: string | null;
  roi: number;
  progress: number;
  result?: string | null;
  agent_id?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
};
type Knowledge = { id: string; title: string; summary: string | null };

function Home() {
  const { data: company, isLoading } = useCompany();
  const { data: economy } = useQuery({
    queryKey: ["company-economy"],
    queryFn: () => getCompanyEconomy(),
    staleTime: 15_000,
  });
  const { data: missions = [] } = useQuery({
    queryKey: ["revenue-missions"],
    queryFn: () => listRevenueMissions(),
    staleTime: 5_000,
    refetchInterval: (q) => {
      const rows = q.state.data as { status?: string }[] | undefined;
      return rows?.some((m) => m.status === "active") ? 10_000 : false;
    },
  });
  const { data: sub } = useSubscription();
  const { data: progress } = useProgress();
  const { data: agents = [] } = useCompanyTable<Agent>("agents", { orderBy: "created_at" });
  const { data: events = [] } = useCompanyTable<Event>("activity_events", {
    orderBy: "created_at",
    ascending: false,
    limit: 24,
  });
  const { data: insights = [] } = useCompanyTable<Insight>("insights");
  const { data: tasks = [] } = useCompanyTable<Task>("tasks", {
    orderBy: "created_at",
    ascending: false,
    refetchInterval: 5_000,
  });
  const { data: knowledge = [] } = useCompanyTable<Knowledge>("knowledge_items", {
    orderBy: "created_at",
    ascending: false,
    limit: 6,
  });
  const { data: channels = [] } = useChannels();
  const { data: mailboxes = [] } = useMailboxes();
  const mailboxLive = mailboxes.some((m) => m.connected);
  const { data: akquiseCampaigns = [] } = useCompanyTable<{ id: string }>("akquise_campaigns", {
    orderBy: "created_at",
    ascending: false,
    limit: 1,
  });
  const needsMailbox =
    !mailboxLive &&
    (akquiseCampaigns.length > 0 ||
      missions.some((m) => m.status === "active" || m.status === "planned"));
  const { simple } = useSimpleMode();
  const propose = useProposeNextActions();
  const approve = useApproveTask();
  const reject = useRejectTask();
  const [historyMissionId, setHistoryMissionId] = useState<string | null>(null);

  const running = tasks.filter((t) => t.status === "running" || t.status === "queued");
  const awaiting = tasks.filter((t) => t.status === "pending_approval");
  const socialAwaiting = awaiting.filter((t) => Boolean(t.result?.startsWith("social-reply:")));
  const otherAwaiting = awaiting.filter((t) => !t.result?.startsWith("social-reply:"));
  const done = tasks.filter((t) => t.status === "completed" || t.status === "done").length;
  const failedCount = tasks.filter((t) => t.status === "failed").length;
  const briefing = insights.find((i) => i.kind === "thought");
  const totals = economy?.totals;
  const lifetime = totals?.lifetime ?? 0;
  const customers = economy?.customers ?? 0;

  const focusMission = useMemo(() => {
    return (
      missions.find((m) => m.status === "active") ??
      missions.find((m) => m.status === "planned") ??
      missions[0] ??
      null
    );
  }, [missions]);

  const pipeline = useMemo(
    () =>
      deriveMissionPipeline({
        hasMission: Boolean(focusMission),
        missionStatus: focusMission?.status,
        awaitingApproval: awaiting.length,
        runningTasks: running.length,
        completedTasks: done,
        failedTasks: failedCount,
        actualRevenue: lifetime,
        customers,
      }),
    [focusMission, awaiting.length, running.length, done, failedCount, lifetime, customers],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Shimmer className="h-24" />
        <Shimmer className="h-40" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Shimmer className="h-[420px]" />
          <Shimmer className="h-[420px]" />
        </div>
      </div>
    );
  }

  const level = levelFromXp(progress?.xp ?? 0).level;
  const autonomy = economy?.autonomy ?? company?.autonomy ?? 0;
  const productHint =
    company?.strategy?.trim() ||
    company?.tagline?.trim() ||
    "Find and contact 20 qualified prospects for our offer.";

  const showApprovals = socialAwaiting.length > 0 || otherAwaiting.length > 0;
  const showMilestone = lifetime <= 0 || customers <= 0;
  const mobileLabels = [
    "Now",
    ...(showMilestone ? ["Milestone"] : []),
    "Mission",
    ...(showApprovals ? ["Approvals"] : []),
    "People",
    "Proof",
  ];

  return (
    <>
      {/* Mobile: snap focus deck — one job per viewport */}
      <FocusDeck labels={mobileLabels}>
        <FocusCard
          eyebrow={`Command · ${autonomyLabel(autonomy)}`}
          title={company?.name ?? "Your company"}
          footer={
            <Link
              to="/ceo"
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              Ask Atlas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <p className="mb-4 text-[13px] text-muted-foreground">
            You own the company. Level {level}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Snap label="Revenue" value={compactMoney(totals?.revenue ?? 0)} />
            <Snap label="Customers" value={String(customers)} />
            <Snap label="Profit" value={compactMoney(totals?.profit ?? 0)} gold />
            <Snap label="Level" value={String(level)} />
          </div>
          <div className="mt-3">
            <SiteGrowthStrip />
          </div>
        </FocusCard>

        {showMilestone ? (
          <FocusCard eyebrow="Next" title="Get energy on the right win">
            <ActivationChallenge
              revenue={lifetime}
              customers={customers}
              tasksCompleted={economy?.tasksCompleted ?? done}
              agents={economy?.agentsActive ?? agents.length}
              actions24hApprox={events.length}
              productHint={productHint}
            />
            {needsMailbox ? (
              <div className="mt-4 rounded-2xl border border-border/50 bg-foreground/[0.03] p-4">
                <p className="text-[13px] text-muted-foreground">
                  Connect mailbox before outreach sends.
                </p>
                <Link
                  to="/connect"
                  className="mt-3 inline-flex text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                >
                  Wire mailbox
                </Link>
              </div>
            ) : null}
          </FocusCard>
        ) : null}

        <FocusCard
          eyebrow="Mission"
          title="Plan → execute → proof"
          footer={
            <a
              href="#primary-mission"
              className="inline-flex rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary"
            >
              Open mission band
            </a>
          }
        >
          <MissionPipeline stages={pipeline} />
          {lifetime === 0 && done === 0 && awaiting.length === 0 && missions.length === 0 ? (
            <button
              type="button"
              onClick={() => propose.mutate()}
              disabled={propose.isPending}
              className="mt-4 w-full rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary disabled:opacity-50"
            >
              {propose.isPending ? "Proposing…" : "Propose next actions"}
            </button>
          ) : null}
        </FocusCard>

        {showApprovals ? (
          <FocusCard eyebrow="Gate" title="Needs your approval">
            <ApprovalsBody
              socialAwaiting={socialAwaiting}
              otherAwaiting={otherAwaiting}
              approve={approve}
              reject={reject}
            />
          </FocusCard>
        ) : null}

        <FocusCard eyebrow="People" title="Your AI employees">
          <WorkforceBoard agents={agents} tasks={tasks} />
        </FocusCard>

        <FocusCard
          eyebrow="Proof"
          title={briefing?.title ?? "Live company"}
          footer={
            <Link
              to="/ceo"
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              Talk to Atlas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <ExpandableCopy
            text={
              briefing?.body ??
              (lifetime === 0
                ? "Launch a mission or approve a proposal. I will not invent revenue."
                : "No new briefing filed yet — check Live activity for what the team completed.")
            }
            title={briefing?.title ?? "Atlas note"}
            maxLines={4}
          />
          <div className="mt-4">
            <LiveCompanyActivity events={events} limit={6} />
          </div>
        </FocusCard>
      </FocusDeck>

      {/* Desktop / tablet: full stacked command surface */}
      <div className="hidden space-y-6 md:block">
        {/* 1. Company header */}
        <section className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
              <Pulse /> Command center · {autonomyLabel(autonomy)}
            </p>
            <h1 className="text-gradient max-w-3xl text-3xl font-semibold leading-[1.06] md:text-4xl">
              {company?.name ?? "Your company"}
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
              You own the company. The staff just happen to be AI.
              {" · "}
              Level {level}
              {economy?.slug ? (
                <>
                  {" · "}
                  <Link
                    to="/company/$slug"
                    params={{ slug: economy.slug }}
                    className="text-primary hover:underline"
                  >
                    /company/{economy.slug}
                  </Link>
                </>
              ) : null}
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
            <Link
              to="/ceo"
              className="inline-flex items-center gap-1 rounded-2xl bg-primary/14 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              Ask Atlas <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {/* Snapshot: actual economics only */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Snap label="Revenue · actual" value={compactMoney(totals?.revenue ?? 0)} />
          <Snap label="Profit · actual" value={compactMoney(totals?.profit ?? 0)} gold />
          <Snap label="Customers · verified" value={String(customers)} />
          <Snap label="Level" value={String(level)} />
        </div>

        <DailyEngagementStrip
          streakDays={progress?.streak_days ?? 0}
          mission={focusMission}
          completedQuests={progress?.completed_quests ?? []}
          awaitingApproval={awaiting.length}
        />

        <SiteGrowthStrip />

        <ActivationChallenge
          revenue={lifetime}
          customers={customers}
          tasksCompleted={economy?.tasksCompleted ?? done}
          agents={economy?.agentsActive ?? agents.length}
          actions24hApprox={events.length}
          productHint={productHint}
        />

        {needsMailbox ? (
          <Panel label="Mailbox needed" glow delay={0.01}>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Outreach is ready, but agents have no company email yet. Connect Gmail, Outlook, or
              SMTP — drafts stay AI, every send stays your click.
            </p>
            <Link
              to="/connect"
              className="mt-4 inline-flex items-center gap-1 rounded-2xl bg-primary/14 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              Connect mailbox <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Panel>
        ) : null}

        {/* Pipeline */}
        <Panel label="Mission → execute → proof → grow" delay={0.01}>
          <p className="mb-4 text-[13px] text-muted-foreground">
            Your bottleneck is currently you — until you approve the plan.
          </p>
          <MissionPipeline stages={pipeline} />
        </Panel>

        {/* Approvals — sticky priority */}
        {showApprovals && (
          <Panel label="Needs your approval" glow delay={0.01}>
            <ApprovalsBody
              socialAwaiting={socialAwaiting}
              otherAwaiting={otherAwaiting}
              approve={approve}
              reject={reject}
            />
          </Panel>
        )}

        <FailedWorkPanel tasks={tasks} agents={agents} />

        {/* Primary mission hero */}
        <div id="primary-mission">
          <RevenueMissionsBand />
        </div>

        {simple && (
          <StartHere
            hasConnections={channels.some((c) => c.status === "connected")}
            hasInstructed={events.some((e) => e.kind === "instruction" || e.kind === "decision")}
            hasTasks={tasks.length > 0}
          />
        )}

        {lifetime === 0 && done === 0 && awaiting.length === 0 && missions.length === 0 && (
          <Panel label="Your employees are waiting" glow delay={0.01}>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Nothing happened yet. That&apos;s about to change — describe a mission above, or ask
              Atlas to propose next actions.
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <LiveCompanyActivity events={events} />
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
              {briefing?.title ??
                (lifetime === 0 ? "Waiting for your first mission" : "Latest note")}
            </h3>
            <div className="mt-3 text-[14px] leading-relaxed text-foreground/85">
              <StreamText
                text={
                  briefing?.body ??
                  (lifetime === 0
                    ? "Launch a mission or approve a proposal. I will not invent revenue."
                    : "No new briefing filed yet — check Live activity for what the team completed.")
                }
                speed={14}
              />
            </div>
          </Panel>
        </div>

        <CompanyEconomicsPanel
          totals={totals}
          customers={customers}
          auraSpentToday={economy?.auraSpentToday ?? 0}
          dailyAuraBudget={economy?.dailyAuraBudget ?? 120}
          missionBudgetUsdc={focusMission?.budget_usdc}
          activeProjectedRevenue={focusMission?.projected?.revenue_usdc}
          activeTargetUsdc={focusMission?.target_usdc}
        />

        <RevenueWallet compact />

        <WorkforceBoard agents={agents} tasks={tasks} />

        <ProofOfWorkStrip tasks={tasks} agents={agents} />

        <CompanyMemoryStrip
          facts={economy?.memory.facts ?? 0}
          decisions={economy?.memory.decisions ?? 0}
          channels={economy?.memory.interactions ?? 0}
          items={knowledge}
        />

        <MissionHistoryTimeline missions={missions} onOpen={(id) => setHistoryMissionId(id)} />

        <LevelProgressRail
          xpLevel={level}
          milestones={economy?.milestones ?? []}
          lifetimeRevenue={lifetime}
          customers={customers}
        />

        {/* Quests — wheel lives in Daily Engagement above */}
        <Panel label="Company quests" delay={0.02}>
          <QuestTrail
            quests={COMPANY_QUESTS}
            completed={new Set(progress?.completed_quests ?? [])}
          />
        </Panel>
      </div>

      {/* Mobile mission band below deck (deep work, not a focus card) */}
      <div id="primary-mission" className="mt-6 md:hidden">
        <RevenueMissionsBand />
      </div>

      <MissionDetailSheet
        missionId={historyMissionId}
        open={Boolean(historyMissionId)}
        onOpenChange={(next) => {
          if (!next) setHistoryMissionId(null);
        }}
      />
    </>
  );
}

function ApprovalsBody({
  socialAwaiting,
  otherAwaiting,
  approve,
  reject,
}: {
  socialAwaiting: Task[];
  otherAwaiting: Task[];
  approve: { isPending: boolean; mutate: (id: string) => void };
  reject: { isPending: boolean; mutate: (id: string) => void };
}) {
  return (
    <>
      {socialAwaiting.length > 0 ? (
        <div className="mb-5 space-y-3">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Comment replies — send one-by-one, or clear the queue.{" "}
            <span className="text-foreground/80">Free comments (auto)</span> lets Vela reply without
            asking next time.
          </p>
          <SocialReplyBulkBar count={socialAwaiting.length} showFreeAuto />
          <div className="space-y-3">
            {socialAwaiting.slice(0, socialAwaiting.length > 5 ? 5 : 12).map((t) => {
              const draftPreview = t.description
                ? t.description
                    .replace(/^Draft:\s*/i, "")
                    .split("\n\nOriginal:")[0]
                    ?.trim()
                : null;
              return (
                <div key={t.id} className="rounded-2xl border border-gold/30 bg-gold/5 px-3.5 py-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug">{t.title}</p>
                      {draftPreview ? (
                        <ExpandableCopy
                          text={draftPreview}
                          title={t.title}
                          maxLines={3}
                          className="mt-1.5"
                        />
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        disabled={approve.isPending || reject.isPending}
                        onClick={() => approve.mutate(t.id)}
                        className="rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold text-primary disabled:opacity-50"
                      >
                        {approve.isPending ? "…" : "Send reply"}
                      </button>
                      <button
                        type="button"
                        disabled={approve.isPending || reject.isPending}
                        onClick={() => reject.mutate(t.id)}
                        className="rounded-xl bg-foreground/6 px-3 py-1.5 text-[11px] text-muted-foreground disabled:opacity-50"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {socialAwaiting.length > 5 ? (
            <p className="text-[11px] text-muted-foreground">
              Showing 5 of {socialAwaiting.length}. Use Send all / Free comments above for the rest.
            </p>
          ) : null}
        </div>
      ) : null}

      {otherAwaiting.length > 0 ? (
        <>
          <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
            Founder gate for company work — approve here and agents execute.
          </p>
          <div className="space-y-3">
            {otherAwaiting.slice(0, 8).map((t) => {
              const draftPreview = t.description
                ? t.description
                    .replace(/^Draft:\s*/i, "")
                    .split("\n\nOriginal:")[0]
                    ?.trim()
                : null;
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-border/50 bg-foreground/[0.03] px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug">{t.title}</p>
                      {draftPreview ? (
                        <ExpandableCopy
                          text={draftPreview}
                          title={t.title}
                          maxLines={3}
                          className="mt-1.5"
                        />
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        disabled={approve.isPending || reject.isPending}
                        onClick={() => approve.mutate(t.id)}
                        className="rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold text-primary disabled:opacity-50"
                      >
                        {approve.isPending ? "…" : "Approve & run"}
                      </button>
                      <button
                        type="button"
                        disabled={approve.isPending || reject.isPending}
                        onClick={() => reject.mutate(t.id)}
                        className="rounded-xl bg-foreground/6 px-3 py-1.5 text-[11px] text-muted-foreground disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </>
  );
}

function Snap({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="glass-soft rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`num mt-1 text-2xl font-semibold ${gold ? "text-gold" : ""}`}>{value}</p>
    </div>
  );
}

function SiteGrowthStrip() {
  const { data } = useQuery({
    queryKey: ["site-growth-stats"],
    queryFn: () => getSiteGrowthStats(),
    staleTime: 30_000,
  });
  if (!data) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Snap label="Site live" value={String(data.liveSites)} />
      <Snap label="Subscribers" value={String(data.subscribers)} />
      <Snap label="Leads waiting for send" value={String(data.leadsWaiting)} />
    </div>
  );
}

function compactMoney(n: number) {
  if (n === 0) return "$0";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
