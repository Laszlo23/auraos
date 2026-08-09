import { executeTask } from "@/lib/task-execute.server";

/**
 * Process queued/running tasks with real plan → research → synthesize execution.
 * Never picks up pending_approval — founder must approve first.
 * Pass `companyId` for founder-triggered ticks (tenant-scoped). Cron omits it (global).
 */
export async function processTaskQueue(
  limit = 5,
  companyId?: string,
): Promise<{ processed: number; errors: string[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const errors: string[] = [];
  let processed = 0;

  let q = supabaseAdmin
    .from("tasks")
    .select("id, status")
    .in("status", ["queued", "running", "queue", "pending"])
    .lt("progress", 100)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (companyId) q = q.eq("company_id", companyId);

  const { data: tasks, error } = await q;

  if (error) return { processed: 0, errors: [error.message] };
  if (!tasks?.length) return { processed: 0, errors: [] };

  for (const task of tasks as { id: string; status: string }[]) {
    if (task.status === "pending_approval") continue;
    const res = await executeTask(supabaseAdmin as never, task.id);
    if (res.ok) processed += 1;
    else if (res.error) errors.push(`${task.id}:${res.error}`);
  }

  return { processed, errors };
}

/** Run one specific task immediately after founder approval. */
export async function processOneTask(
  taskId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return executeTask(supabaseAdmin as never, taskId);
}

/** Publish due scheduled posts via live social APIs when tokens exist. */
export async function publishDueChannelPosts(limit = 20, companyId?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { publishToProvider } = await import("@/lib/social-api.server");
  const now = new Date().toISOString();
  let q = supabaseAdmin
    .from("channel_posts")
    .select("id, company_id, provider, body, agent_name, reply_to_external_id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .limit(limit);
  if (companyId) q = q.eq("company_id", companyId);
  const { data: due } = await q;

  let published = 0;
  const errors: string[] = [];
  for (const post of due ?? []) {
    try {
      const provider = post.provider as "x" | "linkedin" | "meta";
      // Autopublish gate: scheduled drip stays queued until the founder turns it on.
      const { data: conn } = await supabaseAdmin
        .from("channel_connections")
        .select("auto_publish, status")
        .eq("company_id", post.company_id)
        .eq("provider", provider)
        .maybeSingle();
      if (!conn || conn.status !== "connected") {
        continue;
      }
      if (!conn.auto_publish) {
        continue;
      }

      const { sharePostIdFromBody } = await import("@/lib/share-media.server");
      const sharePostId =
        provider === "x" ? sharePostIdFromBody(String(post.body ?? "")) : null;

      const result = await publishToProvider(provider, post.company_id, post.body, {
        replyToExternalId: post.reply_to_external_id,
        sharePostId,
      });
      await supabaseAdmin
        .from("channel_posts")
        .update({
          status: "published",
          published_at: now,
          external_post_id: result.externalPostId,
          external_url: result.externalUrl ?? null,
          error: null,
        })
        .eq("id", post.id);
      published += 1;
      await supabaseAdmin.from("activity_events").insert({
        company_id: post.company_id,
        kind: "publish",
        message: `${post.agent_name ?? "Vela"} published on ${post.provider}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      await supabaseAdmin
        .from("channel_posts")
        .update({ status: "failed", error: msg.slice(0, 500) })
        .eq("id", post.id);
    }
  }
  return { published, errors };
}

/** Pull comments/mentions and auto-reply (or draft) based on reply_mode. */
export async function syncSocialEngagement(limitCompanies = 20, companyId?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { fetchRecentComments, draftSocialReply, replyToEngagement } =
    await import("@/lib/social-api.server");

  let q = supabaseAdmin
    .from("channel_connections")
    .select("id, company_id, provider, reply_mode, handle")
    .eq("status", "connected")
    .neq("reply_mode", "off")
    .limit(limitCompanies);
  if (companyId) q = q.eq("company_id", companyId);
  const { data: connections } = await q;

  let ingested = 0;
  let replied = 0;

  for (const conn of connections ?? []) {
    const provider = conn.provider as "x" | "linkedin" | "meta";
    const comments = await fetchRecentComments(provider, conn.company_id);
    if (!comments.length) continue;

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name, autonomy")
      .eq("id", conn.company_id)
      .maybeSingle();

    const { data: note } = await supabaseAdmin
      .from("knowledge_items")
      .select("summary")
      .eq("company_id", conn.company_id)
      .eq("title", "Channel standing instruction")
      .maybeSingle();

    for (const c of comments) {
      const { data: existing } = await supabaseAdmin
        .from("channel_engagements")
        .select("id, status")
        .eq("provider", provider)
        .eq("external_id", c.externalId)
        .maybeSingle();
      if (existing?.status === "replied" || existing?.status === "ignored") continue;

      // Already drafted once — do not spawn another "Approve … reply" task every tick.
      const alreadyDrafted = existing?.status === "drafted";
      if (alreadyDrafted) continue;

      let engagementId = existing?.id;
      if (!engagementId) {
        const { data: inserted } = await supabaseAdmin
          .from("channel_engagements")
          .insert({
            company_id: conn.company_id,
            connection_id: conn.id,
            provider,
            external_id: c.externalId,
            kind: "comment",
            author_handle: c.authorHandle,
            author_name: c.authorName,
            body: c.body,
            status: "pending",
          })
          .select("id")
          .single();
        engagementId = inserted?.id;
        ingested += 1;
      }
      if (!engagementId) continue;

      const reply = await draftSocialReply({
        companyName: company?.name ?? "the company",
        instruction: note?.summary ?? null,
        author: c.authorHandle ?? c.authorName,
        comment: c.body,
        provider,
      });

      const replySourceKey = `social-reply:${provider}:${c.externalId}`;

      // reply_mode owns comment/mention handling:
      // - draft → founder approves each reply
      // - auto → free-for-all replies (no per-comment approval, even at autonomy 0)
      // Mission/task autonomy still applies elsewhere.
      if (conn.reply_mode === "draft") {
        await supabaseAdmin
          .from("channel_engagements")
          .update({ status: "drafted", reply_body: reply })
          .eq("id", engagementId);
        await insertSocialReplyTaskOnce({
          companyId: conn.company_id,
          provider,
          author: c.authorHandle ?? "comment",
          reply,
          original: c.body,
          sourceKey: replySourceKey,
        });
        continue;
      }

      if (conn.reply_mode === "auto") {
        try {
          const externalReplyId = await replyToEngagement(
            provider,
            conn.company_id,
            c.externalId,
            reply,
          );
          await supabaseAdmin
            .from("channel_engagements")
            .update({
              status: "replied",
              reply_body: reply,
              external_reply_id: externalReplyId,
              replied_at: new Date().toISOString(),
            })
            .eq("id", engagementId);
          replied += 1;
          await supabaseAdmin.from("activity_events").insert({
            company_id: conn.company_id,
            kind: "reply",
            message: `${provider === "linkedin" ? "Orin" : "Vela"} replied on ${provider}`,
          });
        } catch {
          await supabaseAdmin
            .from("channel_engagements")
            .update({ status: "drafted", reply_body: reply })
            .eq("id", engagementId);
          await insertSocialReplyTaskOnce({
            companyId: conn.company_id,
            provider,
            author: c.authorHandle ?? "comment",
            reply,
            original: c.body,
            sourceKey: replySourceKey,
          });
        }
      }
    }
  }

  return { ingested, replied };
}

/** One approval task per social mention — keyed in `result` for idempotency across ticks. */
async function insertSocialReplyTaskOnce(opts: {
  companyId: string;
  provider: string;
  author: string;
  reply: string;
  original: string;
  sourceKey: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existingTask } = await supabaseAdmin
    .from("tasks")
    .select("id")
    .eq("company_id", opts.companyId)
    .eq("result", opts.sourceKey)
    .maybeSingle();
  if (existingTask) return;

  await supabaseAdmin.from("tasks").insert({
    company_id: opts.companyId,
    title: `Approve ${opts.provider} reply to ${opts.author}`,
    description: `Draft: ${opts.reply}\n\nOriginal: ${opts.original}`,
    status: "pending_approval",
    priority: "high",
    progress: 0,
    result: opts.sourceKey,
  });
}
