import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { makeShareSlug } from "@/lib/revenue-mission.server";
import { SITE_URL } from "@/lib/site";

type LooseDb = { from: (table: string) => any };

function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

async function ownedCompany(supabase: LooseDb, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name, slug, emoji, tagline, owner_id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Company not found");
  return data as {
    id: string;
    name: string;
    slug: string | null;
    emoji: string | null;
    tagline: string | null;
    owner_id: string;
  };
}

export type WeeklyPostHighlight = {
  id: string;
  provider: string;
  body: string;
  agent_name: string | null;
  published_at: string | null;
  impressions: number;
  likes: number;
  reposts: number;
  external_url: string | null;
};

export type WeeklyActivityHighlight = {
  kind: string;
  message: string;
  created_at: string;
};

export type WeeklyChannelContext = {
  provider: string;
  handle: string | null;
  status: string;
  followers: number;
};

export type WeeklyReportSnapshot = {
  companyName: string;
  companySlug: string | null;
  companyEmoji: string | null;
  companyTagline: string | null;
  rangeLabel: string;
  weekStart: string;
  weekEnd: string;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    postsPublished: number;
    repliesSent: number;
    impressions: number;
    likes: number;
    reposts: number;
    tasksCompleted: number;
    agentActions: number;
  };
  byKind: Record<string, number>;
  channels: WeeklyChannelContext[];
  posts: WeeklyPostHighlight[];
  replies: Array<{
    provider: string;
    reply_body: string;
    author_handle: string | null;
    replied_at: string | null;
  }>;
  activity: WeeklyActivityHighlight[];
  summary: string | null;
};

export type WeeklyReportLive = WeeklyReportSnapshot & {
  shareSlug: string | null;
  shareUrl: string | null;
  sharePublic: boolean;
  reportId: string | null;
};

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Rolling last 7 days for data; calendar Monday key for one snapshot per week. */
export function weekWindow(now = new Date()) {
  const rangeEnd = new Date(now);
  const rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const day = rangeEnd.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate() + mondayOffset),
  );
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
    rangeLabel: `${fmtDay(rangeStart)} – ${fmtDay(rangeEnd)}`,
  };
}

async function buildSnapshot(
  db: LooseDb,
  company: {
    id: string;
    name: string;
    slug: string | null;
    emoji: string | null;
    tagline: string | null;
  },
  window: ReturnType<typeof weekWindow>,
): Promise<WeeklyReportSnapshot> {
  const since = window.rangeStart;

  const [{ data: posts }, { data: engagements }, { data: events }, { data: tasks }, { data: channels }] =
    await Promise.all([
      db
        .from("channel_posts")
        .select(
          "id, provider, body, agent_name, published_at, impressions, likes, reposts, external_url, status",
        )
        .eq("company_id", company.id)
        .eq("status", "published")
        .gte("published_at", since)
        .order("published_at", { ascending: false })
        .limit(40),
      db
        .from("channel_engagements")
        .select("provider, reply_body, author_handle, replied_at, status")
        .eq("company_id", company.id)
        .not("replied_at", "is", null)
        .gte("replied_at", since)
        .order("replied_at", { ascending: false })
        .limit(30),
      db
        .from("activity_events")
        .select("kind, message, created_at")
        .eq("company_id", company.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(80),
      db
        .from("tasks")
        .select("id, status, completed_at, updated_at")
        .eq("company_id", company.id)
        .in("status", ["done", "completed"])
        .limit(200),
      db
        .from("channel_connections")
        .select("provider, handle, status, followers")
        .eq("company_id", company.id),
    ]);

  const postRows = (posts ?? []) as WeeklyPostHighlight[];
  const replyRows = ((engagements ?? []) as Array<{
    provider: string;
    reply_body: string | null;
    author_handle: string | null;
    replied_at: string | null;
    status: string;
  }>)
    .filter((r) => Boolean(r.reply_body))
    .map((r) => ({
      provider: r.provider,
      reply_body: String(r.reply_body),
      author_handle: r.author_handle,
      replied_at: r.replied_at,
    }));

  const eventRows = (events ?? []) as WeeklyActivityHighlight[];
  const byKind: Record<string, number> = {};
  for (const e of eventRows) {
    const k = e.kind || "other";
    byKind[k] = (byKind[k] ?? 0) + 1;
  }

  const taskRows = ((tasks ?? []) as Array<{
    id: string;
    status: string;
    completed_at: string | null;
    updated_at: string | null;
  }>).filter((t) => {
    const stamp = t.completed_at || t.updated_at;
    return stamp ? stamp >= since : false;
  });

  const impressions = postRows.reduce((a, p) => a + (Number(p.impressions) || 0), 0);
  const likes = postRows.reduce((a, p) => a + (Number(p.likes) || 0), 0);
  const reposts = postRows.reduce((a, p) => a + (Number(p.reposts) || 0), 0);

  return {
    companyName: company.name,
    companySlug: company.slug,
    companyEmoji: company.emoji,
    companyTagline: company.tagline,
    rangeLabel: window.rangeLabel,
    weekStart: window.weekStart,
    weekEnd: window.weekEnd,
    rangeStart: window.rangeStart,
    rangeEnd: window.rangeEnd,
    totals: {
      postsPublished: postRows.length,
      repliesSent: replyRows.length,
      impressions,
      likes,
      reposts,
      tasksCompleted: taskRows.length,
      agentActions: eventRows.length,
    },
    byKind,
    channels: ((channels ?? []) as WeeklyChannelContext[]).map((c) => ({
      provider: c.provider,
      handle: c.handle,
      status: c.status,
      followers: Number(c.followers) || 0,
    })),
    posts: postRows.slice(0, 12).map((p) => ({
      id: p.id,
      provider: p.provider,
      body: String(p.body || "").slice(0, 320),
      agent_name: p.agent_name,
      published_at: p.published_at,
      impressions: Number(p.impressions) || 0,
      likes: Number(p.likes) || 0,
      reposts: Number(p.reposts) || 0,
      external_url: p.external_url,
    })),
    replies: replyRows.slice(0, 8).map((r) => ({
      ...r,
      reply_body: r.reply_body.slice(0, 280),
    })),
    activity: eventRows.slice(0, 12),
    summary: null,
  };
}

async function maybeSummarize(snapshot: WeeklyReportSnapshot): Promise<string> {
  const t = snapshot.totals;
  const fallback = (() => {
    if (t.postsPublished === 0 && t.agentActions === 0) {
      return `${snapshot.companyName} had a quiet week — channels are connected and ready; no posts shipped yet.`;
    }
    const bits: string[] = [];
    if (t.postsPublished > 0) bits.push(`${t.postsPublished} post${t.postsPublished === 1 ? "" : "s"} published`);
    if (t.repliesSent > 0) bits.push(`${t.repliesSent} repl${t.repliesSent === 1 ? "y" : "ies"} sent`);
    if (t.tasksCompleted > 0) bits.push(`${t.tasksCompleted} task${t.tasksCompleted === 1 ? "" : "s"} completed`);
    if (t.agentActions > 0) bits.push(`${t.agentActions} agent action${t.agentActions === 1 ? "" : "s"}`);
    return `${snapshot.companyName} this week: ${bits.join(", ")}. Honest zeros where nothing landed.`;
  })();

  try {
    const { aiChat } = await import("@/lib/ai.server");
    const text = await aiChat({
      system: `You are Atlas, CEO of ${snapshot.companyName} on Aura OS.
Write ONE short paragraph (max 60 words) for a boss-facing weekly report.
Rules: only use the numbers given. Never invent reach, revenue, or followers growth. Plain executive English. No emojis.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            range: snapshot.rangeLabel,
            totals: snapshot.totals,
            topPosts: snapshot.posts.slice(0, 3).map((p) => ({
              provider: p.provider,
              body: p.body.slice(0, 120),
              likes: p.likes,
            })),
            channels: snapshot.channels.filter((c) => c.status === "connected").map((c) => c.provider),
          }),
        },
      ],
    });
    const cleaned = String(text || "")
      .replace(/^["']|["']$/g, "")
      .trim();
    return cleaned.slice(0, 420) || fallback;
  } catch {
    return fallback;
  }
}

export const getWeeklyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = asDb(supabaseAdmin);
    const company = await ownedCompany(db, context.userId);
    const window = weekWindow();
    const snapshot = await buildSnapshot(db, company, window);

    const { data: existing } = await db
      .from("weekly_reports")
      .select("id, share_slug, share_public")
      .eq("company_id", company.id)
      .eq("week_start", window.weekStart)
      .maybeSingle();

    const shareSlug = (existing?.share_slug as string | null) ?? null;
    const sharePublic = Boolean(existing?.share_public);

    return {
      ...snapshot,
      shareSlug,
      sharePublic,
      shareUrl: shareSlug && sharePublic ? `${SITE_URL}/w/${shareSlug}` : null,
      reportId: (existing?.id as string | null) ?? null,
    } satisfies WeeklyReportLive;
  });

export const shareWeeklyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = asDb(supabaseAdmin);
    const company = await ownedCompany(db, context.userId);
    const window = weekWindow();
    const snapshot = await buildSnapshot(db, company, window);
    snapshot.summary = await maybeSummarize(snapshot);

    const { data: existing } = await db
      .from("weekly_reports")
      .select("id, share_slug")
      .eq("company_id", company.id)
      .eq("week_start", window.weekStart)
      .maybeSingle();

    const shareSlug = (existing?.share_slug as string | null) || makeShareSlug();
    const values = {
      company_id: company.id,
      week_start: window.weekStart,
      week_end: window.weekEnd,
      share_slug: shareSlug,
      share_public: true,
      snapshot,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await db.from("weekly_reports").update(values).eq("id", existing.id);
      if (error) throw new Error(error.message || "Could not update weekly report");
    } else {
      const { error } = await db.from("weekly_reports").insert(values);
      if (error) throw new Error(error.message || "Could not create weekly report");
    }

    await db.from("activity_events").insert({
      company_id: company.id,
      kind: "decision",
      message: `Week in review shared · ${window.rangeLabel}`,
    });

    return {
      shareSlug,
      shareUrl: `${SITE_URL}/w/${shareSlug}`,
      snapshot,
    };
  });

export const getPublicWeeklyReport = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({
    slug: String(input.slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 32),
  }))
  .handler(async ({ data }) => {
    if (!data.slug) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = asDb(supabaseAdmin);
    const { data: row } = await db
      .from("weekly_reports")
      .select("id, week_start, week_end, share_slug, snapshot, created_at, updated_at")
      .eq("share_slug", data.slug)
      .eq("share_public", true)
      .maybeSingle();
    if (!row) return null;

    const snapshot = (row.snapshot || {}) as WeeklyReportSnapshot;
    return {
      weekStart: row.week_start as string,
      weekEnd: row.week_end as string,
      shareSlug: row.share_slug as string,
      updatedAt: (row.updated_at || row.created_at) as string,
      snapshot,
    };
  });
