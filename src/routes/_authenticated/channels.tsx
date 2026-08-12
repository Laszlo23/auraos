import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import {
  Check,
  Link2,
  Loader2,
  MessageCircle,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast as notify } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { PageHeader, Panel, Chip, Pulse, Meter, DataRow } from "@/components/aura/primitives";
import { SocialReplyBulkBar } from "@/components/aura/social-reply-bulk";
import { FarcasterPulse } from "@/components/aura/farcaster-pulse";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import {
  SOCIALS,
  SHARE_CLIP_OPTIONS,
  useConnectChannel,
  useDisconnectChannel,
  useLaunchDripStatus,
  usePublishShareClip,
  usePublishSocial,
  useSetReplyMode,
  useSocialStatus,
  useStartLaunchDrip,
  useToggleAutoPublish,
  type SocialProvider,
} from "@/hooks/use-connections";
import { useAwardXp } from "@/hooks/use-progress";
import { approveEngagementReply } from "@/lib/social.functions";
import { supabase } from "@/integrations/supabase/client";
import { compact, timeAgo } from "@/lib/format";
import { TOKEN_LAUNCH_DISPLAY } from "@/lib/site";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/_authenticated/channels")({
  head: () => ({
    meta: [
      { title: "Channels — X, Meta, LinkedIn, TikTok & Farcaster | Aura OS" },
      {
        name: "description",
        content:
          "Connect X, Meta, LinkedIn, TikTok and Farcaster in one click. Agents publish, listen, and reply in your brand voice.",
      },
      { property: "og:title", content: "Channels — social autopilot for your AI company" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ChannelsPage,
});

type Post = {
  id: string;
  provider: string;
  body: string;
  status: string;
  impressions: number;
  likes: number;
  reposts: number;
  agent_name: string | null;
  created_at: string;
  external_url: string | null;
  error: string | null;
};

type Engagement = {
  id: string;
  provider: string;
  author_handle: string | null;
  author_name: string | null;
  body: string;
  status: string;
  reply_body: string | null;
  created_at: string;
};

const META = {
  x: { name: "X", glyph: "𝕏" },
  meta: { name: "Meta", glyph: "∞" },
  linkedin: { name: "LinkedIn", glyph: "in" },
  tiktok: { name: "TikTok", glyph: "♪" },
  farcaster: { name: "Farcaster", glyph: "FC" },
} as const;

function ChannelsPage() {
  const { data: company } = useCompany();
  const qc = useQueryClient();
  const { data: statuses = [], isLoading } = useSocialStatus();
  const { data: posts = [] } = useCompanyTable<Post>("channel_posts", {
    orderBy: "created_at",
    ascending: false,
  });
  const { data: engagements = [] } = useCompanyTable<Engagement>("channel_engagements", {
    orderBy: "created_at",
    ascending: false,
  });
  const connect = useConnectChannel();
  const disconnect = useDisconnectChannel();
  const publish = usePublishSocial();
  const publishClip = usePublishShareClip();
  const setReplyMode = useSetReplyMode();
  const toggleAuto = useToggleAutoPublish();
  const award = useAwardXp();
  const { data: drip } = useLaunchDripStatus();
  const startDrip = useStartLaunchDrip();
  const xStatus = statuses.find((s) => s.provider === "x");
  const tiktokStatus = statuses.find((s) => s.provider === "tiktok");
  const metaStatus = statuses.find((s) => s.provider === "meta");

  const [pending, setPending] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<{ label: string; amount: number } | null>(null);
  const [composeProvider, setComposeProvider] = useState<SocialProvider>("x");
  const [composeBody, setComposeBody] = useState("");
  const [clipId, setClipId] = useState(SHARE_CLIP_OPTIONS[0]?.id ?? "4am");
  const [clipProvider, setClipProvider] = useState<"x" | "tiktok" | "meta">("x");
  const [composeClipId, setComposeClipId] = useState("");
  const [editing, setEditing] = useState(false);
  const DEFAULT_INSTRUCTION =
    "Publish two posts a week per channel. Never announce a restock before inventory clears fourteen days of cover. Match the brand's calm voice. Reply to comments warmly and briefly.";
  const { data: notes = [] } = useCompanyTable<{
    id: string;
    title: string;
    summary: string;
    cluster: string;
  }>("knowledge_items");
  const savedNote = notes.find((n) => n.title === "Channel standing instruction");
  const [draft, setDraft] = useState<string | null>(null);
  const instruction = draft ?? savedNote?.summary ?? DEFAULT_INSTRUCTION;

  const celebrate = (label: string, amount: number, quest: string) => {
    setBurst((n) => n + 1);
    setToast({ label, amount });
    setTimeout(() => setToast(null), 2400);
    award.mutate({ amount, quest });
  };

  const onConnect = async (provider: SocialProvider) => {
    setPending(provider);
    try {
      await connect.mutateAsync(provider);
      celebrate(`${META[provider].name} connected`, 150, `channel:${provider}`);
      notify.success(`${META[provider].name} is live — agents can publish and reply.`);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setPending(null);
    }
  };

  const saveInstruction = async () => {
    if (!company) return;
    const text = instruction.trim();
    if (!text) return;
    if (savedNote) {
      await supabase.from("knowledge_items").update({ summary: text }).eq("id", savedNote.id);
    } else {
      await supabase.from("knowledge_items").insert({
        company_id: company.id,
        title: "Channel standing instruction",
        summary: text,
        cluster: "Channels",
        source: "Founder",
      });
    }
    await qc.invalidateQueries({ queryKey: ["table", "knowledge_items"] });
    setDraft(null);
    setEditing(false);
    notify.success("Standing instruction saved for Vela & Orin.");
  };

  const byProvider = new Map(statuses.map((s) => [s.provider, s]));
  const connected = statuses.filter((s) => s.connected).length;
  const pendingEngagements = engagements.filter(
    (e) => e.status === "pending" || e.status === "drafted",
  );

  return (
    <div className="space-y-8">
      <Celebrate trigger={burst} />
      <XpToast label={toast?.label ?? ""} amount={toast?.amount ?? 0} show={Boolean(toast)} />

      <PageHeader
        eyebrow="Distribution"
        title="Channels"
        description="One click to connect X, Meta (Facebook + Instagram) or LinkedIn. Your agents publish, listen, and reply — you keep the veto."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {company?.slug ? (
              <Link
                to="/company/$slug"
                params={{ slug: company.slug }}
                className="rounded-2xl border border-border/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-primary"
              >
                Public receipts
              </Link>
            ) : null}
            <Chip tone="primary">
              <Sparkles className="h-3 w-3" /> {connected}/3 live
            </Chip>
          </div>
        }
      />

      {xStatus?.connected && xStatus.needsReconnect ? (
        <Panel label="Reconnect X for native video" glow>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Your X token is missing <span className="font-mono text-[11px]">media.write</span>.
            Reconnect once so drip posts and clip publishes can attach the MP4 — not just the watch
            link.
          </p>
          <button
            type="button"
            disabled={pending === "x"}
            onClick={() => void onConnect("x")}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            {pending === "x" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            Reconnect X
          </button>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {SOCIALS.map((s, i) => {
          const state = byProvider.get(s.id);
          const live = Boolean(state?.connected);
          return (
            <Panel key={s.id} delay={i * 0.06} label={s.name} glow={live}>
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-semibold",
                    live ? "bg-primary/14 text-primary" : "bg-foreground/6 text-muted-foreground",
                  )}
                >
                  {s.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {live ? (state?.handle ?? "Connected") : "Not connected"}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    {s.blurb}
                  </p>
                  {!state?.available ? (
                    <p className="mt-2 text-[11px] text-gold">
                      Add{" "}
                      {s.id === "meta"
                        ? "META_APP_ID / META_APP_SECRET"
                        : s.id === "tiktok"
                          ? "TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET"
                          : s.id === "farcaster"
                            ? "NEYNAR_API_KEY"
                            : `${s.id.toUpperCase()}_CLIENT_ID`}{" "}
                      in env to enable.
                    </p>
                  ) : state?.readOnly && s.id === "farcaster" ? (
                    <p className="mt-2 text-[11px] text-primary">
                      Read live via Neynar. Add NEYNAR_AGENT_ID (or FID + custody key) to cast.
                    </p>
                  ) : s.id === "linkedin" && state?.available && !state.linkedInShareReady ? (
                    <p className="mt-2 text-[11px] text-gold">
                      Connect works. Posting needs Share on LinkedIn approved, then{" "}
                      <span className="font-mono">LINKEDIN_SHARE_SCOPE=1</span> and reconnect.
                    </p>
                  ) : s.id === "linkedin" &&
                    state?.connected &&
                    state.linkedInShareReady &&
                    state.needsReconnect ? (
                    <p className="mt-2 text-[11px] text-gold">
                      Reconnect LinkedIn to pick up{" "}
                      <span className="font-mono">w_member_social</span>.
                    </p>
                  ) : s.id === "meta" && state?.connected && !state.has_instagram ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Facebook Page only — link an IG Business account on the Page for Reels.
                    </p>
                  ) : null}
                </div>
              </div>

              {live ? (
                <div className="mt-5 space-y-1">
                  <DataRow label="Audience" value={compact(state!.followers)} />
                  <DataRow label="Operated by" value={state!.agent_name ?? s.agent} />
                  {s.id === "meta" && state?.has_instagram ? (
                    <DataRow label="Instagram" value="Linked" tone="primary" />
                  ) : null}
                  <div className="pt-3">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Comment replies
                    </p>
                    <div className="flex gap-1">
                      {(
                        [
                          { mode: "off" as const, label: "Off" },
                          { mode: "draft" as const, label: "Approve" },
                          { mode: "auto" as const, label: "Free" },
                        ] as const
                      ).map(({ mode, label }) => (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={state?.reply_mode === mode}
                          onClick={() =>
                            setReplyMode.mutate(
                              { provider: s.id, mode },
                              {
                                onSuccess: () =>
                                  notify.success(
                                    mode === "auto"
                                      ? "Comments are free — agents reply automatically."
                                      : mode === "draft"
                                        ? "Each reply waits for your approval."
                                        : "Replies paused.",
                                  ),
                              },
                            )
                          }
                          className={cn(
                            "flex-1 rounded-xl px-2 py-1.5 text-[10px] transition-colors",
                            state?.reply_mode === mode
                              ? "bg-primary/14 text-primary"
                              : "bg-foreground/6 text-muted-foreground",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                      Free = no per-comment approval. Approve = draft queue.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex items-center gap-2">
                {live ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const channel = {
                          id: state!.connection_id!,
                          provider: s.id,
                          handle: state!.handle,
                          status: "connected",
                          followers: state!.followers,
                          engagement: state!.engagement,
                          reach: state!.reach,
                          auto_publish: state!.auto_publish,
                          agent_name: state!.agent_name,
                          last_sync: state!.last_sync,
                        };
                        toggleAuto.mutate(channel);
                      }}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium transition-colors",
                        state!.auto_publish
                          ? "bg-primary/14 text-primary"
                          : "bg-foreground/6 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {state!.auto_publish ? <Check className="h-3.5 w-3.5" /> : null}
                      Autopublish {state!.auto_publish ? "on" : "off"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        disconnect.mutate(s.id, {
                          onSuccess: () => notify.success(`${s.name} disconnected.`),
                        })
                      }
                      className="rounded-2xl bg-foreground/6 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onConnect(s.id)}
                    disabled={
                      !(state?.canConnect ?? state?.available) ||
                      pending === s.id ||
                      connect.isPending
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {pending === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                    {(state?.canConnect ?? state?.available)
                      ? state.needsReconnect
                        ? `Reconnect ${s.name}`
                        : `Connect ${s.name}`
                      : state?.readOnly
                        ? "Read-only (pulse below)"
                        : "Coming soon"}
                  </button>
                )}
              </div>
              {live && state?.last_sync ? (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Pulse tone="primary" /> synced {timeAgo(state.last_sync)}
                </p>
              ) : null}
            </Panel>
          );
        })}
      </div>

      <FarcasterPulse />

      {isLoading ? <p className="text-sm text-muted-foreground">Loading channels…</p> : null}

      <Panel label="Fair-launch X drip" glow>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Schedule ~2–3 posts/day through {TOKEN_LAUNCH_DISPLAY}. Each tweet is a short line + watch
          link, and when <span className="font-mono text-[11px]">media.write</span> is granted the
          worker attaches the native MP4. Connect X with OAuth (never a password). Autopublish must
          stay on for the worker to send them.
        </p>
        {!xStatus?.connected ? (
          <p className="mt-3 rounded-2xl bg-gold/10 px-3 py-2 text-[12px] text-gold">
            Connect X above first, then start the drip. Needs{" "}
            <span className="font-mono text-[11px]">X_CLIENT_ID</span> /{" "}
            <span className="font-mono text-[11px]">X_CLIENT_SECRET</span> in env.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!xStatus?.connected || startDrip.isPending}
            onClick={() =>
              startDrip.mutate(
                { enableAutoReply: true },
                {
                  onSuccess: (res) => {
                    notify.success(
                      res.created
                        ? `Queued ${res.created} posts${res.skipped ? ` (${res.skipped} already set)` : ""}.`
                        : res.skipped
                          ? "Drip already seeded — nothing new to add."
                          : "Drip ready.",
                    );
                    celebrate("Launch drip armed", 120, "channels:launch-drip");
                  },
                  onError: (e) =>
                    notify.error(e instanceof Error ? e.message : "Could not start drip"),
                },
              )
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {startDrip.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Radio className="h-3.5 w-3.5" />
            )}
            {drip?.seeded ? "Re-sync drip schedule" : "Start fair-launch drip"}
          </button>
          <Chip>
            {drip?.seeded
              ? `${drip.posts.length} in queue`
              : drip?.preview
                ? `Preview · ${drip.preview.count} slots`
                : "Not seeded"}
          </Chip>
          {xStatus?.connected ? (
            <Chip tone={xStatus.auto_publish ? "primary" : "neutral"}>
              Autopublish {xStatus.auto_publish ? "on" : "off — drip paused"}
            </Chip>
          ) : null}
        </div>
        {drip?.posts && drip.posts.length > 0 ? (
          <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto">
            {drip.posts.slice(0, 12).map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-border/40 bg-foreground/[0.03] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>{p.status}</span>
                  <span className="num normal-case tracking-normal">
                    {p.scheduled_at
                      ? new Date(p.scheduled_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-foreground/90">
                  {p.body}
                </p>
                {p.external_url ? (
                  <a
                    href={p.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-[11px] text-primary hover:underline"
                  >
                    Open on X
                  </a>
                ) : null}
                {p.error ? <p className="mt-1 text-[11px] text-destructive">{p.error}</p> : null}
              </li>
            ))}
          </ul>
        ) : drip?.preview ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Will schedule {drip.preview.count} posts
            {drip.preview.firstAt ? ` from ${new Date(drip.preview.firstAt).toLocaleString()}` : ""}
            {drip.preview.lastAt
              ? ` through ${new Date(drip.preview.lastAt).toLocaleString()}`
              : ""}
            .
          </p>
        ) : null}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel label="Compose & publish" glow>
          <p className="text-[12px] text-muted-foreground">
            Agents can also schedule from Tasks. Publish now goes live immediately.
          </p>
          <div className="mt-4 flex gap-2">
            {SOCIALS.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={!byProvider.get(s.id)?.connected}
                onClick={() => setComposeProvider(s.id)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-[11px] transition-colors disabled:opacity-40",
                  composeProvider === s.id
                    ? "bg-primary/14 text-primary"
                    : "bg-foreground/6 text-muted-foreground",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          <textarea
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
            rows={4}
            placeholder={
              composeProvider === "tiktok"
                ? "Caption for your TikTok — pick a share-kit clip below (video required)…"
                : composeProvider === "meta"
                  ? "Caption — add a share-kit clip for Instagram Reels (text-only posts go to Facebook Page)…"
                  : "What should go out…"
            }
            className="mt-3 w-full resize-none rounded-2xl bg-foreground/6 px-3.5 py-3 text-[13px] outline-none placeholder:text-muted-foreground/50"
          />
          {(composeProvider === "tiktok" ||
            composeProvider === "meta" ||
            composeProvider === "x") && (
            <select
              value={composeClipId}
              onChange={(e) => setComposeClipId(e.target.value)}
              aria-label="Optional share-kit clip"
              className="mt-3 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
            >
              <option value="">
                {composeProvider === "tiktok"
                  ? "Select share-kit clip (required for TikTok)"
                  : "Optional share-kit clip"}
              </option>
              {SHARE_CLIP_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                !composeBody.trim() ||
                publish.isPending ||
                (composeProvider === "tiktok" && !composeClipId)
              }
              onClick={() =>
                publish.mutate(
                  {
                    provider: composeProvider,
                    body: composeBody.trim(),
                    ...(composeClipId ? { sharePostId: composeClipId } : {}),
                  },
                  {
                    onSuccess: () => {
                      setComposeBody("");
                      setComposeClipId("");
                      celebrate("Published", 40, "publish:manual");
                      notify.success("Live.");
                      void fetch("/api/workers/tick", { method: "POST" });
                    },
                    onError: (e) => notify.error(e instanceof Error ? e.message : "Publish failed"),
                  },
                )
              }
              className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {publish.isPending ? "Publishing…" : "Publish now"}
            </button>
            <button
              type="button"
              disabled={
                !composeBody.trim() || !company || (composeProvider === "tiktok" && !composeClipId)
              }
              onClick={async () => {
                if (!company) return;
                const when = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                const { error } = await supabase.from("channel_posts").insert({
                  company_id: company.id,
                  provider: composeProvider,
                  body: composeBody.trim(),
                  status: "scheduled",
                  scheduled_at: when,
                  agent_name: SOCIALS.find((s) => s.id === composeProvider)?.agent ?? "Vela",
                  ...(composeClipId
                    ? { share_post_id: composeClipId, media_kind: "share_clip" }
                    : {}),
                });
                if (error) notify.error("Could not schedule.");
                else {
                  setComposeBody("");
                  setComposeClipId("");
                  notify.success("Scheduled for ~1 hour — worker will publish.");
                  void qc.invalidateQueries({ queryKey: ["table", "channel_posts"] });
                }
              }}
              className="rounded-2xl bg-foreground/6 px-4 py-2.5 text-xs font-medium text-muted-foreground"
            >
              Schedule +1h
            </button>
          </div>
        </Panel>

        <Panel label="Standing instruction" delay={0.06}>
          {editing ? (
            <>
              <textarea
                value={instruction}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                aria-label="Channel standing instruction"
                className="w-full resize-none rounded-2xl bg-foreground/6 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveInstruction()}
                  className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setEditing(false);
                  }}
                  className="rounded-2xl bg-foreground/6 px-4 py-2 text-xs"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{instruction}</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-4 text-xs text-primary"
              >
                Edit instruction
              </button>
            </>
          )}
        </Panel>
      </div>

      <Panel label="Post share-kit clip" glow>
        <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
          Native video to <strong className="text-foreground">X</strong>,{" "}
          <strong className="text-foreground">TikTok</strong>, or{" "}
          <strong className="text-foreground">Meta (IG Reels)</strong>. X needs{" "}
          <span className="font-mono text-[11px]">media.write</span>. TikTok needs your app scopes
          approved.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              { id: "x" as const, live: xStatus?.connected },
              { id: "tiktok" as const, live: tiktokStatus?.connected },
              { id: "meta" as const, live: metaStatus?.connected },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!p.live}
              onClick={() => setClipProvider(p.id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-[11px] transition-colors disabled:opacity-40",
                clipProvider === p.id
                  ? "bg-primary/14 text-primary"
                  : "bg-foreground/6 text-muted-foreground",
              )}
            >
              {p.id === "x" ? "X" : p.id === "tiktok" ? "TikTok" : "Meta / IG"}
            </button>
          ))}
        </div>
        <select
          value={clipId}
          onChange={(e) => setClipId(e.target.value)}
          aria-label="Share kit clip"
          className="w-full max-w-xl rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
        >
          {SHARE_CLIP_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={
            (clipProvider === "x" && !xStatus?.connected) ||
            (clipProvider === "tiktok" && !tiktokStatus?.connected) ||
            (clipProvider === "meta" && !metaStatus?.connected) ||
            publishClip.isPending
          }
          onClick={() =>
            publishClip.mutate(
              { sharePostId: clipId, provider: clipProvider },
              {
                onSuccess: (res) => {
                  celebrate(`Clip on ${clipProvider}`, 80, "publish:clip");
                  notify.success(res.externalUrl ? "Clip posted with video." : "Posted.");
                  if (res.externalUrl) {
                    window.open(res.externalUrl, "_blank", "noopener,noreferrer");
                  }
                },
                onError: (e) =>
                  notify.error(
                    e instanceof Error ? e.message : "Clip publish failed — check connect + scopes",
                  ),
              },
            )
          }
          className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {publishClip.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Radio className="h-3.5 w-3.5" />
          )}
          {publishClip.isPending ? "Uploading video…" : "Post clip with video"}
        </button>
        {clipProvider === "x" && xStatus?.connected && !xStatus.canPostVideo ? (
          <p className="mt-2 text-[11px] text-gold">Reconnect X above first to unlock video.</p>
        ) : null}
        {clipProvider === "tiktok" && !tiktokStatus?.connected ? (
          <p className="mt-2 text-[11px] text-gold">Connect TikTok above first.</p>
        ) : null}
        {clipProvider === "meta" && metaStatus?.connected && !metaStatus.has_instagram ? (
          <p className="mt-2 text-[11px] text-gold">
            Meta is connected without an IG Business account — Reels need Instagram linked to your
            Page.
          </p>
        ) : null}
      </Panel>

      <Panel
        label="Inbox — comments & mentions"
        action={
          <button
            type="button"
            onClick={() => {
              void fetch("/api/workers/tick", { method: "POST" }).then(() => {
                void qc.invalidateQueries({ queryKey: ["table", "channel_engagements"] });
                notify.success("Synced engagement.");
              });
            }}
            className="grid h-8 w-8 place-items-center rounded-xl bg-foreground/6"
            title="Sync now"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        }
      >
        {pendingEngagements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Quiet for now. When comments land, agents draft or send replies here.
          </p>
        ) : (
          <div className="space-y-3">
            <SocialReplyBulkBar count={pendingEngagements.length} showFreeAuto />
            {pendingEngagements.slice(0, pendingEngagements.length > 5 ? 5 : 12).map((e) => (
              <div key={e.id} className="glass-soft rounded-2xl p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <MessageCircle className="h-3 w-3 text-primary" />
                  {META[e.provider as keyof typeof META]?.name ?? e.provider}
                  <span className="opacity-50">·</span>
                  {e.author_handle ?? e.author_name ?? "someone"}
                  <Chip tone={e.status === "drafted" ? "gold" : "neutral"}>{e.status}</Chip>
                </div>
                <p className="text-[13px] leading-relaxed">{e.body}</p>
                {e.reply_body ? (
                  <p className="mt-2 rounded-xl bg-primary/8 px-3 py-2 text-[12px] text-primary">
                    Draft: {e.reply_body}
                  </p>
                ) : null}
                {e.status === "drafted" || e.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void approveEngagementReply({
                          data: {
                            engagementId: e.id,
                            ...(e.reply_body ? { reply: e.reply_body } : {}),
                          },
                        })
                          .then(() => {
                            notify.success("Reply sent.");
                            void qc.invalidateQueries({
                              queryKey: ["table", "channel_engagements"],
                            });
                          })
                          .catch((err) =>
                            notify.error(err instanceof Error ? err.message : "Reply failed"),
                          )
                      }
                      className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                    >
                      Send reply
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await supabase
                          .from("channel_engagements")
                          .update({ status: "ignored" })
                          .eq("id", e.id);
                        void qc.invalidateQueries({ queryKey: ["table", "channel_engagements"] });
                      }}
                      className="rounded-xl bg-foreground/6 px-3 py-1.5 text-[11px]"
                    >
                      Ignore
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {pendingEngagements.length > 5 ? (
              <p className="text-[11px] text-muted-foreground">
                Showing 5 of {pendingEngagements.length}. Use Send all or Free comments above.
              </p>
            ) : null}
          </div>
        )}
      </Panel>

      <Panel label="Recent posts" delay={0.08}>
        <div className="space-y-3">
          {posts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            posts.slice(0, 10).map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.5 }}
                className="glass-soft rounded-2xl p-4"
              >
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="text-primary">
                    {META[post.provider as keyof typeof META]?.glyph ?? "◎"}
                  </span>
                  {META[post.provider as keyof typeof META]?.name}
                  <span className="opacity-50">·</span>
                  {post.agent_name}
                  <Chip
                    tone={
                      post.status === "published"
                        ? "primary"
                        : post.status === "failed"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {post.status}
                  </Chip>
                </div>
                <p className="text-[13px] leading-relaxed">{post.body}</p>
                {post.error ? (
                  <p className="mt-2 text-[11px] text-destructive">{post.error}</p>
                ) : null}
                {post.external_url ? (
                  <a
                    href={post.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-[11px] text-primary"
                  >
                    View live
                  </a>
                ) : null}
              </motion.div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
