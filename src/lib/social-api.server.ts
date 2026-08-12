// Server-only publish + engagement APIs for connected social channels.
import { loadConnectionSecrets, type SocialProvider } from "@/lib/social-oauth.server";
import { agentJson } from "@/lib/x402-ai";

export type PublishResult = {
  externalPostId: string;
  externalUrl?: string | null;
};

export async function publishToProvider(
  provider: SocialProvider,
  companyId: string,
  body: string,
  opts?: {
    replyToExternalId?: string | null;
    sharePostId?: string | null;
    mediaUrl?: string | null;
  },
): Promise<PublishResult> {
  const conn = await loadConnectionSecrets(companyId, provider);
  if (!conn) throw new Error(`Connect ${provider} first.`);

  switch (provider) {
    case "x": {
      let mediaIds: string[] | undefined;
      if (opts?.sharePostId) {
        const { loadShareVideoBytes } = await import("@/lib/share-media.server");
        const { bytes } = await loadShareVideoBytes(opts.sharePostId);
        const mediaId = await uploadXVideo(conn.accessToken, bytes);
        mediaIds = [mediaId];
      }
      return publishX(conn.accessToken, body, opts?.replyToExternalId, mediaIds);
    }
    case "linkedin":
      return publishLinkedIn(conn.accessToken, conn.externalUserId, body);
    case "meta":
      return publishMeta(conn.accessToken, conn.metaPageId, conn.igUserId, body, {
        sharePostId: opts?.sharePostId ?? null,
        mediaUrl: opts?.mediaUrl ?? null,
      });
    case "tiktok": {
      if (!opts?.sharePostId) {
        throw new Error("TikTok needs a video — pick a share-kit clip before publishing.");
      }
      return publishTikTokVideo(conn.accessToken, body, opts.sharePostId);
    }
    case "farcaster": {
      const { publishFarcasterCast } = await import("@/lib/farcaster-neynar.server");
      const cast = await publishFarcasterCast(conn.accessToken, body);
      return { externalPostId: cast.hash, externalUrl: cast.url };
    }
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

/** Chunked X API v2 media upload (OAuth 2.0 user token + media.write). */
export async function uploadXVideo(token: string, bytes: Buffer): Promise<string> {
  const initRes = await fetch("https://api.x.com/2/media/upload/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      media_type: "video/mp4",
      total_bytes: bytes.length,
      media_category: "tweet_video",
    }),
  });
  const initJson = (await initRes.json()) as {
    data?: { id?: string };
    detail?: string;
    title?: string;
    errors?: Array<{ message?: string }>;
  };
  const mediaId = initJson.data?.id;
  if (!initRes.ok || !mediaId) {
    throw new Error(
      initJson.detail ||
        initJson.title ||
        initJson.errors?.[0]?.message ||
        "X media INIT failed — reconnect X to grant media.write",
    );
  }

  const CHUNK = 2 * 1024 * 1024;
  let segment = 0;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    const chunk = bytes.subarray(offset, Math.min(offset + CHUNK, bytes.length));
    const form = new FormData();
    form.append(
      "media",
      new Blob([new Uint8Array(chunk)], { type: "application/octet-stream" }),
      `segment-${segment}.mp4`,
    );
    form.append("segment_index", String(segment));
    const appendRes = await fetch(`https://api.x.com/2/media/upload/${mediaId}/append`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!appendRes.ok) {
      const err = await appendRes.text().catch(() => "");
      throw new Error(err || `X media APPEND failed at segment ${segment}`);
    }
    segment += 1;
  }

  const finRes = await fetch(`https://api.x.com/2/media/upload/${mediaId}/finalize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const finJson = (await finRes.json()) as {
    data?: {
      processing_info?: {
        state?: string;
        check_after_secs?: number;
        error?: { message?: string };
      };
    };
    detail?: string;
    title?: string;
  };
  if (!finRes.ok) {
    throw new Error(finJson.detail || finJson.title || "X media FINALIZE failed");
  }

  let info = finJson.data?.processing_info;
  let polls = 0;
  while (info && (info.state === "pending" || info.state === "in_progress") && polls < 40) {
    const wait = Math.max(2, Math.min(20, info.check_after_secs ?? 5)) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    const statusRes = await fetch(`https://api.x.com/2/media/upload?media_id=${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statusJson = (await statusRes.json()) as {
      data?: {
        processing_info?: {
          state?: string;
          check_after_secs?: number;
          error?: { message?: string };
        };
      };
    };
    info = statusJson.data?.processing_info;
    polls += 1;
  }
  if (info?.state === "failed") {
    throw new Error(info.error?.message || "X media processing failed");
  }

  return mediaId;
}

async function publishX(
  token: string,
  text: string,
  replyTo?: string | null,
  mediaIds?: string[],
): Promise<PublishResult> {
  const payload: Record<string, unknown> = { text: text.slice(0, 280) };
  if (replyTo) payload["reply"] = { in_reply_to_tweet_id: replyTo };
  if (mediaIds?.length) payload["media"] = { media_ids: mediaIds };
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as {
    data?: { id?: string };
    detail?: string;
    title?: string;
  };
  if (!res.ok || !json.data?.id) {
    throw new Error(json.detail || json.title || "X publish failed");
  }
  return {
    externalPostId: json.data.id,
    externalUrl: `https://x.com/i/web/status/${json.data.id}`,
  };
}

async function publishLinkedIn(
  token: string,
  personId: string | null,
  text: string,
): Promise<PublishResult> {
  if (!personId) throw new Error("LinkedIn profile id missing — reconnect the account.");
  if (process.env["LINKEDIN_SHARE_SCOPE"] !== "1") {
    throw new Error(
      "LinkedIn posting needs Share on LinkedIn approved — set LINKEDIN_SHARE_SCOPE=1 and reconnect.",
    );
  }
  const author = personId.startsWith("urn:") ? personId : `urn:li:person:${personId}`;
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: text.slice(0, 3000) },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const id = res.headers.get("x-restli-id") || res.headers.get("X-RestLi-Id");
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    if (/COMPANY_PAGE|w_member_social|unauthorized|403/i.test(err)) {
      throw new Error(
        "LinkedIn share denied — approve Share on LinkedIn, set LINKEDIN_SHARE_SCOPE=1, reconnect.",
      );
    }
    throw new Error(err || "LinkedIn publish failed");
  }
  return { externalPostId: id || `li-${Date.now()}`, externalUrl: null };
}

async function publishMeta(
  token: string,
  pageId: string | null,
  igUserId: string | null,
  text: string,
  opts?: { sharePostId?: string | null; mediaUrl?: string | null },
): Promise<PublishResult> {
  const caption = text.slice(0, 2200);
  const media = await resolveMetaMedia(opts?.sharePostId ?? null, opts?.mediaUrl ?? null);

  // Instagram Content Publishing needs a public HTTPS media URL.
  if (igUserId && media) {
    try {
      const ig = await publishInstagram(token, igUserId, caption, media);
      // Also mirror to the Facebook Page when available (Lokal shops often want both).
      if (pageId) {
        try {
          await publishFacebookPage(token, pageId, caption);
        } catch (e) {
          console.warn("[meta] FB mirror after IG failed:", e);
        }
      }
      return ig;
    } catch (e) {
      console.warn("[meta] IG publish failed, falling back to Facebook Page:", e);
      if (!pageId) throw e instanceof Error ? e : new Error(String(e));
    }
  }

  if (!pageId) {
    throw new Error(
      igUserId
        ? "Instagram needs an image or video URL (share-kit clip). Attach media, then publish."
        : "Connect a Facebook Page (with optional IG Business) to publish on Meta.",
    );
  }
  return publishFacebookPage(token, pageId, caption);
}

type MetaMedia =
  { kind: "image"; url: string } | { kind: "video"; url: string; posterUrl?: string };

async function resolveMetaMedia(
  sharePostId: string | null,
  mediaUrl: string | null,
): Promise<MetaMedia | null> {
  if (sharePostId) {
    const { getSharePost, sharePosterAbsoluteUrl, shareVideoAbsoluteUrl } =
      await import("@/lib/share-posts");
    const clip = getSharePost(sharePostId);
    if (clip) {
      return {
        kind: "video",
        url: shareVideoAbsoluteUrl(clip.file),
        posterUrl: sharePosterAbsoluteUrl(clip.file),
      };
    }
  }
  const url = (mediaUrl || "").trim();
  if (!url || !/^https:\/\//i.test(url)) return null;
  if (/\.(mp4|mov|webm)(\?|$)/i.test(url) || /\/v\//i.test(url)) {
    return { kind: "video", url };
  }
  return { kind: "image", url };
}

async function publishInstagram(
  token: string,
  igUserId: string,
  caption: string,
  media: MetaMedia,
): Promise<PublishResult> {
  const tryCreate = async (m: MetaMedia) => {
    const createParams = new URLSearchParams({
      caption,
      access_token: token,
    });
    if (m.kind === "video") {
      createParams.set("media_type", "REELS");
      createParams.set("video_url", m.url);
      createParams.set("share_to_feed", "true");
    } else {
      createParams.set("image_url", m.url);
    }
    const createRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createParams,
    });
    const createJson = (await createRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!createRes.ok || !createJson.id) {
      throw new Error(createJson.error?.message || "Instagram media container failed");
    }
    return { id: createJson.id, kind: m.kind };
  };

  let container: { id: string; kind: "image" | "video" };
  try {
    container = await tryCreate(media);
  } catch (first) {
    // REELS often needs a verified domain — fall back to share-kit poster IMAGE.
    if (media.kind === "video") {
      const imageUrl = media.posterUrl || media.url.replace(/\.mp4(\?|$)/i, ".jpg$1");
      try {
        container = await tryCreate({ kind: "image", url: imageUrl });
      } catch {
        throw first instanceof Error ? first : new Error(String(first));
      }
    } else {
      throw first instanceof Error ? first : new Error(String(first));
    }
  }

  if (container.kind === "video") {
    await waitForIgContainer(token, container.id);
  }

  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      creation_id: container.id,
      access_token: token,
    }),
  });
  const pubJson = (await pubRes.json()) as { id?: string; error?: { message?: string } };
  if (!pubRes.ok || !pubJson.id) {
    throw new Error(pubJson.error?.message || "Instagram publish failed");
  }
  return {
    externalPostId: pubJson.id,
    externalUrl: `https://www.instagram.com/p/${pubJson.id}/`,
  };
}

async function waitForIgContainer(token: string, creationId: string) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`,
    );
    if (res.ok) {
      const json = (await res.json()) as { status_code?: string };
      if (json.status_code === "FINISHED") return;
      if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
        throw new Error(`Instagram media processing ${json.status_code}`);
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function publishFacebookPage(
  token: string,
  pageId: string,
  text: string,
): Promise<PublishResult> {
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      message: text.slice(0, 5000),
      access_token: token,
    }),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) throw new Error(json.error?.message || "Facebook publish failed");
  return {
    externalPostId: json.id,
    externalUrl: `https://facebook.com/${json.id}`,
  };
}

async function publishTikTokVideo(
  token: string,
  caption: string,
  sharePostId: string,
): Promise<PublishResult> {
  const { loadShareVideoBytes } = await import("@/lib/share-media.server");
  const { bytes } = await loadShareVideoBytes(sharePostId);
  const title = caption.slice(0, 150) || "Aura OS";

  // Prefer inbox upload (video.upload) — works before Direct Post approval.
  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: bytes.length,
        chunk_size: bytes.length,
        total_chunk_count: 1,
      },
    }),
  });
  const initJson = (await initRes.json()) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };
  if (!initRes.ok || !initJson.data?.upload_url || !initJson.data.publish_id) {
    // Fall back to Direct Post init when inbox is unavailable but publish is approved.
    const direct = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title,
          privacy_level: "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: bytes.length,
          chunk_size: bytes.length,
          total_chunk_count: 1,
        },
      }),
    });
    const directJson = (await direct.json()) as {
      data?: { publish_id?: string; upload_url?: string };
      error?: { code?: string; message?: string };
    };
    if (!direct.ok || !directJson.data?.upload_url || !directJson.data.publish_id) {
      throw new Error(
        initJson.error?.message ||
          directJson.error?.message ||
          "TikTok publish failed — confirm video.upload / video.publish scopes are approved.",
      );
    }
    await putTikTokVideo(directJson.data.upload_url, bytes);
    return {
      externalPostId: directJson.data.publish_id,
      externalUrl: null,
    };
  }

  await putTikTokVideo(initJson.data.upload_url, bytes);
  return {
    externalPostId: initJson.data.publish_id,
    externalUrl: null,
  };
}

async function putTikTokVideo(uploadUrl: string, bytes: Buffer) {
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}`,
      "Content-Length": String(bytes.length),
    },
    body: new Uint8Array(bytes),
  });
  if (!put.ok) {
    const err = await put.text().catch(() => "");
    throw new Error(err || "TikTok video upload failed");
  }
}

export type RemoteComment = {
  externalId: string;
  authorHandle: string | null;
  authorName: string | null;
  body: string;
  postExternalId?: string | null;
};

export async function fetchRecentComments(
  provider: SocialProvider,
  companyId: string,
): Promise<RemoteComment[]> {
  const conn = await loadConnectionSecrets(companyId, provider);
  if (!conn) return [];

  switch (provider) {
    case "x":
      return fetchXMentions(conn.accessToken, conn.externalUserId);
    case "meta":
      return fetchMetaComments(conn.accessToken, conn.metaPageId, conn.igUserId);
    case "linkedin":
      // LinkedIn comment APIs need org/page products — return empty until Marketing API is approved.
      return [];
    case "tiktok":
      return [];
    case "farcaster": {
      const fid = Number(conn.externalUserId ?? 0);
      if (!fid || !process.env["NEYNAR_API_KEY"]) return [];
      const { fetchFarcasterNotifications } = await import("@/lib/farcaster-neynar.server");
      return fetchFarcasterNotifications(fid);
    }
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

async function fetchXMentions(token: string, userId: string | null): Promise<RemoteComment[]> {
  if (!userId) return [];
  const url = new URL(`https://api.twitter.com/2/users/${userId}/mentions`);
  url.searchParams.set("max_results", "20");
  url.searchParams.set("tweet.fields", "author_id,conversation_id,created_at");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: Array<{ id: string; text: string; author_id?: string }>;
    includes?: { users?: Array<{ id: string; username?: string; name?: string }> };
  };
  const users = new Map((json.includes?.users ?? []).map((u) => [u.id, u]));
  return (json.data ?? []).map((t) => {
    const author = t.author_id ? users.get(t.author_id) : undefined;
    return {
      externalId: t.id,
      authorHandle: author?.username ? `@${author.username}` : null,
      authorName: author?.name ?? null,
      body: t.text,
      postExternalId: null,
    };
  });
}

async function fetchMetaComments(
  token: string,
  pageId: string | null,
  igUserId: string | null,
): Promise<RemoteComment[]> {
  const out: RemoteComment[] = [];
  if (pageId) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/feed?fields=id,comments.limit(10){id,from,message}&limit=5&access_token=${encodeURIComponent(token)}`,
    );
    if (res.ok) {
      const json = (await res.json()) as {
        data?: Array<{
          id: string;
          comments?: { data?: Array<{ id: string; message?: string; from?: { name?: string } }> };
        }>;
      };
      for (const post of json.data ?? []) {
        for (const c of post.comments?.data ?? []) {
          out.push({
            externalId: c.id,
            authorHandle: null,
            authorName: c.from?.name ?? null,
            body: c.message ?? "",
            postExternalId: post.id,
          });
        }
      }
    }
  }
  if (igUserId) {
    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media?fields=id,comments.limit(10){id,text,username}&limit=5&access_token=${encodeURIComponent(token)}`,
    );
    if (mediaRes.ok) {
      const json = (await mediaRes.json()) as {
        data?: Array<{
          id: string;
          comments?: {
            data?: Array<{ id: string; text?: string; username?: string }>;
          };
        }>;
      };
      for (const media of json.data ?? []) {
        for (const c of media.comments?.data ?? []) {
          out.push({
            externalId: c.id,
            authorHandle: c.username ? `@${c.username}` : null,
            authorName: c.username ?? null,
            body: c.text ?? "",
            postExternalId: media.id,
          });
        }
      }
    }
  }
  return out.filter((c) => c.body.trim().length > 0);
}

export async function replyToEngagement(
  provider: SocialProvider,
  companyId: string,
  externalId: string,
  replyBody: string,
): Promise<string> {
  const conn = await loadConnectionSecrets(companyId, provider);
  if (!conn) throw new Error(`Connect ${provider} first.`);

  switch (provider) {
    case "x": {
      const result = await publishX(conn.accessToken, replyBody, externalId);
      return result.externalPostId;
    }
    case "meta": {
      const res = await fetch(`https://graph.facebook.com/v21.0/${externalId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          message: replyBody.slice(0, 2000),
          access_token: conn.accessToken,
        }),
      });
      const json = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || !json.id) throw new Error(json.error?.message || "Meta reply failed");
      return json.id;
    }
    case "linkedin":
      throw new Error("LinkedIn comment replies need Marketing API access.");
    case "tiktok":
      throw new Error("TikTok comment replies are not available via API yet.");
    case "farcaster": {
      const res = await fetch("https://api.neynar.com/v2/farcaster/cast/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_key: process.env["NEYNAR_API_KEY"]!,
          Accept: "application/json",
        },
        body: JSON.stringify({
          signer_uuid: conn.accessToken,
          text: replyBody.slice(0, 320),
          parent: externalId,
        }),
      });
      const json = (await res.json()) as { cast?: { hash?: string }; message?: string };
      if (!res.ok || !json.cast?.hash) throw new Error(json.message || "Farcaster reply failed");
      return json.cast.hash;
    }
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

/** Draft a short on-brand reply with the company's standing instruction. */
export async function draftSocialReply(opts: {
  companyId?: string;
  companyName: string;
  instruction?: string | null;
  author: string | null;
  comment: string;
  provider: string;
}): Promise<string> {
  try {
    if (opts.companyId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { burnAuraHard } = await import("@/lib/aura-spend.server");
      await burnAuraHard(
        supabaseAdmin as never,
        opts.companyId,
        2,
        `Social reply draft · ${opts.provider}`,
      );
    }
    const { detectAiLang, languageStyleBlock, sanitizeBrandNames } =
      await import("@/lib/ai-language");
    const { delimitUntrusted } = await import("@/lib/ai-untrusted");
    const lang = detectAiLang(opts.comment);
    const json = (await agentJson(
      `You are ${opts.provider === "linkedin" ? "Orin" : "Vela"}, the growth agent for ${opts.companyName}. Write one short public reply.
${languageStyleBlock(lang)}
Calm, helpful, on-brand. No hashtag spam. Under 220 characters for X when needed. Match the commenter's language.
Return JSON {"reply":"..."}.`,
      [
        delimitUntrusted(
          "standing_instruction",
          opts.instruction ?? "Match the brand's calm voice.",
          800,
        ),
        delimitUntrusted("author", opts.author ?? "someone", 120),
        delimitUntrusted("comment", opts.comment, 1200),
      ].join("\n"),
      "reply",
    )) as { reply?: string };
    const reply = sanitizeBrandNames(
      (
        json.reply ??
        (lang === "de"
          ? "Danke fürs Teilen — wir schauen uns das an."
          : "Thanks for sharing that — we'll take a look.")
      ).trim(),
    );
    return reply;
  } catch (e) {
    if (e instanceof Error && e.name === "InsufficientAuraError") throw e;
    return "Thanks for the note — appreciated.";
  }
}
