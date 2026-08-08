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
  opts?: { replyToExternalId?: string | null },
): Promise<PublishResult> {
  const conn = await loadConnectionSecrets(companyId, provider);
  if (!conn) throw new Error(`Connect ${provider} first.`);

  switch (provider) {
    case "x":
      return publishX(conn.accessToken, body, opts?.replyToExternalId);
    case "linkedin":
      return publishLinkedIn(conn.accessToken, conn.externalUserId, body);
    case "meta":
      return publishMeta(conn.accessToken, conn.metaPageId, conn.igUserId, body);
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

async function publishX(
  token: string,
  text: string,
  replyTo?: string | null,
): Promise<PublishResult> {
  const payload: Record<string, unknown> = { text: text.slice(0, 280) };
  if (replyTo) payload["reply"] = { in_reply_to_tweet_id: replyTo };
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
    throw new Error(err || "LinkedIn publish failed");
  }
  return { externalPostId: id || `li-${Date.now()}`, externalUrl: null };
}

async function publishMeta(
  token: string,
  pageId: string | null,
  igUserId: string | null,
  text: string,
): Promise<PublishResult> {
  // Prefer Instagram when linked; otherwise Facebook Page post.
  if (igUserId) {
    const create = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          caption: text.slice(0, 2200),
          media_type: "CAROUSEL", // text-only IG needs a media container; use PAGE post fallback if this fails
        }),
      },
    );
    // Text-only IG feed posts aren't supported without media — fall through to Page.
    if (!create.ok && pageId) {
      return publishFacebookPage(token, pageId, text);
    }
  }
  if (!pageId) throw new Error("Connect a Facebook Page to publish on Meta.");
  return publishFacebookPage(token, pageId, text);
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
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

/** Draft a short on-brand reply with the company's standing instruction. */
export async function draftSocialReply(opts: {
  companyName: string;
  instruction?: string | null;
  author: string | null;
  comment: string;
  provider: string;
}): Promise<string> {
  try {
    const json = (await agentJson(
      `You are ${opts.provider === "linkedin" ? "Orin" : "Vela"}, the growth agent for ${opts.companyName}. Write one short public reply. Calm, helpful, on-brand. No hashtags spam. Under 220 characters for X when needed. Return JSON {"reply":"..."}.`,
      `Standing instruction: ${opts.instruction ?? "Match the brand's calm voice."}\nAuthor: ${opts.author ?? "someone"}\nComment: ${opts.comment}`,
      "reply",
    )) as { reply?: string };
    return (json.reply ?? "Thanks for sharing that — we'll take a look.").trim();
  } catch {
    return "Thanks for the note — appreciated.";
  }
}
