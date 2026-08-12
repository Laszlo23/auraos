// Server-only social OAuth helpers for X, LinkedIn, Meta, TikTok, and Farcaster.
import { createHash, randomBytes } from "node:crypto";

import { decryptConnectionKey, encryptConnectionKey } from "@/server/connectionKeyCrypto";

export type SocialProvider = "x" | "linkedin" | "meta" | "tiktok" | "farcaster";

export const ALL_SOCIAL_PROVIDERS: SocialProvider[] = [
  "x",
  "meta",
  "linkedin",
  "tiktok",
  "farcaster",
];

export function isSocialProvider(v: unknown): v is SocialProvider {
  return (
    v === "x" || v === "linkedin" || v === "meta" || v === "tiktok" || v === "farcaster"
  );
}

export type SocialTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scopes?: string | null;
  externalUserId?: string | null;
  handle?: string | null;
  metaPageId?: string | null;
  metaPageName?: string | null;
  igUserId?: string | null;
};

export const SOCIAL_AGENTS: Record<SocialProvider, string> = {
  x: "Vela",
  meta: "Vela",
  linkedin: "Orin",
  tiktok: "Vela",
  farcaster: "Orin",
};

export const SOCIAL_LABELS: Record<SocialProvider, string> = {
  x: "X",
  meta: "Meta",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  farcaster: "Farcaster",
};

function base64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newPkce() {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const state = base64Url(randomBytes(24));
  return { verifier, challenge, state };
}

export function redirectBase(request: Request): string {
  return (
    process.env["OAUTH_REDIRECT_BASE"] ||
    process.env["SITE_URL"] ||
    new URL(request.url).origin
  ).replace(/\/$/, "");
}

function linkedInClientId(): string | undefined {
  return process.env["LINKEDIN_CLIENT_ID"] || process.env["LINKEDIN_APP_ID"] || undefined;
}

function linkedInClientSecret(): string | undefined {
  return process.env["LINKEDIN_CLIENT_SECRET"] || process.env["LINKEDIN_APP_SECRET"] || undefined;
}

export function socialConfigured(provider: SocialProvider): boolean {
  switch (provider) {
    case "x":
      return Boolean(process.env["X_CLIENT_ID"] && process.env["X_CLIENT_SECRET"]);
    case "linkedin":
      return Boolean(linkedInClientId() && linkedInClientSecret());
    case "meta":
      return Boolean(process.env["META_APP_ID"] && process.env["META_APP_SECRET"]);
    case "tiktok":
      return Boolean(process.env["TIKTOK_CLIENT_KEY"] && process.env["TIKTOK_CLIENT_SECRET"]);
    case "farcaster": {
      // Agent/bot signer (NEYNAR_AGENT_ID) OR classic FID + custody key.
      const api = Boolean(process.env["NEYNAR_API_KEY"]?.trim());
      const agent =
        process.env["NEYNAR_AGENT_ID"]?.trim() || process.env["NEYNAR_SIGNER_UUID"]?.trim();
      const fid =
        process.env["NEYNAR_FARCASTER_FID"]?.trim() || process.env["NEYNAR_UID"]?.trim();
      const custody = process.env["NEYNAR_CUSTODY_PRIVATE_KEY"]?.trim();
      return Boolean(api && (agent || (fid && custody)));
    }
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

export function authorizeUrl(
  provider: SocialProvider,
  opts: { redirectUri: string; state: string; challenge: string },
): string {
  switch (provider) {
    case "x": {
      const url = new URL("https://twitter.com/i/oauth2/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", process.env["X_CLIENT_ID"]!);
      url.searchParams.set("redirect_uri", opts.redirectUri);
      url.searchParams.set(
        "scope",
        "tweet.read tweet.write users.read offline.access like.read media.write",
      );
      url.searchParams.set("state", opts.state);
      url.searchParams.set("code_challenge", opts.challenge);
      url.searchParams.set("code_challenge_method", "S256");
      return url.toString();
    }
    case "linkedin": {
      const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", linkedInClientId()!);
      url.searchParams.set("redirect_uri", opts.redirectUri);
      url.searchParams.set("state", opts.state);
      // openid/profile/email = Sign In with LinkedIn (connect works).
      // w_member_social needs the "Share on LinkedIn" product approved — append when granted.
      const scopes = ["openid", "profile", "email"];
      if (process.env["LINKEDIN_SHARE_SCOPE"] === "1") scopes.push("w_member_social");
      url.searchParams.set("scope", scopes.join(" "));
      return url.toString();
    }
    case "meta": {
      const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
      url.searchParams.set("client_id", process.env["META_APP_ID"]!);
      url.searchParams.set("redirect_uri", opts.redirectUri);
      url.searchParams.set("state", opts.state);
      url.searchParams.set(
        "scope",
        [
          "pages_show_list",
          "pages_manage_posts",
          "pages_read_engagement",
          "pages_manage_engagement",
          "instagram_basic",
          "instagram_manage_comments",
          "instagram_content_publish",
          "business_management",
        ].join(","),
      );
      return url.toString();
    }
    case "tiktok": {
      const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
      url.searchParams.set("client_key", process.env["TIKTOK_CLIENT_KEY"]!);
      url.searchParams.set("redirect_uri", opts.redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "user.info.basic,video.upload,video.publish");
      url.searchParams.set("state", opts.state);
      return url.toString();
    }
    case "farcaster":
      throw new Error("Farcaster uses the Neynar signer flow — call startFarcasterConnect instead.");
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

async function exchangeX(
  code: string,
  redirectUri: string,
  verifier: string,
): Promise<SocialTokens> {
  const clientId = process.env["X_CLIENT_ID"]!;
  const clientSecret = process.env["X_CLIENT_SECRET"]!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error_description?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || tokenJson.error || "X token exchange failed");
  }

  let handle: string | null = null;
  let externalUserId: string | null = null;
  const meRes = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  let followers = 0;
  if (meRes.ok) {
    const me = (await meRes.json()) as {
      data?: { id?: string; username?: string; public_metrics?: { followers_count?: number } };
    };
    handle = me.data?.username ? `@${me.data.username}` : null;
    externalUserId = me.data?.id ?? null;
    followers = me.data?.public_metrics?.followers_count ?? 0;
  }

  return {
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    expiresAt: tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
      : null,
    scopes: tokenJson.scope ?? null,
    externalUserId,
    handle,
    metaPageId: null,
    metaPageName: null,
    igUserId: null,
    // stash followers via handle path — caller reads handle; followers returned separately via extras
    ...(followers ? {} : {}),
  };
}

async function exchangeLinkedIn(code: string, redirectUri: string): Promise<SocialTokens> {
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: linkedInClientId()!,
      client_secret: linkedInClientSecret()!,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error_description?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      tokenJson.error_description || tokenJson.error || "LinkedIn token exchange failed",
    );
  }

  let handle: string | null = null;
  let externalUserId: string | null = null;
  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (meRes.ok) {
    const me = (await meRes.json()) as { sub?: string; name?: string; email?: string };
    externalUserId = me.sub ?? null;
    handle = me.name ?? me.email ?? null;
  }

  return {
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    expiresAt: tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
      : null,
    scopes: tokenJson.scope ?? null,
    externalUserId,
    handle,
  };
}

async function exchangeMeta(code: string, redirectUri: string): Promise<SocialTokens> {
  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", process.env["META_APP_ID"]!);
  tokenUrl.searchParams.set("client_secret", process.env["META_APP_SECRET"]!);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);
  const shortRes = await fetch(tokenUrl);
  const shortJson = (await shortRes.json()) as {
    access_token?: string;
    error?: { message?: string };
  };
  if (!shortRes.ok || !shortJson.access_token) {
    throw new Error(shortJson.error?.message || "Meta token exchange failed");
  }

  // Long-lived user token
  const llUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  llUrl.searchParams.set("grant_type", "fb_exchange_token");
  llUrl.searchParams.set("client_id", process.env["META_APP_ID"]!);
  llUrl.searchParams.set("client_secret", process.env["META_APP_SECRET"]!);
  llUrl.searchParams.set("fb_exchange_token", shortJson.access_token);
  const llRes = await fetch(llUrl);
  const llJson = (await llRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const userToken = llJson.access_token || shortJson.access_token;

  const meRes = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(userToken)}`,
  );
  const me = (await meRes.json()) as { id?: string; name?: string };

  // Prefer a Page token (needed for posting + Instagram)
  let pageToken = userToken;
  let metaPageId: string | null = null;
  let metaPageName: string | null = null;
  let igUserId: string | null = null;
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(userToken)}`,
  );
  if (pagesRes.ok) {
    const pages = (await pagesRes.json()) as {
      data?: Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: { id: string };
      }>;
    };
    const page = pages.data?.[0];
    if (page) {
      pageToken = page.access_token;
      metaPageId = page.id;
      metaPageName = page.name;
      igUserId = page.instagram_business_account?.id ?? null;
    }
  }

  return {
    accessToken: pageToken,
    // Keep long-lived user token so we can re-mint Page tokens before expiry.
    refreshToken: userToken,
    expiresAt: llJson.expires_in
      ? new Date(Date.now() + llJson.expires_in * 1000).toISOString()
      : null,
    scopes: null,
    externalUserId: me.id ?? null,
    handle: metaPageName ? `${metaPageName}${igUserId ? " · IG" : ""}` : (me.name ?? null),
    metaPageId,
    metaPageName,
    igUserId,
  };
}

async function exchangeTikTok(code: string, redirectUri: string): Promise<SocialTokens> {
  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: process.env["TIKTOK_CLIENT_KEY"]!,
      client_secret: process.env["TIKTOK_CLIENT_SECRET"]!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    open_id?: string;
    scope?: string;
    error?: string;
    error_description?: string;
    message?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      tokenJson.error_description ||
        tokenJson.message ||
        tokenJson.error ||
        "TikTok token exchange failed",
    );
  }

  let handle: string | null = null;
  const meRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url",
    { headers: { Authorization: `Bearer ${tokenJson.access_token}` } },
  );
  if (meRes.ok) {
    const me = (await meRes.json()) as {
      data?: { user?: { display_name?: string; username?: string; open_id?: string } };
    };
    const user = me.data?.user;
    handle = user?.username ? `@${user.username}` : (user?.display_name ?? null);
  }

  return {
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    expiresAt: tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
      : null,
    scopes: tokenJson.scope ?? null,
    externalUserId: tokenJson.open_id ?? null,
    handle,
  };
}

export async function exchangeCode(
  provider: SocialProvider,
  code: string,
  redirectUri: string,
  verifier: string,
): Promise<SocialTokens> {
  switch (provider) {
    case "x":
      return exchangeX(code, redirectUri, verifier);
    case "linkedin":
      return exchangeLinkedIn(code, redirectUri);
    case "meta":
      return exchangeMeta(code, redirectUri);
    case "tiktok":
      return exchangeTikTok(code, redirectUri);
    case "farcaster":
      throw new Error("Farcaster does not use OAuth code exchange.");
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

export async function refreshAccessToken(
  provider: SocialProvider,
  refreshToken: string,
  opts?: { metaPageId?: string | null },
): Promise<SocialTokens | null> {
  if (provider === "x") {
    const clientId = process.env["X_CLIENT_ID"]!;
    const clientSecret = process.env["X_CLIENT_SECRET"]!;
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!res.ok || !json.access_token) return null;
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
      scopes: json.scope ?? null,
    };
  }
  if (provider === "linkedin") {
    // LinkedIn refresh requires refresh_token grant when issued
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: linkedInClientId()!,
        client_secret: linkedInClientSecret()!,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!res.ok || !json.access_token) return null;
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
    };
  }
  if (provider === "tiktok") {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: new URLSearchParams({
        client_key: process.env["TIKTOK_CLIENT_KEY"]!,
        client_secret: process.env["TIKTOK_CLIENT_SECRET"]!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!res.ok || !json.access_token) return null;
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
      scopes: json.scope ?? null,
    };
  }
  if (provider === "meta") {
    // refreshToken holds the long-lived *user* token; re-exchange + re-fetch Page token.
    return refreshMetaPageToken(refreshToken, opts?.metaPageId ?? null);
  }
  return null;
}

async function refreshMetaPageToken(
  userToken: string,
  preferredPageId: string | null,
): Promise<SocialTokens | null> {
  const appId = process.env["META_APP_ID"];
  const appSecret = process.env["META_APP_SECRET"];
  if (!appId || !appSecret) return null;

  const llUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  llUrl.searchParams.set("grant_type", "fb_exchange_token");
  llUrl.searchParams.set("client_id", appId);
  llUrl.searchParams.set("client_secret", appSecret);
  llUrl.searchParams.set("fb_exchange_token", userToken);
  const llRes = await fetch(llUrl);
  const llJson = (await llRes.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  const nextUser = llJson.access_token || userToken;

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(nextUser)}`,
  );
  if (!pagesRes.ok) return null;
  const pages = (await pagesRes.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string };
    }>;
  };
  const page =
    (preferredPageId ? pages.data?.find((p) => p.id === preferredPageId) : null) ??
    pages.data?.[0];
  if (!page?.access_token) return null;

  return {
    accessToken: page.access_token,
    refreshToken: nextUser,
    expiresAt: llJson.expires_in
      ? new Date(Date.now() + llJson.expires_in * 1000).toISOString()
      : new Date(Date.now() + 55 * 24 * 3600 * 1000).toISOString(),
    metaPageId: page.id,
    metaPageName: page.name,
    igUserId: page.instagram_business_account?.id ?? null,
    handle: `${page.name}${page.instagram_business_account ? " · IG" : ""}`,
  };
}

export function encryptToken(value: string): string {
  return encryptConnectionKey(value);
}

export function decryptToken(value: string): string {
  return decryptConnectionKey(value);
}

export type ConnectionSecrets = {
  id: string;
  company_id: string;
  provider: SocialProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  externalUserId: string | null;
  metaPageId: string | null;
  igUserId: string | null;
  reply_mode: string;
  handle: string | null;
};

export async function loadConnectionSecrets(
  companyId: string,
  provider: SocialProvider,
): Promise<ConnectionSecrets | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("channel_connections")
    .select(
      "id, company_id, provider, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, external_user_id, meta_page_id, ig_user_id, reply_mode, handle",
    )
    .eq("company_id", companyId)
    .eq("provider", provider)
    .eq("status", "connected")
    .maybeSingle();
  if (!data?.access_token_ciphertext) return null;

  let accessToken = decryptToken(data.access_token_ciphertext);
  let refreshToken = data.refresh_token_ciphertext
    ? decryptToken(data.refresh_token_ciphertext)
    : null;
  let expiresAt = data.token_expires_at as string | null;

  if (expiresAt && refreshToken && new Date(expiresAt).getTime() < Date.now() + 60_000) {
    const refreshed = await refreshAccessToken(provider, refreshToken, {
      metaPageId: data.meta_page_id,
    });
    if (refreshed) {
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken ?? refreshToken;
      expiresAt = refreshed.expiresAt ?? expiresAt;
      await supabaseAdmin
        .from("channel_connections")
        .update({
          access_token_ciphertext: encryptToken(accessToken),
          refresh_token_ciphertext: refreshToken ? encryptToken(refreshToken) : null,
          token_expires_at: expiresAt,
          ...(refreshed.metaPageId ? { meta_page_id: refreshed.metaPageId } : {}),
          ...(refreshed.igUserId !== undefined ? { ig_user_id: refreshed.igUserId } : {}),
          ...(refreshed.handle ? { handle: refreshed.handle } : {}),
          last_sync: new Date().toISOString(),
          status: "connected",
        })
        .eq("id", data.id);
    } else {
      // Do not keep a "connected" lie — founder must reconnect
      await supabaseAdmin
        .from("channel_connections")
        .update({
          status: "disconnected",
          access_token_ciphertext: null,
          refresh_token_ciphertext: null,
          last_sync: new Date().toISOString(),
        })
        .eq("id", data.id);
      return null;
    }
  } else if (expiresAt && !refreshToken && new Date(expiresAt).getTime() < Date.now()) {
    await supabaseAdmin
      .from("channel_connections")
      .update({
        status: "disconnected",
        access_token_ciphertext: null,
        last_sync: new Date().toISOString(),
      })
      .eq("id", data.id);
    return null;
  }

  return {
    id: data.id,
    company_id: data.company_id,
    provider: data.provider as SocialProvider,
    accessToken,
    refreshToken,
    expiresAt,
    externalUserId: data.external_user_id,
    metaPageId: data.meta_page_id,
    igUserId: data.ig_user_id,
    reply_mode: data.reply_mode ?? "auto",
    handle: data.handle,
  };
}

export async function saveConnectionTokens(
  companyId: string,
  provider: SocialProvider,
  tokens: SocialTokens,
  extras?: { followers?: number },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const values = {
    status: "connected",
    last_sync: new Date().toISOString(),
    handle: tokens.handle ?? null,
    agent_name: SOCIAL_AGENTS[provider],
    access_token_ciphertext: encryptToken(tokens.accessToken),
    refresh_token_ciphertext: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
    token_expires_at: tokens.expiresAt ?? null,
    scopes: tokens.scopes ?? null,
    external_user_id: tokens.externalUserId ?? null,
    meta_page_id: tokens.metaPageId ?? null,
    meta_page_name: tokens.metaPageName ?? null,
    ig_user_id: tokens.igUserId ?? null,
    followers: extras?.followers ?? 0,
    engagement: 0,
    reach: 0,
    reply_mode: "auto",
  };

  const { data: existing } = await supabaseAdmin
    .from("channel_connections")
    .select("id")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("channel_connections")
      .update(values)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .insert({ ...values, company_id: companyId, provider })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
