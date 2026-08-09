import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { socialConfigured, type SocialProvider } from "@/lib/social-oauth.server";

const isProvider = (v: unknown): v is SocialProvider =>
  v === "x" || v === "linkedin" || v === "meta";

export const getSocialStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => ({
    companyId: String(input.companyId),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!company) throw new Error("Your company wasn't found for this account. Refresh and try again.");

    const { data: rows } = await supabaseAdmin
      .from("channel_connections")
      .select(
        "id, provider, handle, status, followers, engagement, reach, auto_publish, agent_name, last_sync, reply_mode, meta_page_name, ig_user_id, scopes",
      )
      .eq("company_id", data.companyId);

    const providers: SocialProvider[] = ["x", "meta", "linkedin"];
    return providers.map((provider) => {
      const row = rows?.find((r) => r.provider === provider);
      const scopes = String(row?.scopes ?? "");
      const hasMediaWrite = scopes.split(/\s+/).includes("media.write");
      const connected = row?.status === "connected";
      return {
        provider,
        available: socialConfigured(provider),
        connected,
        needsReconnect: Boolean(row && row.status !== "connected") || (connected && provider === "x" && !hasMediaWrite),
        canPostVideo: connected && hasMediaWrite,
        handle: row?.handle ?? null,
        followers: row?.followers ?? 0,
        engagement: row?.engagement ?? 0,
        reach: row?.reach ?? 0,
        auto_publish: Boolean(row?.auto_publish),
        agent_name: row?.agent_name ?? null,
        last_sync: row?.last_sync ?? null,
        reply_mode: row?.reply_mode ?? "auto",
        meta_page_name: row?.meta_page_name ?? null,
        has_instagram: Boolean(row?.ig_user_id),
        connection_id: row?.id ?? null,
      };
    });
  });

export const startSocialConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; companyId: string }) => {
    if (!isProvider(input.provider)) throw new Error("Unknown social provider");
    return { provider: input.provider, companyId: String(input.companyId) };
  })
  .handler(async ({ data, context }) => {
    if (!socialConfigured(data.provider)) {
      throw new Error(
        `${data.provider === "meta" ? "Meta" : data.provider === "x" ? "X" : "LinkedIn"} is not configured yet. Add the app credentials in env.`,
      );
    }
    const { getRequest } = await import("@tanstack/react-start/server");
    const { authorizeUrl, newPkce, redirectBase } = await import("@/lib/social-oauth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Prefer the company the client sent; fall back to first owned company (avoids stale id).
    let companyId = data.companyId;
    const { data: owned } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!owned) {
      const { data: fallback } = await supabaseAdmin
        .from("companies")
        .select("id")
        .eq("owner_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!fallback) {
        throw new Error(
          "No company on this account yet — finish onboarding, then connect X. (This is not an X connection error.)",
        );
      }
      companyId = fallback.id as string;
    }

    // Build the provider authorize URL here (authenticated server fn).
    // Do NOT bounce through /api/oauth/social/start — that route cannot read the
    // Supabase session from localStorage and returns "Company not found".
    const request = getRequest();
    const base = redirectBase(request);
    const { verifier, challenge, state } = newPkce();
    await supabaseAdmin.from("social_oauth_states").upsert({
      state,
      provider: data.provider,
      company_id: companyId,
      user_id: context.userId,
      code_verifier: verifier,
      popup: true,
      created_at: new Date().toISOString(),
    });

    const callback = `${base}/api/oauth/social/callback`;
    const authorizationUrl = authorizeUrl(data.provider, {
      redirectUri: callback,
      state,
      challenge,
    });
    return { authorizationUrl };
  });

export const disconnectSocial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; companyId: string }) => {
    if (!isProvider(input.provider)) throw new Error("Unknown social provider");
    return { provider: input.provider, companyId: String(input.companyId) };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!company) throw new Error("Company not found");

    await supabaseAdmin
      .from("channel_connections")
      .update({
        status: "idle",
        auto_publish: false,
        access_token_ciphertext: null,
        refresh_token_ciphertext: null,
        token_expires_at: null,
        last_sync: new Date().toISOString(),
      })
      .eq("company_id", data.companyId)
      .eq("provider", data.provider);
    return { ok: true };
  });

export const setSocialReplyMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; provider: string; mode: string }) => {
    if (!isProvider(input.provider)) throw new Error("Unknown social provider");
    if (!["off", "draft", "auto"].includes(input.mode)) throw new Error("Invalid reply mode");
    return {
      companyId: String(input.companyId),
      provider: input.provider,
      mode: input.mode as "off" | "draft" | "auto",
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!company) throw new Error("Company not found");
    await supabaseAdmin
      .from("channel_connections")
      .update({ reply_mode: data.mode })
      .eq("company_id", data.companyId)
      .eq("provider", data.provider);
    return { ok: true };
  });

export const publishSocialNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; provider: string; body: string }) => {
    if (!isProvider(input.provider)) throw new Error("Unknown social provider");
    const body = String(input.body ?? "").trim();
    if (!body) throw new Error("Write something to publish.");
    return { companyId: String(input.companyId), provider: input.provider, body };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { publishToProvider } = await import("@/lib/social-api.server");
    const { SOCIAL_AGENTS } = await import("@/lib/social-oauth.server");

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!company) throw new Error("Company not found");

    const result = await publishToProvider(data.provider, data.companyId, data.body);
    const { data: post, error } = await supabaseAdmin
      .from("channel_posts")
      .insert({
        company_id: data.companyId,
        provider: data.provider,
        body: data.body,
        status: "published",
        published_at: new Date().toISOString(),
        agent_name: SOCIAL_AGENTS[data.provider],
        external_post_id: result.externalPostId,
        external_url: result.externalUrl ?? null,
        impressions: 0,
        likes: 0,
        reposts: 0,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabaseAdmin.from("activity_events").insert({
      company_id: data.companyId,
      kind: "publish",
      message: `${SOCIAL_AGENTS[data.provider]} published on ${data.provider}`,
    });
    await supabaseAdmin.from("tasks").insert({
      company_id: data.companyId,
      title: `Engage on ${data.provider} post`,
      description: `Watch replies and respond in brand voice. Post: ${data.body.slice(0, 120)}`,
      status: "queued",
      priority: "medium",
      progress: 0,
    });

    return { ok: true, postId: post.id, externalUrl: result.externalUrl };
  });

/** Post a share-kit clip to X with native MP4 media (requires media.write). */
export const publishShareClipToX = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; sharePostId: string; caption?: string }) => {
    const sharePostId = String(input.sharePostId || "").trim();
    if (!sharePostId) throw new Error("Pick a clip");
    return {
      companyId: String(input.companyId),
      sharePostId,
      caption: input.caption ? String(input.caption).trim() : undefined,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { publishToProvider } = await import("@/lib/social-api.server");
    const { SOCIAL_AGENTS } = await import("@/lib/social-oauth.server");
    const { getSharePost, shareWatchUrl } = await import("@/lib/share-posts");
    const { SITE_URL } = await import("@/lib/site");

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, slug, name")
      .eq("id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!company) throw new Error("Your company wasn't found for this account. Refresh and try again.");

    const clip = getSharePost(data.sharePostId);
    if (!clip) throw new Error("Unknown share clip");

    const watch = shareWatchUrl(clip.id);
    const passport = company.slug ? ` ${SITE_URL}/company/${company.slug}` : "";
    const caption =
      data.caption ||
      `${clip.hook}\n\n${watch}${passport}`.slice(0, 280);

    const result = await publishToProvider("x", data.companyId, caption, {
      sharePostId: clip.id,
    });

    const { data: post, error } = await supabaseAdmin
      .from("channel_posts")
      .insert({
        company_id: data.companyId,
        provider: "x",
        body: caption,
        status: "published",
        published_at: new Date().toISOString(),
        agent_name: SOCIAL_AGENTS.x,
        external_post_id: result.externalPostId,
        external_url: result.externalUrl ?? null,
        impressions: 0,
        likes: 0,
        reposts: 0,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabaseAdmin.from("activity_events").insert({
      company_id: data.companyId,
      kind: "publish",
      message: `${SOCIAL_AGENTS.x} posted clip "${clip.title}" on X with native video`,
    });

    return { ok: true, postId: post.id, externalUrl: result.externalUrl };
  });

export const approveEngagementReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { engagementId: string; reply?: string }) => ({
    engagementId: String(input.engagementId),
    reply: input.reply ? String(input.reply) : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { replyToEngagement } = await import("@/lib/social-api.server");

    const { data: row } = await supabaseAdmin
      .from("channel_engagements")
      .select("*")
      .eq("id", data.engagementId)
      .maybeSingle();
    if (!row) throw new Error("Engagement not found");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", row.company_id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!company) throw new Error("Not allowed");

    const replyBody = (data.reply ?? row.reply_body ?? "").trim();
    if (!replyBody) throw new Error("No reply text");

    const externalReplyId = await replyToEngagement(
      row.provider as SocialProvider,
      row.company_id,
      row.external_id,
      replyBody,
    );
    await supabaseAdmin
      .from("channel_engagements")
      .update({
        status: "replied",
        reply_body: replyBody,
        external_reply_id: externalReplyId,
        replied_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    // Learning write-back for the social agent (Vela / Orin)
    const { mergeAgentMemory } = await import("@/lib/agent-memory");
    const agentName = row.provider === "linkedin" ? "Orin" : "Vela";
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("id, memory, lessons_count, tasks_completed")
      .eq("company_id", row.company_id)
      .eq("name", agentName)
      .maybeSingle();
    if (agent) {
      const lesson = `Approved ${row.provider} reply worked: "${replyBody.slice(0, 160)}"`;
      await supabaseAdmin
        .from("agents")
        .update({
          memory: mergeAgentMemory(agent.memory, lesson),
          lessons_count: (agent.lessons_count ?? 0) + 1,
          tasks_completed: (agent.tasks_completed ?? 0) + 1,
          current_task: `Replied on ${row.provider}`,
        })
        .eq("id", agent.id);
    }

    await supabaseAdmin.from("activity_events").insert({
      company_id: row.company_id,
      agent_id: agent?.id ?? null,
      kind: "reply",
      message: `Founder approved ${agentName}'s ${row.provider} reply`,
    });

    // Complete matching pending approval task(s) spawned by the worker.
    const sourceKey = `social-reply:${row.provider}:${row.external_id}`;
    await supabaseAdmin
      .from("tasks")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
        result: `Reply sent · ${sourceKey}`,
      })
      .eq("company_id", row.company_id)
      .eq("status", "pending_approval")
      .eq("result", sourceKey);

    return { ok: true };
  });

/**
 * Seed the fair-launch X drip into channel_posts (scheduled).
 * Idempotent via campaign_key. Turns on auto_publish + reply_mode auto for X.
 */
export const startLaunchDripCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; enableAutoReply?: boolean }) => ({
    companyId: String(input.companyId),
    enableAutoReply: input.enableAutoReply !== false,
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { SOCIAL_AGENTS } = await import("@/lib/social-oauth.server");
    const { buildLaunchDripSchedule, LAUNCH_DRIP_CAMPAIGN, launchDripSummary } =
      await import("@/lib/x-launch-campaign");

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!company) throw new Error("Company not found");

    const { data: conn } = await supabaseAdmin
      .from("channel_connections")
      .select("id, status, auto_publish, reply_mode")
      .eq("company_id", data.companyId)
      .eq("provider", "x")
      .maybeSingle();
    if (!conn || conn.status !== "connected") {
      throw new Error("Connect X on Channels first (OAuth — no password).");
    }

    const slots = buildLaunchDripSchedule();
    if (!slots.length) throw new Error("No drip slots to schedule.");

    let created = 0;
    let skipped = 0;
    for (const s of slots) {
      const { error: oneErr } = await supabaseAdmin.from("channel_posts").insert({
        company_id: data.companyId,
        provider: "x",
        body: s.body,
        status: "scheduled",
        scheduled_at: s.scheduledAt,
        agent_name: SOCIAL_AGENTS.x,
        campaign_key: s.campaignKey,
        impressions: 0,
        likes: 0,
        reposts: 0,
      });
      if (oneErr) {
        if (oneErr.code === "23505") skipped += 1;
        else throw oneErr;
      } else {
        created += 1;
      }
    }

    await supabaseAdmin
      .from("channel_connections")
      .update({
        auto_publish: true,
        ...(data.enableAutoReply ? { reply_mode: "auto" } : {}),
        last_sync: new Date().toISOString(),
      })
      .eq("id", conn.id);

    await supabaseAdmin.from("activity_events").insert({
      company_id: data.companyId,
      kind: "publish",
      message: `Vela seeded ${LAUNCH_DRIP_CAMPAIGN} (${created} new, ${skipped} already queued)`,
    });

    const { data: posts } = await supabaseAdmin
      .from("channel_posts")
      .select("id, campaign_key, scheduled_at, body, status")
      .eq("company_id", data.companyId)
      .eq("provider", "x")
      .like("campaign_key", `${LAUNCH_DRIP_CAMPAIGN}%`)
      .order("scheduled_at", { ascending: true });

    return {
      ok: true as const,
      created,
      skipped,
      summary: launchDripSummary(slots),
      posts: posts ?? [],
    };
  });

/** Upcoming / recent launch-drip posts for the Channels UI. */
export const getLaunchDripStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => ({
    companyId: String(input.companyId),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { LAUNCH_DRIP_CAMPAIGN, buildLaunchDripSchedule, launchDripSummary } =
      await import("@/lib/x-launch-campaign");

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!company) throw new Error("Company not found");

    const { data: posts } = await supabaseAdmin
      .from("channel_posts")
      .select("id, body, status, scheduled_at, published_at, external_url, error, campaign_key")
      .eq("company_id", data.companyId)
      .eq("provider", "x")
      .like("campaign_key", `${LAUNCH_DRIP_CAMPAIGN}%`)
      .order("scheduled_at", { ascending: true });

    const preview = buildLaunchDripSchedule();
    return {
      campaign: LAUNCH_DRIP_CAMPAIGN,
      seeded: (posts?.length ?? 0) > 0,
      posts: posts ?? [],
      preview: launchDripSummary(preview),
    };
  });
