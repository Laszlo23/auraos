import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Heart, MessageCircle, Pin, Send, Sparkles } from "lucide-react";

import { PageHeader, Panel, Chip, Pulse, DataRow } from "@/components/aura/primitives";
import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { FoundingCohort } from "@/components/aura/scarcity";
import { COMMUNITY_QUESTS, QuestTrail } from "@/components/aura/quests";
import { LaunchCountdown } from "@/components/aura/launch-countdown";
import { VideoBackdrop } from "@/components/aura/video-bg";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { useAwardXp, useProgress } from "@/hooks/use-progress";
import { useNetworkTotals } from "@/hooks/use-public";
import { supabase } from "@/integrations/supabase/client";
import { SOCIAL_LINKS } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { num, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — founders running AI companies | Aura OS" },
      {
        name: "description",
        content:
          "Trade playbooks with founders whose companies run themselves. Join Discord, Telegram, X and Farcaster before fair launch.",
      },
      { property: "og:title", content: "Aura OS Community" },
      {
        property: "og:description",
        content: "Founders and agents sharing what actually compounds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

type Post = {
  id: string;
  author_name: string;
  author_role: string | null;
  avatar: string | null;
  topic: string;
  body: string;
  likes: number;
  replies: number;
  pinned: boolean;
  created_at: string;
};

const TOPICS = ["all", "playbooks", "signals", "trading", "design", "general"];

function CommunityPage() {
  const { data: company } = useCompany();
  const { data: progress } = useProgress();
  const qc = useQueryClient();
  const { data: posts = [] } = useCompanyTable<Post>("community_posts", {
    orderBy: "created_at",
    ascending: false,
  });
  const award = useAwardXp();
  const { data: network } = useNetworkTotals();
  const companiesOnline = network?.companies ?? 0;
  const [topic, setTopic] = useState("all");
  const [draft, setDraft] = useState("");
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<{ label: string; amount: number } | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const done = new Set(progress?.completed_quests ?? []);

  const visible = posts
    .filter((p) => topic === "all" || p.topic === topic)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const pop = (label: string, amount: number, quest?: string) => {
    if (quest && done.has(quest)) return;
    setBurst((n) => n + 1);
    setToast({ label, amount });
    setTimeout(() => setToast(null), 2400);
    award.mutate({ amount, quest });
  };

  const confirmSocial = (questKey: string, label: string, xp: number, socialId: string) => {
    trackTeaser("social_join", { placement: `${socialId}:community`.slice(0, 40) });
    pop(label, xp, questKey);
  };

  const like = async (post: Post) => {
    if (liked.has(post.id)) return;
    setLiked((s) => new Set(s).add(post.id));
    await supabase
      .from("community_posts")
      .update({ likes: post.likes + 1 })
      .eq("id", post.id);
    await qc.invalidateQueries({ queryKey: ["table", "community_posts"] });
    pop("Signal sent", 60, "community:first-like");
  };

  const publish = async () => {
    if (!company || draft.trim().length < 4) return;
    await supabase.from("community_posts").insert({
      company_id: company.id,
      author_name: company.name,
      author_role: "Founder",
      avatar: company.emoji,
      topic: topic === "all" ? "general" : topic,
      body: draft.trim(),
    });
    setDraft("");
    await qc.invalidateQueries({ queryKey: ["table", "community_posts"] });
    pop("Shared with the network", 120, "community:first-post");
  };

  return (
    <div className="space-y-8">
      <VideoBackdrop intensity={0.22} />
      <Celebrate trigger={burst} />
      <XpToast label={toast?.label ?? ""} amount={toast?.amount ?? 0} show={Boolean(toast)} />

      <PageHeader
        eyebrow="The network"
        title="Community"
        description="Founders whose companies run themselves — and the agents that run them. Rally Building Culture before fair launch."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="gold">
              <Pulse tone="gold" /> {num(companiesOnline)} companies online
            </Chip>
            <Chip>
              <LaunchCountdown variant="compact" showSocials={false} placement="community" />
            </Chip>
          </div>
        }
      />

      <Panel label="Rally the network" glow>
        <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
          Open each channel, then confirm — honor system XP for growing the cohort before T-0.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {SOCIAL_LINKS.map((s) => {
            const earned = done.has(s.questKey);
            return (
              <div
                key={s.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl px-3.5 py-3 sm:flex-row sm:items-center",
                  earned ? "bg-primary/10" : "bg-foreground/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{s.hint}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.label} · +{s.xp} XP
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackTeaser("social_join", {
                        placement: `${s.id}:community_open`.slice(0, 40),
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    disabled={earned}
                    onClick={() => confirmSocial(s.questKey, s.hint, s.xp, s.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary/14 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    {earned ? (
                      <>
                        <Check className="h-3 w-3" /> Done
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel label="Founder challenge" glow>
        <QuestTrail quests={COMMUNITY_QUESTS} completed={done} />
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <Panel label="Say something" glow>
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/14 text-primary">
                {company?.emoji ?? "◎"}
              </span>
              <div className="min-w-0 flex-1">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="What did your company teach you this week?"
                  className="w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
                />
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Posting to{" "}
                    <span className="text-primary">{topic === "all" ? "general" : topic}</span>
                  </span>
                  <button
                    onClick={publish}
                    disabled={draft.trim().length < 4}
                    className="ml-auto flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" /> Share
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
                  topic === t
                    ? "bg-primary/14 text-primary"
                    : "bg-foreground/5 text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {visible.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Panel bodyClassName="p-5" className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-foreground/6 text-primary">
                    {post.avatar ?? "◎"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{post.author_name}</p>
                      <span className="text-[11px] text-muted-foreground">{post.author_role}</span>
                      <span className="text-[11px] text-muted-foreground/60">
                        · {timeAgo(post.created_at)}
                      </span>
                      {post.pinned ? (
                        <Chip tone="gold" className="ml-auto">
                          <Pin className="h-3 w-3" /> pinned
                        </Chip>
                      ) : null}
                    </div>
                    <p className="mt-2.5 text-[14px] leading-relaxed">{post.body}</p>
                    <div className="mt-3.5 flex items-center gap-5 text-[12px] text-muted-foreground">
                      <button
                        onClick={() => like(post)}
                        className={cn(
                          "flex items-center gap-1.5 transition-colors hover:text-primary",
                          liked.has(post.id) && "text-primary",
                        )}
                      >
                        <Heart
                          className={cn("h-3.5 w-3.5", liked.has(post.id) && "fill-current")}
                        />
                        <span className="num">{post.likes + (liked.has(post.id) ? 1 : 0)}</span>
                      </button>
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="num">{post.replies}</span>
                      </span>
                      <Chip className="ml-auto">{post.topic}</Chip>
                    </div>
                  </div>
                </div>
              </Panel>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <Panel label="Your standing" delay={0.08} glow>
            <div className="space-y-1">
              <DataRow label="Level" value={progress?.level ?? 1} tone="primary" />
              <DataRow label="XP" value={progress?.xp ?? 0} />
              <DataRow label="Streak" value={`${progress?.streak_days ?? 1} days`} tone="gold" />
              <DataRow label="Seat" value={`#${progress?.seat_number ?? "—"}`} />
            </div>
          </Panel>

          <Panel label="Founding cohort" delay={0.12}>
            <FoundingCohort seat={progress?.seat_number} />
            <button
              onClick={() => pop("Seat claimed", 180, "community:cohort-join")}
              disabled={done.has("community:cohort-join")}
              className="mt-4 w-full rounded-2xl bg-primary/14 px-4 py-2.5 text-xs font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {done.has("community:cohort-join") ? "Seat claimed" : "Claim your founding seat"}
            </button>
          </Panel>

          <Panel label="Network signal" delay={0.16}>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Connect your channels early so agents can draft posts and replies for you to
                approve — that is how companies compound reach. Fair launch is on the public clock.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
