import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson } from "@/lib/ai.server";
import {
  enrichBodyWithMedia,
  generateCreativeImageBytes,
  productImagesConfigured,
} from "@/lib/marketing.server";
import { getSharePost, SHARE_POSTS } from "@/lib/share-posts";

type LooseDb = { from: (table: string) => any; storage: { from: (b: string) => any } };

const PROVIDERS = ["x", "linkedin", "meta", "tiktok", "farcaster"] as const;
type Provider = (typeof PROVIDERS)[number];

function isProvider(v: string): v is Provider {
  return (PROVIDERS as readonly string[]).includes(v);
}

async function ownedCompany(supabase: LooseDb, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name, niche, tagline")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Company not found");
  return data as { id: string; name: string; niche: string | null; tagline: string | null };
}

export type FunnelStage = {
  id: string;
  title: string;
  hint: string;
  count: number;
  notes: string;
};

export type BrainstormIdea = {
  name: string;
  channel: string;
  angle: string;
  posts: string[];
  funnelFocus: string;
};

const DEFAULT_STAGES: FunnelStage[] = [
  { id: "awareness", title: "Awareness", hint: "Reach and content", count: 0, notes: "" },
  { id: "waitlist", title: "Waitlist", hint: "Emails and interest", count: 0, notes: "" },
  { id: "seat", title: "Founding seat", hint: "Paid access", count: 0, notes: "" },
  { id: "activated", title: "Activated", hint: "Company running", count: 0, notes: "" },
];

export const listShareClips = createServerFn({ method: "GET" }).handler(async () => {
  return SHARE_POSTS.map((p) => ({
    id: p.id,
    title: p.title,
    vibe: p.vibe,
    duration: p.duration,
    bestFor: p.bestFor,
    hook: p.hook,
  }));
});

export const createMarketingCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; channel?: string; brief?: string }) => {
    const name = String(input.name ?? "").trim().slice(0, 120);
    if (name.length < 2) throw new Error("Campaign name is required.");
    return {
      name,
      channel: String(input.channel ?? "Organic").trim().slice(0, 64) || "Organic",
      brief: String(input.brief ?? "").trim().slice(0, 2000) || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const company = await ownedCompany(supabaseAdmin as unknown as LooseDb, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        company_id: company.id,
        name: data.name,
        channel: data.channel,
        brief: data.brief,
        status: "queued",
        progress: 0,
        value: 0,
        roas: 0,
      })
      .select("id, name, channel, brief, status, progress, value, roas")
      .single();
    if (error) throw error;

    await supabaseAdmin.from("activity_events").insert({
      company_id: company.id,
      kind: "marketing",
      message: `Campaign created: ${data.name}`,
    });

    return row as {
      id: string;
      name: string;
      channel: string;
      brief: string | null;
      status: string;
      progress: number;
      value: number;
      roas: number;
    };
  });

export const scheduleMarketingPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      provider: string;
      body: string;
      status: "draft" | "scheduled" | "publish_now";
      scheduledAt?: string | null;
      campaignKey?: string | null;
      sharePostId?: string | null;
      mediaUrl?: string | null;
      mediaKind?: "image" | "video" | "share_clip" | null;
    }) => {
      if (!isProvider(input.provider)) throw new Error("Unknown social provider");
      const body = String(input.body ?? "").trim();
      if (!body) throw new Error("Write something to post.");
      const status = input.status;
      if (status !== "draft" && status !== "scheduled" && status !== "publish_now") {
        throw new Error("Invalid post status");
      }
      let scheduledAt: string | null = null;
      if (status === "scheduled") {
        const raw = String(input.scheduledAt ?? "").trim();
        if (!raw) throw new Error("Pick a date and time to schedule.");
        const when = new Date(raw);
        if (Number.isNaN(when.getTime())) throw new Error("Invalid schedule time.");
        if (when.getTime() < Date.now() - 60_000) {
          throw new Error("Schedule time must be in the future.");
        }
        scheduledAt = when.toISOString();
      }
      const sharePostId = input.sharePostId ? String(input.sharePostId).trim() : null;
      if (sharePostId && !getSharePost(sharePostId)) throw new Error("Unknown share clip.");
      return {
        provider: input.provider,
        body,
        status,
        scheduledAt,
        campaignKey: input.campaignKey ? String(input.campaignKey).trim().slice(0, 80) : null,
        sharePostId,
        mediaUrl: input.mediaUrl ? String(input.mediaUrl).trim().slice(0, 2000) : null,
        mediaKind: input.mediaKind ?? (sharePostId ? ("share_clip" as const) : null),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { SOCIAL_AGENTS } = await import("@/lib/social-oauth.server");
    const company = await ownedCompany(supabaseAdmin as unknown as LooseDb, context.userId);

    const body = enrichBodyWithMedia({
      body: data.body,
      sharePostId: data.sharePostId,
      mediaUrl: data.mediaUrl,
      mediaKind: data.mediaKind,
    });

    const { data: conn } = await supabaseAdmin
      .from("channel_connections")
      .select("status, auto_publish, handle")
      .eq("company_id", company.id)
      .eq("provider", data.provider)
      .maybeSingle();

    if (data.status === "publish_now") {
      if (!conn || conn.status !== "connected") {
        throw new Error(`Connect ${data.provider} under Channels first.`);
      }
      if (data.provider === "tiktok" && !data.sharePostId) {
        throw new Error("TikTok needs a share-kit video clip — pick one before publishing.");
      }

      const { publishToProvider } = await import("@/lib/social-api.server");
      const result = await publishToProvider(data.provider, company.id, body, {
        sharePostId: data.sharePostId,
        mediaUrl: data.mediaUrl,
      });
      const { data: post, error } = await supabaseAdmin
        .from("channel_posts")
        .insert({
          company_id: company.id,
          provider: data.provider,
          body,
          status: "published",
          published_at: new Date().toISOString(),
          agent_name: SOCIAL_AGENTS[data.provider],
          external_post_id: result.externalPostId,
          external_url: result.externalUrl ?? null,
          campaign_key: data.campaignKey,
          media_url: data.mediaUrl,
          media_kind: data.mediaKind,
          share_post_id: data.sharePostId,
          impressions: 0,
          likes: 0,
          reposts: 0,
        })
        .select("id, status, scheduled_at, external_url")
        .single();
      if (error) throw error;
      await supabaseAdmin.from("activity_events").insert({
        company_id: company.id,
        kind: "publish",
        message: `Marketing Studio published on ${data.provider}`,
      });
      return {
        ok: true as const,
        postId: post.id,
        status: "published" as const,
        autoPublish: true,
        externalUrl: post.external_url as string | null,
        note: "Published now.",
      };
    }

    const rowStatus = data.status === "draft" ? "draft" : "scheduled";
    const { data: post, error } = await supabaseAdmin
      .from("channel_posts")
      .insert({
        company_id: company.id,
        provider: data.provider,
        body,
        status: rowStatus,
        scheduled_at: rowStatus === "scheduled" ? data.scheduledAt : null,
        agent_name: SOCIAL_AGENTS[data.provider],
        campaign_key: data.campaignKey,
        media_url: data.mediaUrl,
        media_kind: data.mediaKind,
        share_post_id: data.sharePostId,
        impressions: 0,
        likes: 0,
        reposts: 0,
      })
      .select("id, status, scheduled_at")
      .single();
    if (error) throw error;

    const autoPublish = Boolean(conn?.status === "connected" && conn.auto_publish);
    let note = "Saved as draft.";
    if (rowStatus === "scheduled") {
      note = autoPublish
        ? "Scheduled — worker will publish when due (Autopublish is on)."
        : "Scheduled — waiting until Autopublish is on in Channels (or Publish now).";
    }

    await supabaseAdmin.from("activity_events").insert({
      company_id: company.id,
      kind: "marketing",
      message:
        rowStatus === "scheduled"
          ? `Post scheduled on ${data.provider}`
          : `Draft saved for ${data.provider}`,
    });

    return {
      ok: true as const,
      postId: post.id,
      status: rowStatus as "draft" | "scheduled",
      autoPublish,
      externalUrl: null as string | null,
      note,
      scheduledAt: post.scheduled_at as string | null,
    };
  });

export const generateMarketingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; campaignId?: string | null }) => {
    const prompt = String(input.prompt ?? "").trim();
    if (prompt.length < 8) throw new Error("Describe the image in a bit more detail.");
    return {
      prompt: prompt.slice(0, 1000),
      campaignId: input.campaignId ? String(input.campaignId) : null,
    };
  })
  .handler(async ({ data, context }) => {
    if (!productImagesConfigured()) {
      throw new Error(
        "Set GEMINI_API_KEY (preferred) or OPENAI_API_KEY for image generation.",
      );
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const company = await ownedCompany(supabaseAdmin as unknown as LooseDb, context.userId);
    const { burnAuraHard } = await import("@/lib/aura-spend.server");
    const { TASK_COST } = await import("@/lib/task-cost");
    await burnAuraHard(
      supabaseAdmin as unknown as LooseDb,
      company.id,
      TASK_COST,
      "Marketing · image",
    );
    const { bytes, mime } = await generateCreativeImageBytes(data.prompt);
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    const path = `${company.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("marketing-assets")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: pub } = supabaseAdmin.storage.from("marketing-assets").getPublicUrl(path);
    const url = pub.publicUrl;

    await supabaseAdmin.from("files").insert({
      company_id: company.id,
      name: `marketing-${Date.now()}.${ext}`,
      folder: "Marketing",
      kind: "image",
      size_kb: Math.max(1, Math.round(bytes.length / 1024)),
      summary: `AI image: ${data.prompt.slice(0, 180)}`,
      storage_path: path,
      mime_type: mime,
      size_bytes: bytes.length,
    });

    await supabaseAdmin.from("activity_events").insert({
      company_id: company.id,
      kind: "marketing",
      message: "Generated marketing image",
    });

    return { url, path, campaignId: data.campaignId };
  });

export const brainstormCampaignIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt?: string; count?: number }) => ({
    prompt: String(input.prompt ?? "").trim().slice(0, 800),
    count: Math.min(6, Math.max(2, Number(input.count) || 4)),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const company = await ownedCompany(supabaseAdmin as unknown as LooseDb, context.userId);
    const { burnAuraHard } = await import("@/lib/aura-spend.server");
    const { TASK_COST } = await import("@/lib/task-cost");
    await burnAuraHard(
      supabaseAdmin as unknown as LooseDb,
      company.id,
      TASK_COST,
      "Marketing · brainstorm",
    );

    const focus =
      data.prompt ||
      `Grow waitlist and founding seats for ${company.name}${company.niche ? ` (${company.niche})` : ""}`;

    const { delimitUntrusted } = await import("@/lib/ai-untrusted");
    const raw = await aiJson(
      `You are Vela, marketing lead at Aura OS. Invent concrete social campaign ideas.
Return JSON: {"ideas":[{"name":"string","channel":"X|LinkedIn|Meta|TikTok|Email|Organic","angle":"string","posts":["short post copy", "..."],"funnelFocus":"awareness|waitlist|seat|activated"}]}
Keep posts under 280 chars when channel is X. Be funny, clear, not investment advice. No markdown.`,
      `${delimitUntrusted("brief", focus, 800)}
Company: ${company.name}. Tagline: ${company.tagline ?? "AI company OS"}.
Return exactly ${data.count} ideas.`,
      "ideas",
    );

    const ideasRaw = Array.isArray(raw.ideas) ? raw.ideas : [];
    const ideas: BrainstormIdea[] = ideasRaw
      .map((item) => {
        const o = item as Record<string, unknown>;
        const posts = Array.isArray(o.posts)
          ? o.posts.map((p) => String(p).slice(0, 500)).filter(Boolean)
          : [];
        return {
          name: String(o.name ?? "Untitled").slice(0, 120),
          channel: String(o.channel ?? "Organic").slice(0, 40),
          angle: String(o.angle ?? "").slice(0, 400),
          posts: posts.slice(0, 4),
          funnelFocus: String(o.funnelFocus ?? "awareness").slice(0, 40),
        };
      })
      .filter((i) => i.name.length > 1)
      .slice(0, data.count);

    if (!ideas.length) throw new Error("Brainstorm returned no usable ideas — try again.");

    return { ideas, companyName: company.name };
  });

export const getMarketingFunnel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const company = await ownedCompany(supabaseAdmin as unknown as LooseDb, context.userId);
    const { data: existing } = await supabaseAdmin
      .from("marketing_funnels")
      .select("id, name, stages, updated_at")
      .eq("company_id", company.id)
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id as string,
        name: existing.name as string,
        stages: (existing.stages as FunnelStage[]) ?? DEFAULT_STAGES,
        updatedAt: existing.updated_at as string,
      };
    }

    const { data: created, error } = await supabaseAdmin
      .from("marketing_funnels")
      .insert({
        company_id: company.id,
        name: "Growth funnel",
        stages: DEFAULT_STAGES,
      })
      .select("id, name, stages, updated_at")
      .single();
    if (error) throw error;
    return {
      id: created.id as string,
      name: created.name as string,
      stages: (created.stages as FunnelStage[]) ?? DEFAULT_STAGES,
      updatedAt: created.updated_at as string,
    };
  });

export const updateMarketingFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name?: string; stages: FunnelStage[] }) => {
    if (!Array.isArray(input.stages) || input.stages.length < 2) {
      throw new Error("Funnel needs at least two stages.");
    }
    const stages = input.stages.slice(0, 8).map((s) => ({
      id: String(s.id ?? crypto.randomUUID()).slice(0, 40),
      title: String(s.title ?? "Stage").trim().slice(0, 60) || "Stage",
      hint: String(s.hint ?? "").trim().slice(0, 120),
      count: Math.max(0, Math.min(1_000_000, Number(s.count) || 0)),
      notes: String(s.notes ?? "").trim().slice(0, 500),
    }));
    return {
      name: input.name ? String(input.name).trim().slice(0, 80) : undefined,
      stages,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const company = await ownedCompany(supabaseAdmin as unknown as LooseDb, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("marketing_funnels")
      .upsert(
        {
          company_id: company.id,
          name: data.name ?? "Growth funnel",
          stages: data.stages,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" },
      )
      .select("id, name, stages, updated_at")
      .single();
    if (error) throw error;
    return {
      id: row.id as string,
      name: row.name as string,
      stages: row.stages as FunnelStage[],
      updatedAt: row.updated_at as string,
    };
  });

export const marketingImageStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ configured: productImagesConfigured() }));
