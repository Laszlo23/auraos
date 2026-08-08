import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Coins, Flame, Loader2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { Chip, Meter, PageHeader, Panel, Pulse } from "@/components/aura/primitives";
import { useCompany } from "@/hooks/use-aura";
import {
  MILESTONE_KINDS,
  useChallenges,
  useCheer,
  useCompleteChallenge,
  useCompletions,
  useEnterSeason,
  useLeaderboard,
  useMilestones,
  useMyEntry,
  usePostMilestone,
  useRecomputeScore,
  useSeason,
  useStake,
  useStakes,
} from "@/hooks/use-contest";
import { useAwardXp } from "@/hooks/use-progress";
import { num } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/plans";
import { daysLeft } from "@/lib/subscription";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/arena")({
  head: () => ({
    meta: [
      { title: "Arena — the gamified startup season | Aura OS" },
      {
        name: "description",
        content:
          "Enter the season, ship milestones in public, clear challenges and let backers stake AURA on your autonomous company.",
      },
      { property: "og:title", content: "Arena — the gamified startup season" },
      {
        property: "og:description",
        content: "Build in public. Earn AURA. Climb the founder leaderboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArenaPage,
});

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <span className="num font-semibold">{value.toFixed(0)}</span>
      </div>
      <Meter value={max > 0 ? (value / max) * 100 : 0} />
    </div>
  );
}

function ArenaPage() {
  const { data: company } = useCompany();
  const { data: season } = useSeason();
  const { data: entry } = useMyEntry(season?.id);
  const { data: board = [] } = useLeaderboard(season?.id, 12);
  const { data: challenges = [] } = useChallenges(season?.id);
  const { data: completions = [] } = useCompletions();
  const { data: stakes = [] } = useStakes(season?.id);
  const { data: feed = [] } = useMilestones({ limit: 12 });

  const enter = useEnterSeason();
  const recompute = useRecomputeScore();
  const complete = useCompleteChallenge();
  const post = usePostMilestone();
  const cheer = useCheer();
  const stake = useStake();
  const award = useAwardXp();

  const [pitch, setPitch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<string>("build");
  const [burst, setBurst] = useState(0);
  const [xp, setXp] = useState<{ label: string; amount: number } | null>(null);

  const celebrate = (label: string, amount: number, quest?: string) => {
    setBurst((n) => n + 1);
    setXp({ label, amount });
    setTimeout(() => setXp(null), 2400);
    award.mutate(quest ? { amount, quest } : { amount });
  };

  const rank = entry ? board.findIndex((e) => e.id === entry.id) + 1 : 0;
  const topScore = board[0]?.total_score ?? 1;
  const stakedByMe = new Map(stakes.map((s) => [s.entry_id, s.amount]));

  return (
    <div className="space-y-5">
      <Celebrate trigger={burst} />
      <XpToast label={xp?.label ?? ""} amount={xp?.amount ?? 0} show={Boolean(xp)} />

      <PageHeader
        eyebrow="Contest"
        title={season?.name ?? "Season loading"}
        description={season?.theme ?? "Build an autonomous company in public."}
        actions={
          <>
            <Chip tone="gold">
              <Coins className="h-3 w-3" /> {num(season?.prize_pool ?? 0)} {TOKEN_SYMBOL}
            </Chip>
            <Chip>
              <Pulse /> {daysLeft(season?.ends_at)} days left
            </Chip>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          {!entry ? (
            <Panel label="Enter the season" glow>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{season?.rules}</p>
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                rows={3}
                placeholder="In one paragraph: what is your company building, and why now?"
                className="glass-soft mt-4 w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              />
              <button
                disabled={pitch.trim().length < 20 || enter.isPending || !season}
                onClick={async () => {
                  try {
                    await enter.mutateAsync({ seasonId: season!.id, pitch });
                    celebrate("Entered the season", 250, "contest:enter");
                  } catch {
                    toast.error("Could not enter the season.");
                  }
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {enter.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trophy className="h-3.5 w-3.5" />
                )}
                Enter season
              </button>
            </Panel>
          ) : (
            <Panel
              label="Your standing"
              glow
              action={
                <button
                  onClick={() => recompute.mutate(entry.id)}
                  className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
                >
                  {recompute.isPending ? "syncing…" : "resync"}
                </button>
              }
            >
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    rank
                  </p>
                  <p className="num text-5xl font-semibold tracking-tight">
                    {rank > 0 ? `#${rank}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    score
                  </p>
                  <p className="num text-3xl font-semibold tracking-tight text-primary">
                    {entry.total_score.toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    backed
                  </p>
                  <p className="num text-3xl font-semibold tracking-tight text-gold">
                    {num(entry.staked_total)}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ScoreBar label="Build" value={entry.build_score} max={topScore} />
                <ScoreBar label="Revenue" value={entry.revenue_score} max={topScore} />
                <ScoreBar label="Community" value={entry.community_score} max={topScore} />
                <ScoreBar label="Momentum" value={entry.momentum_score} max={topScore} />
              </div>
            </Panel>
          )}

          <Panel label="Ship in public" delay={0.05}>
            <div className="flex flex-wrap gap-1.5">
              {MILESTONE_KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                    kind === k
                      ? "bg-primary/15 text-primary"
                      : "bg-foreground/6 text-muted-foreground",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Milestone headline"
              className="glass-soft mt-3 w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="What changed, and what did it teach you?"
              className="glass-soft mt-2 w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <button
              disabled={title.trim().length < 4 || post.isPending || !company}
              onClick={async () => {
                try {
                  await post.mutateAsync({ kind, title, body });
                  setTitle("");
                  setBody("");
                  if (entry) recompute.mutate(entry.id);
                  celebrate("Milestone shipped", 120, "contest:milestone");
                } catch {
                  toast.error("Could not post that milestone.");
                }
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {post.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Post milestone
            </button>
          </Panel>

          <Panel label="Season challenges" bodyClassName="p-0" delay={0.1}>
            {challenges.map((c) => {
              const done = completions.includes(c.id);
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border/40 px-5 py-3.5 last:border-0"
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-2xl",
                      done ? "bg-primary/14 text-primary" : "bg-foreground/6 text-muted-foreground",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-[180px] flex-1">
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="text-[12px] text-muted-foreground">{c.brief}</p>
                  </div>
                  <span className="num text-[11px] text-gold">
                    +{num(c.token_reward)} {TOKEN_SYMBOL}
                  </span>
                  {done ? (
                    <Chip tone="primary">cleared</Chip>
                  ) : (
                    <button
                      onClick={async () => {
                        await complete.mutateAsync(c);
                        if (entry) recompute.mutate(entry.id);
                        celebrate(c.title, c.xp_reward, `contest:${c.code}`);
                      }}
                      className="rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Claim
                    </button>
                  )}
                </div>
              );
            })}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            label="Leaderboard"
            bodyClassName="p-0"
            delay={0.05}
            action={
              <Link
                to="/leaderboard"
                className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
              >
                public
              </Link>
            }
          >
            {board.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-muted-foreground">
                No entries yet. Be the first company on the board.
              </p>
            ) : (
              board.map((e, i) => {
                const mine = e.company_id === company?.id;
                const backed = stakedByMe.get(e.id);
                return (
                  <div
                    key={e.id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 border-b border-border/40 px-5 py-3 last:border-0",
                      mine && "bg-primary/5",
                    )}
                  >
                    <span className="num w-6 shrink-0 text-[13px] text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-foreground/6 text-sm">
                      {e.handles?.avatar ?? e.companies?.emoji ?? "◎"}
                    </span>
                    <div className="min-w-[120px] flex-1">
                      <p className="truncate text-[13px] font-semibold">
                        {e.companies?.name ?? "Stealth company"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {e.handles ? `@${e.handles.handle}` : "unclaimed handle"}
                      </p>
                    </div>
                    <span className="num text-[13px] font-semibold text-primary">
                      {e.total_score.toFixed(0)}
                    </span>
                    {!mine && season && (
                      <button
                        onClick={async () => {
                          await stake.mutateAsync({
                            seasonId: season.id,
                            entryId: e.id,
                            amount: (backed ?? 0) + 500,
                          });
                          celebrate("Backed a founder", 80, "contest:back_a_founder");
                        }}
                        className={cn(
                          "rounded-2xl px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                          backed
                            ? "bg-gold/15 text-gold"
                            : "bg-foreground/8 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {backed ? `${num(backed)} backed` : "Back +500"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </Panel>

          <Panel label="Build in public" bodyClassName="p-0" delay={0.1}>
            {feed.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-muted-foreground">
                The feed is quiet. Ship the first milestone of the season.
              </p>
            ) : (
              feed.map((m) => (
                <div key={m.id} className="border-b border-border/40 px-5 py-3.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {m.handles?.avatar ?? m.companies?.emoji ?? "◎"}
                    </span>
                    <span className="truncate text-[12px] font-semibold">
                      {m.handles ? `@${m.handles.handle}` : (m.companies?.name ?? "founder")}
                    </span>
                    <span className="rounded-full bg-foreground/6 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      {m.kind}
                    </span>
                    <button
                      onClick={() => cheer.mutate(m.id)}
                      className="num ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-gold"
                    >
                      <Flame className="h-3 w-3" /> {m.cheers}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold">{m.title}</p>
                  {m.body ? (
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {m.body}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
