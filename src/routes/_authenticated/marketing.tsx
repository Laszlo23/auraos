import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo, useState, useEffect } from "react";
import {
  Brain,
  CalendarClock,
  ImagePlus,
  Lightbulb,
  Loader2,
  Megaphone,
  Sparkles,
  Video,
} from "lucide-react";

import { Chip, Meter, PageHeader, Panel, SectionTitle } from "@/components/aura/primitives";
import { Counter } from "@/components/aura/counter";
import { Spark } from "@/components/aura/spark";
import { MarketingWaveScarcity } from "@/components/aura/scarcity";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { SOCIALS, useSocialStatus } from "@/hooks/use-connections";
import { useDispatchTask } from "@/lib/actions";
import { trackAppEvent } from "@/lib/app-track";
import { compact, currency, percent } from "@/lib/format";
import {
  brainstormCampaignIdeas,
  createMarketingCampaign,
  generateMarketingImage,
  getMarketingFunnel,
  listShareClips,
  marketingImageStatus,
  scheduleMarketingPost,
  updateMarketingFunnel,
  type BrainstormIdea,
  type FunnelStage,
} from "@/lib/marketing.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing Studio — Aura OS" },
      {
        name: "description",
        content:
          "Campaigns, scheduled social posts, AI images, share-kit video, brainstorm ideas, and growth funnels.",
      },
      { property: "og:title", content: "Marketing Studio — Aura OS" },
      { property: "og:description", content: "Create campaigns, schedule posts, and ship creative." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MarketingPage,
});

type Metric = { day: string; visitors: number; revenue: number };
type Campaign = {
  id: string;
  name: string;
  channel: string;
  progress: number;
  value: number;
  roas: number;
  status: string;
  brief?: string | null;
};

type ChannelPost = {
  id: string;
  provider: string;
  body: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  campaign_key: string | null;
  external_url: string | null;
};

type TabId = "overview" | "campaigns" | "compose" | "brainstorm" | "funnels";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "campaigns", label: "Campaigns" },
  { id: "compose", label: "Compose" },
  { id: "brainstorm", label: "Brainstorm" },
  { id: "funnels", label: "Funnels" },
];

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MarketingPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const { data: company } = useCompany();
  const { data: metrics = [] } = useCompanyTable<Metric>("metrics", { orderBy: "day" });
  const { data: campaigns = [], isLoading } = useCompanyTable<Campaign>("campaigns", {
    orderBy: "created_at",
  });
  const { data: posts = [] } = useCompanyTable<ChannelPost>("channel_posts", {
    orderBy: "created_at",
  });
  const last = metrics.slice(-30);
  const dispatch = useDispatchTask();
  const qc = useQueryClient();
  const social = useSocialStatus();

  const channelMix = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of campaigns) {
      totals.set(c.channel, (totals.get(c.channel) ?? 0) + Number(c.value));
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
    return [...totals.entries()]
      .map(([name, value]) => [name, Math.round((value / sum) * 100)] as const)
      .sort((a, b) => b[1] - a[1]);
  }, [campaigns]);

  const upcoming = useMemo(
    () =>
      posts
        .filter((p) => p.status === "scheduled" || p.status === "draft")
        .slice(0, 8),
    [posts],
  );

  const toggleCampaign = async (c: Campaign) => {
    const next = c.status === "running" ? "paused" : "running";
    const { error } = await supabase
      .from("campaigns")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) {
      toast.error("Could not update campaign.");
      return;
    }
    if (next === "running") {
      dispatch.mutate({
        title: `Run campaign — ${c.name}`,
        agent: "Vela",
        priority: "medium",
        activity: `Campaign "${c.name}" marked running — Vela task queued`,
      });
    }
    trackAppEvent("campaign_toggled", {
      company_id: company?.id,
      campaign: c.name,
      status: next,
    });
    toast.success(
      next === "running"
        ? `${c.name} marked running — Vela task queued.`
        : `${c.name} paused in the database.`,
    );
    void qc.invalidateQueries({ queryKey: ["table", "campaigns"] });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marketing Studio"
        title={
          campaigns.length
            ? `${campaigns.filter((c) => c.status === "running").length} campaigns running`
            : "Build demand with proof"
        }
        description="Create campaigns, schedule social posts, generate images, attach share-kit clips, brainstorm angles, and track a simple growth funnel."
      />

      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-2xl px-4 py-2 text-xs font-semibold transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-foreground/6 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <OverviewTab
          last={last}
          channelMix={channelMix}
          campaigns={campaigns}
          upcoming={upcoming}
          onOpenCompose={() => setTab("compose")}
        />
      ) : null}
      {tab === "campaigns" ? (
        <CampaignsTab
          campaigns={campaigns}
          isLoading={isLoading}
          onToggle={toggleCampaign}
          dispatch={(name) =>
            dispatch.mutate({
              title: `Brief on ${name}`,
              agent: "Vela",
              priority: "low",
              activity: `Brief on "${name}" queued for Vela`,
            })
          }
        />
      ) : null}
      {tab === "compose" ? (
        <ComposeTab
          campaigns={campaigns}
          social={social.data ?? []}
          upcoming={upcoming}
        />
      ) : null}
      {tab === "brainstorm" ? <BrainstormTab /> : null}
      {tab === "funnels" ? <FunnelsTab /> : null}
    </div>
  );
}

function OverviewTab({
  last,
  channelMix,
  campaigns,
  upcoming,
  onOpenCompose,
}: {
  last: Metric[];
  channelMix: readonly (readonly [string, number])[];
  campaigns: Campaign[];
  upcoming: ChannelPost[];
  onOpenCompose: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="max-w-xl">
        <MarketingWaveScarcity />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="p-7">
          <SectionTitle title="Reach" hint="Visitors, last 30 days" />
          {last.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No metrics yet.</p>
          ) : (
            <>
              <div className="h-32">
                <Spark points={last.map((m) => m.visitors)} height={128} />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div>
                  <p className="num text-2xl font-semibold">
                    <Counter value={last.reduce((a, m) => a + m.visitors, 0)} format={compact} />
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Visitors
                  </p>
                </div>
                <div>
                  <p className="num text-2xl font-semibold text-gold">
                    <Counter
                      value={last.reduce((a, m) => a + m.revenue, 0)}
                      format={(n) => currency(n)}
                    />
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Attributed
                  </p>
                </div>
                <div>
                  <p className="num text-2xl font-semibold text-primary">
                    {campaigns.length
                      ? percent(
                          campaigns.reduce((a, c) => a + Number(c.roas), 0) / campaigns.length,
                        )
                      : "—"}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Avg ROAS
                  </p>
                </div>
              </div>
            </>
          )}
        </Panel>

        <Panel className="p-7" delay={0.08}>
          <SectionTitle title="Channel mix" hint="From live campaign value" />
          <div className="space-y-5">
            {channelMix.length === 0 ? (
              <p className="text-sm text-muted-foreground">No channel spend yet.</p>
            ) : (
              channelMix.map(([name, share]) => (
                <div key={name}>
                  <div className="mb-2 flex justify-between text-[13px]">
                    <span>{name}</span>
                    <span className="num text-muted-foreground">{share}%</span>
                  </div>
                  <Meter value={share} tone={name === "Paid" ? "gold" : "primary"} />
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title="Upcoming posts" hint="Drafts + scheduled from Studio / Channels" />
          <button
            type="button"
            onClick={onOpenCompose}
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Compose
          </button>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing queued yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/40">
            {upcoming.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]">{p.body}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {p.provider}
                    {p.scheduled_at
                      ? ` · ${new Date(p.scheduled_at).toLocaleString()}`
                      : " · draft"}
                  </p>
                </div>
                <Chip>{p.status}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function CampaignsTab({
  campaigns,
  isLoading,
  onToggle,
  dispatch,
}: {
  campaigns: Campaign[];
  isLoading: boolean;
  onToggle: (c: Campaign) => void;
  dispatch: (name: string) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("Organic");
  const [brief, setBrief] = useState("");

  const create = useMutation({
    mutationFn: () => createMarketingCampaign({ data: { name, channel, brief } }),
    onSuccess: async (row) => {
      toast.success(`Campaign “${row.name}” created`);
      setName("");
      setBrief("");
      await qc.invalidateQueries({ queryKey: ["table", "campaigns"] });
      trackAppEvent("campaign_created", { campaign: row.name });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <Panel className="p-6" glow>
        <SectionTitle title="New campaign" hint="Persisted to campaigns table" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            className="rounded-2xl border border-border/50 bg-foreground/4 px-4 py-2.5 text-sm outline-none focus:border-primary/40"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded-2xl border border-border/50 bg-foreground/4 px-4 py-2.5 text-sm outline-none"
          >
            {["Organic", "X", "LinkedIn", "Meta", "TikTok", "Email", "Paid"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Brief / goal (optional)"
          rows={3}
          className="mt-3 w-full rounded-2xl border border-border/50 bg-foreground/4 px-4 py-3 text-sm outline-none focus:border-primary/40"
        />
        <button
          type="button"
          disabled={create.isPending || name.trim().length < 2}
          onClick={() => create.mutate()}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />}
          Create campaign
        </button>
      </Panel>

      <section>
        <SectionTitle title="Campaigns" hint="Launch queues a Vela task" />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <Panel className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No campaigns yet — create one above.</p>
          </Panel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((c, i) => (
              <Panel key={c.id} className="p-6" delay={0.04 * i}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-semibold leading-snug">{c.name}</h3>
                  <Chip
                    tone={
                      c.status === "running"
                        ? "primary"
                        : c.status === "queued"
                          ? "neutral"
                          : "gold"
                    }
                  >
                    {c.status}
                  </Chip>
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {c.channel}
                </p>
                {c.brief ? (
                  <p className="mt-2 line-clamp-3 text-[12px] text-muted-foreground">{c.brief}</p>
                ) : null}
                <div className="mt-5">
                  <Meter value={c.progress} />
                </div>
                <div className="mt-4 flex justify-between text-[13px]">
                  <span className="text-gold">{currency(Number(c.value))}</span>
                  <span className="text-muted-foreground">{percent(Number(c.roas))} ROAS</span>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void onToggle(c)}
                    className="flex-1 rounded-2xl bg-foreground/6 px-3 py-2 text-[11px] transition-colors hover:bg-foreground/12"
                  >
                    {c.status === "running" ? "Pause" : "Launch"}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch(c.name)}
                    className="rounded-2xl bg-foreground/6 px-3 py-2 text-[11px] transition-colors hover:bg-foreground/12"
                  >
                    Brief
                  </button>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ComposeTab({
  campaigns,
  social,
  upcoming,
}: {
  campaigns: Campaign[];
  social: { provider: string; connected: boolean; auto_publish: boolean; handle: string | null }[];
  upcoming: ChannelPost[];
}) {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<(typeof SOCIALS)[number]["id"]>("x");
  const [body, setBody] = useState("");
  const [campaignKey, setCampaignKey] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [sharePostId, setSharePostId] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const clips = useQuery({
    queryKey: ["share-clips"],
    queryFn: () => listShareClips(),
    staleTime: 60_000,
  });
  const imageStatus = useQuery({
    queryKey: ["marketing-image-status"],
    queryFn: () => marketingImageStatus(),
    staleTime: 60_000,
  });

  const conn = social.find((s) => s.provider === provider);

  const post = useMutation({
    mutationFn: (status: "draft" | "scheduled" | "publish_now") =>
      scheduleMarketingPost({
        data: {
          provider,
          body,
          status,
          scheduledAt: status === "scheduled" ? new Date(scheduledAt).toISOString() : null,
          campaignKey: campaignKey || null,
          sharePostId: sharePostId || null,
          mediaUrl: mediaUrl || (videoUrl.trim() || null),
          mediaKind: sharePostId
            ? "share_clip"
            : mediaUrl
              ? "image"
              : videoUrl.trim()
                ? "video"
                : null,
        },
      }),
    onSuccess: async (res) => {
      toast.success(res.note);
      setBody("");
      await qc.invalidateQueries({ queryKey: ["table", "channel_posts"] });
      trackAppEvent("marketing_post", { status: res.status, provider });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const genImage = useMutation({
    mutationFn: () =>
      generateMarketingImage({
        data: { prompt: imagePrompt || body.slice(0, 200), campaignId: campaignKey || null },
      }),
    onSuccess: (res) => {
      setMediaUrl(res.url);
      toast.success("Image ready — attached to this post");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Panel className="p-6" glow>
        <SectionTitle title="Social post" hint="Datetime schedule · Autopublish gate in Channels" />
        <div className="mt-4 flex flex-wrap gap-2">
          {SOCIALS.map((s) => {
            const st = social.find((x) => x.provider === s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setProvider(s.id)}
                className={cn(
                  "rounded-2xl px-3 py-2 text-[11px] font-semibold",
                  provider === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/6 text-muted-foreground",
                )}
              >
                {s.glyph} {s.name}
                {st?.connected ? "" : " · off"}
              </button>
            );
          })}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Write the post…"
          className="mt-4 w-full rounded-2xl border border-border/50 bg-foreground/4 px-4 py-3 text-sm outline-none focus:border-primary/40"
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
            Schedule (local)
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-border/50 bg-foreground/4 px-3 py-2.5 text-sm text-foreground outline-none"
            />
          </label>
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
            Campaign link
            <select
              value={campaignKey}
              onChange={(e) => setCampaignKey(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-border/50 bg-foreground/4 px-3 py-2.5 text-sm outline-none"
            >
              <option value="">None</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-[12px] text-muted-foreground">
          {conn?.connected
            ? conn.auto_publish
              ? "Autopublish is on — scheduled posts will go live when due."
              : "Autopublish is off — scheduled posts wait until you enable it in Channels or Publish now."
            : (
              <>
                Channel not connected —{" "}
                <Link to="/channels" className="text-primary underline-offset-2 hover:underline">
                  open Channels
                </Link>
                .
              </>
            )}
        </p>

        <div className="mt-5 rounded-2xl border border-border/40 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold">
            <ImagePlus className="h-4 w-4 text-primary" /> AI image
            {!imageStatus.data?.configured ? (
              <span className="font-normal text-muted-foreground">
                (needs OPENAI_API_KEY)
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Image prompt (or uses post text)"
              className="min-w-[12rem] flex-1 rounded-2xl border border-border/50 bg-foreground/4 px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              disabled={genImage.isPending}
              onClick={() => genImage.mutate()}
              className="rounded-2xl bg-foreground/8 px-4 py-2 text-xs font-semibold disabled:opacity-40"
            >
              {genImage.isPending ? "Generating…" : "Generate"}
            </button>
          </div>
          {mediaUrl ? (
            <div className="mt-3 flex items-start gap-3">
              <img src={mediaUrl} alt="Generated" className="h-24 w-24 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setMediaUrl(null)}
                className="text-[11px] text-muted-foreground underline"
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-border/40 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold">
            <Video className="h-4 w-4 text-gold" /> Video (share-kit or URL)
          </div>
          <select
            value={sharePostId}
            onChange={(e) => setSharePostId(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-border/50 bg-foreground/4 px-3 py-2.5 text-sm outline-none"
          >
            <option value="">No share-kit clip</option>
            {(clips.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} · {c.duration}
              </option>
            ))}
          </select>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Or paste a video URL"
            className="mt-2 w-full rounded-2xl border border-border/50 bg-foreground/4 px-3 py-2.5 text-sm outline-none"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!body.trim() || post.isPending}
            onClick={() => post.mutate("draft")}
            className="rounded-2xl bg-foreground/8 px-4 py-2.5 text-xs font-semibold disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={!body.trim() || post.isPending}
            onClick={() => post.mutate("scheduled")}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary/15 px-4 py-2.5 text-xs font-semibold text-primary disabled:opacity-40"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Schedule
          </button>
          <button
            type="button"
            disabled={!body.trim() || post.isPending}
            onClick={() => post.mutate("publish_now")}
            className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            Publish now
          </button>
        </div>
      </Panel>

      {upcoming.length ? (
        <Panel className="p-5">
          <SectionTitle title="Queue" hint="Recent drafts / scheduled" />
          <ul className="mt-3 space-y-2">
            {upcoming.slice(0, 5).map((p) => (
              <li key={p.id} className="text-[13px] text-muted-foreground">
                <span className="text-foreground">{p.provider}</span> · {p.status}
                {p.scheduled_at ? ` · ${new Date(p.scheduled_at).toLocaleString()}` : ""} —{" "}
                {p.body.slice(0, 80)}
                {p.body.length > 80 ? "…" : ""}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function BrainstormTab() {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [ideas, setIdeas] = useState<BrainstormIdea[]>([]);

  const run = useMutation({
    mutationFn: () => brainstormCampaignIdeas({ data: { prompt, count: 4 } }),
    onSuccess: (res) => {
      setIdeas(res.ideas);
      toast.success(`${res.ideas.length} ideas from Vela`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const turnIntoCampaign = useMutation({
    mutationFn: (idea: BrainstormIdea) =>
      createMarketingCampaign({
        data: {
          name: idea.name,
          channel: idea.channel,
          brief: `${idea.angle}\n\nPosts:\n${idea.posts.map((p) => `• ${p}`).join("\n")}`,
        },
      }),
    onSuccess: async (row) => {
      toast.success(`Campaign “${row.name}” created`);
      await qc.invalidateQueries({ queryKey: ["table", "campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Panel className="p-6" glow>
        <SectionTitle title="Brainstorm" hint="Vela invents campaign angles + post copy" />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Optional focus — e.g. Wave 1 waitlist, Genesis keys, founding seats…"
          className="mt-4 w-full rounded-2xl border border-border/50 bg-foreground/4 px-4 py-3 text-sm outline-none"
        />
        <button
          type="button"
          disabled={run.isPending}
          onClick={() => run.mutate()}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {run.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Lightbulb className="h-3.5 w-3.5" />
          )}
          Brainstorm ideas
        </button>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {ideas.map((idea) => (
          <Panel key={idea.name + idea.channel} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg font-semibold tracking-tight">{idea.name}</h3>
              <Chip>{idea.channel}</Chip>
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">{idea.angle}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-primary">
              Funnel · {idea.funnelFocus}
            </p>
            <ul className="mt-3 space-y-2">
              {idea.posts.map((p) => (
                <li
                  key={p}
                  className="rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-[12px] leading-relaxed"
                >
                  {p}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={turnIntoCampaign.isPending}
              onClick={() => turnIntoCampaign.mutate(idea)}
              className="mt-4 rounded-2xl bg-foreground/8 px-4 py-2 text-xs font-semibold"
            >
              Turn into campaign
            </button>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function FunnelsTab() {
  const funnelQ = useQuery({
    queryKey: ["marketing-funnel"],
    queryFn: () => getMarketingFunnel(),
  });
  const [stages, setStages] = useState<FunnelStage[] | null>(null);
  const [name, setName] = useState("Growth funnel");

  useEffect(() => {
    if (!funnelQ.data) return;
    setName(funnelQ.data.name);
    setStages(funnelQ.data.stages);
  }, [funnelQ.data]);

  const current = stages ?? funnelQ.data?.stages ?? [];

  const save = useMutation({
    mutationFn: () =>
      updateMarketingFunnel({
        data: { name, stages: current },
      }),
    onSuccess: (row) => {
      setStages(row.stages);
      setName(row.name);
      toast.success("Funnel saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchStage = (id: string, patch: Partial<FunnelStage>) => {
    setStages((prev) => {
      const base = prev ?? funnelQ.data?.stages ?? [];
      return base.map((s) => (s.id === id ? { ...s, ...patch } : s));
    });
  };

  const suggestPost = (stage: FunnelStage) => {
    toast.message(`Compose a post for “${stage.title}”`, {
      description: stage.hint || "Open Compose and schedule it.",
    });
  };

  if (funnelQ.isLoading && !stages) {
    return <p className="text-sm text-muted-foreground">Loading funnel…</p>;
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[12rem] flex-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Funnel name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-border/50 bg-foreground/4 px-3 py-2.5 text-sm outline-none"
            />
          </label>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            Save funnel
          </button>
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Simple growth stages — counts are founder-owned (not invented). Use them to brief Compose
          and Brainstorm.
        </p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {current.map((stage) => (
          <Panel key={stage.id} className="p-5">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{stage.title}</h3>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{stage.hint}</p>
            <label className="mt-4 block text-[10px] uppercase tracking-wider text-muted-foreground">
              Count
              <input
                type="number"
                min={0}
                value={stage.count}
                onChange={(e) => patchStage(stage.id, { count: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-xl border border-border/50 bg-foreground/4 px-3 py-2 text-sm outline-none"
              />
            </label>
            <textarea
              value={stage.notes}
              onChange={(e) => patchStage(stage.id, { notes: e.target.value })}
              rows={3}
              placeholder="Notes"
              className="mt-3 w-full rounded-xl border border-border/50 bg-foreground/4 px-3 py-2 text-[12px] outline-none"
            />
            <button
              type="button"
              onClick={() => suggestPost(stage)}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" /> Suggest post angle
            </button>
          </Panel>
        ))}
      </div>
    </div>
  );
}
