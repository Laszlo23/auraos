import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Flame,
  Gamepad2,
  Heart,
  Plus,
  Send,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { Chip, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { QuestTrail, COMMUNITY_QUESTS } from "@/components/aura/quests";
import {
  useCommunityHub,
  useCompleteSquadTask,
  useCreateSquad,
  useCreateSquadTask,
  useJoinSquad,
  usePostSquadUpdate,
} from "@/hooks/use-community-hub";
import { useProgress } from "@/hooks/use-progress";
import { usePublicFeed, useNetworkTotals } from "@/hooks/use-public";
import { useUserProgress } from "@/hooks/use-user-progress";
import { SOCIAL_LINKS } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { num, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — squads, shared wins, live pulse | Aura OS" },
      {
        name: "description",
        content:
          "Form a squad, run shared tasks together, and show up on the world pulse. Gamified crew play across Aura OS.",
      },
      { property: "og:title", content: "Aura Community — work together" },
      {
        property: "og:description",
        content: "Small crews. Shared tasks. Squad XP everyone can see.",
      },
    ],
  }),
  component: CommunityHubPage,
});

function CommunityHubPage() {
  const { data: hub, isLoading } = useCommunityHub();
  const { data: network } = useNetworkTotals({ refetchInterval: 20_000 });
  const { data: publicFeed = [] } = usePublicFeed(12, { refetchInterval: 15_000 });
  const { data: progress } = useProgress();
  const { data: userProg } = useUserProgress();

  const createSquad = useCreateSquad();
  const joinSquad = useJoinSquad();
  const postUpdate = usePostSquadUpdate();
  const createTask = useCreateSquadTask();
  const completeTask = useCompleteSquadTask();

  const [squadName, setSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [postBody, setPostBody] = useState("");
  const [shareWorld, setShareWorld] = useState(true);
  const [taskTitle, setTaskTitle] = useState("");
  const [burst, setBurst] = useState(0);
  const [xpToast, setXpToast] = useState<{ label: string; amount: number } | null>(null);

  const squad = hub?.my_squad ?? null;
  const done = new Set([
    ...(progress?.completed_quests ?? []),
    ...(userProg?.completed_quests ?? []),
  ]);
  const openTasks = (hub?.tasks ?? []).filter((t) => t.status === "open");
  const doneTasks = (hub?.tasks ?? []).filter((t) => t.status === "done");

  const pop = (label: string, amount: number) => {
    setBurst((n) => n + 1);
    setXpToast({ label, amount });
    setTimeout(() => setXpToast(null), 2400);
  };

  const copyInvite = async () => {
    if (!squad?.invite_code) return;
    const url = `${window.location.origin}/community?join=${squad.invite_code}`;
    await navigator.clipboard.writeText(
      `Join my Aura squad "${squad.name}" — code ${squad.invite_code}\n${url}`,
    );
    toast.success("Invite copied — send it to your crew");
  };

  const handleCreate = async () => {
    if (squadName.trim().length < 2) return;
    try {
      const res = await createSquad.mutateAsync({ name: squadName.trim() });
      setSquadName("");
      pop("Squad founded", 100);
      toast.success(`${res.name} is live — invite code ${res.invite_code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create squad");
    }
  };

  const handleJoin = async () => {
    if (joinCode.trim().length < 6) return;
    try {
      const res = await joinSquad.mutateAsync(joinCode);
      setJoinCode("");
      pop("Joined the crew", 80);
      toast.success(`Welcome to ${res.name}`);
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      if (msg.includes("already_in_squad")) toast.error("You are already in a squad");
      else if (msg.includes("squad_full")) toast.error("That squad is full (max 8)");
      else toast.error("Invalid or expired invite code");
    }
  };

  const handlePost = async () => {
    if (!squad || postBody.trim().length < 2) return;
    try {
      await postUpdate.mutateAsync({
        squadId: squad.id,
        body: postBody.trim(),
        shareWorld,
      });
      setPostBody("");
      pop(shareWorld ? "Shared with the world" : "Posted to squad", 35);
    } catch {
      toast.error("Could not post");
    }
  };

  const handleAddTask = async () => {
    if (!squad || taskTitle.trim().length < 2) return;
    try {
      await createTask.mutateAsync({ squadId: squad.id, title: taskTitle.trim() });
      setTaskTitle("");
      toast.success("Task added — anyone in the squad can close it");
    } catch {
      toast.error("Could not add task");
    }
  };

  const handleComplete = async (taskId: string, xp: number) => {
    try {
      await completeTask.mutateAsync(taskId);
      pop("Squad task done", xp);
    } catch {
      toast.error("Task already closed");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <Celebrate trigger={burst} />
      <XpToast label={xpToast?.label ?? ""} amount={xpToast?.amount ?? 0} show={Boolean(xpToast)} />

      <PageHeader
        eyebrow="AURA Community"
        title="Work together. Level up together."
        description="Form a squad of 2–8 founders, run shared tasks, and show wins on the live pulse — the room everyone checks."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="gold">
              <Pulse tone="gold" /> {num(network?.companies ?? 0)} companies live
            </Chip>
            <Link
              to="/quest"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
            >
              <Gamepad2 className="h-3.5 w-3.5" /> Quest hub
            </Link>
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
            >
              <Trophy className="h-3.5 w-3.5" /> Standings
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {!squad && !isLoading ? (
            <Panel label="Start or join a squad" glow>
              <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">
                Squads are small crews — plan missions, close tasks, earn squad XP. Everyone sees
                the top crews on the leaderboard. You can only be in one squad at a time.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Found a crew
                  </p>
                  <input
                    value={squadName}
                    onChange={(e) => setSquadName(e.target.value)}
                    placeholder="Vienna builders, Hood crew…"
                    className="mt-3 w-full rounded-xl border border-border/50 bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-primary/50"
                  />
                  <button
                    type="button"
                    disabled={createSquad.isPending || squadName.trim().length < 2}
                    onClick={() => void handleCreate()}
                    className="mt-3 w-full rounded-2xl bg-primary py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-40"
                  >
                    Create squad · +100 XP
                  </button>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Join with code
                  </p>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="6-char code"
                    maxLength={6}
                    className="mt-3 w-full rounded-xl border border-border/50 bg-transparent px-3 py-2.5 font-mono text-[14px] uppercase tracking-[0.2em] outline-none focus:border-primary/50"
                  />
                  <button
                    type="button"
                    disabled={joinSquad.isPending || joinCode.trim().length < 6}
                    onClick={() => void handleJoin()}
                    className="mt-3 w-full rounded-2xl border border-primary/40 bg-primary/10 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary disabled:opacity-40"
                  >
                    Join squad · +80 XP
                  </button>
                </div>
              </div>
            </Panel>
          ) : null}

          {squad ? (
            <>
              <Panel label="Your squad" glow>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {squad.emoji} {squad.name}
                    </h2>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {squad.member_count}/8 members · {num(squad.squad_xp)} squad XP · you are{" "}
                      {squad.role}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyInvite()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {squad.invite_code}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(hub?.members ?? []).map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-2 rounded-2xl border border-border/40 px-3 py-2"
                      title={`Lv ${m.level} · ${m.rep} REP`}
                    >
                      <span className="text-lg">{m.avatar}</span>
                      <div>
                        <p className="text-[12px] font-semibold">{m.display_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Lv {m.level}
                          {m.role === "owner" ? " · captain" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel label="Shared tasks">
                <p className="mb-3 text-[12px] text-muted-foreground">
                  Anyone in the squad can add or complete a task — first to close it earns XP for
                  everyone&apos;s standing.
                </p>
                <div className="flex gap-2">
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ship weekly report, review proofs, onboard a local…"
                    className="min-w-0 flex-1 rounded-xl border border-border/50 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-primary/50"
                  />
                  <button
                    type="button"
                    disabled={createTask.isPending || taskTitle.trim().length < 2}
                    onClick={() => void handleAddTask()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                <ul className="mt-4 space-y-2">
                  {openTasks.length === 0 ? (
                    <li className="text-[12px] text-muted-foreground">
                      No open tasks — add one above to get the crew moving.
                    </li>
                  ) : (
                    openTasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 px-3 py-2.5"
                      >
                        <span className="text-[13px]">{t.title}</span>
                        <button
                          type="button"
                          onClick={() => void handleComplete(t.id, t.xp_reward)}
                          className="shrink-0 rounded-xl bg-primary/14 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary"
                        >
                          Done · +{t.xp_reward} XP
                        </button>
                      </li>
                    ))
                  )}
                  {doneTasks.slice(0, 4).map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 rounded-xl px-2 py-1 text-[12px] text-muted-foreground line-through opacity-70"
                    >
                      <Check className="h-3 w-3 text-primary" /> {t.title}
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel label="Squad channel">
                <textarea
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  rows={2}
                  placeholder="What are we building this week? Drop blockers, wins, links…"
                  className="w-full resize-none rounded-xl border border-border/40 bg-transparent px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-primary/40"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={shareWorld}
                      onChange={(e) => setShareWorld(e.target.checked)}
                      className="rounded border-border"
                    />
                    Share to world pulse
                  </label>
                  <button
                    type="button"
                    disabled={postUpdate.isPending || postBody.trim().length < 2}
                    onClick={() => void handlePost()}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" /> Post
                  </button>
                </div>
                <ul className="mt-5 space-y-3 border-t border-border/40 pt-4">
                  {(hub?.posts ?? []).map((p) => (
                    <li key={p.id} className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground/6">
                        {p.author_avatar}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold">
                          {p.author_name}
                          <span className="ml-2 font-normal text-muted-foreground">
                            {timeAgo(p.created_at)}
                          </span>
                          {p.share_world ? (
                            <Chip className="ml-2 inline-flex py-0 text-[9px]">World</Chip>
                          ) : null}
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed">{p.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <Panel label="Top squads" glow delay={0.02}>
            <ul className="space-y-2">
              {(hub?.top_squads ?? []).length === 0 ? (
                <li className="text-[12px] text-muted-foreground">
                  Be the first crew on the board — create a squad.
                </li>
              ) : (
                (hub?.top_squads ?? []).map((s, i) => (
                  <li
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
                      squad?.id === s.id ? "border-gold/40 bg-gold/5" : "border-border/40",
                    )}
                  >
                    <span className="num w-5 text-[12px] text-muted-foreground">{i + 1}</span>
                    <span className="text-lg">{s.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.member_count} members
                      </p>
                    </div>
                    <Chip tone="gold">{num(s.squad_xp)} XP</Chip>
                  </li>
                ))
              )}
            </ul>
          </Panel>

          <Panel label="World pulse" delay={0.04}>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Squad wins shared publicly + live network activity.
            </p>
            <ul className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
              {(hub?.world_pulse ?? []).map((p) => (
                <li key={p.id} className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-primary">
                    {p.squad_emoji} {p.squad_name}
                  </p>
                  <p className="mt-0.5 text-[12px]">
                    <span className="font-medium">{p.author_name}:</span> {p.body}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</p>
                </li>
              ))}
              {publicFeed.slice(0, 6).map((row) => (
                <li key={row.id} className="border-b border-border/30 pb-2 text-[12px] last:border-0">
                  <span className="text-muted-foreground">
                    {row.handle ? `@${row.handle}` : "Network"}
                  </span>
                  <span className="mx-1">·</span>
                  {row.title ?? row.kind}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {row.created_at ? timeAgo(row.created_at) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel label="Grow the network" delay={0.06}>
            <QuestTrail quests={COMMUNITY_QUESTS.slice(0, 4)} completed={done} />
            <div className="mt-4 grid gap-2">
              {SOCIAL_LINKS.slice(0, 2).map((s) => (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackTeaser("social_join", { placement: `community:${s.id}` })}
                  className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2 text-[12px] hover:border-primary/30"
                >
                  {s.label}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </Panel>

          <Panel label="Why squads?" delay={0.08}>
            <div className="space-y-3 text-[12px] leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Two founders ship faster than one — shared tasks keep accountability honest.
              </p>
              <p className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                Squad XP climbs the public board. REP from quests still lives on your profile.
              </p>
              <p className="flex items-start gap-2">
                <Flame className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                Post with &quot;world pulse&quot; on — that is the feed everyone wants to scroll.
              </p>
              <p className="flex items-start gap-2">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                Vienna scouts and local shops: squad up before you hit the street.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
