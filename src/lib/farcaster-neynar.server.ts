// Neynar managed signer helpers for Farcaster channel connect.
import { privateKeyToAccount } from "viem/accounts";

import {
  encryptToken,
  saveConnectionTokens,
  type SocialTokens,
} from "@/lib/social-oauth.server";

const NEYNAR_BASE = "https://api.neynar.com/v2";

function apiKey(): string {
  const key = process.env["NEYNAR_API_KEY"];
  if (!key) throw new Error("NEYNAR_API_KEY is not set");
  return key;
}

function neynarHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    api_key: apiKey(),
    Accept: "application/json",
  };
}

/** True when we can call Neynar read APIs (search, feeds, profiles). */
export function neynarApiConfigured(): boolean {
  return Boolean(process.env["NEYNAR_API_KEY"]?.trim());
}

/**
 * Bot / agent signer UUID from env.
 * Prefer NEYNAR_AGENT_ID (Neynar agent dashboard) or NEYNAR_SIGNER_UUID.
 */
export function neynarAgentSignerUuid(): string | null {
  const raw =
    process.env["NEYNAR_AGENT_ID"]?.trim() || process.env["NEYNAR_SIGNER_UUID"]?.trim() || "";
  return raw || null;
}

/** App / bot FID — NEYNAR_FARCASTER_FID or alias NEYNAR_UID. */
export function neynarFid(): number | null {
  const raw =
    process.env["NEYNAR_FARCASTER_FID"]?.trim() || process.env["NEYNAR_UID"]?.trim() || "";
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function neynarClientId(): string | null {
  return process.env["NEYNAR_CLIENT_ID"]?.trim() || null;
}

/** Custody key for classic managed-signer approval (optional when agent signer is set). */
function neynarCustodyKey(): string | null {
  return process.env["NEYNAR_CUSTODY_PRIVATE_KEY"]?.trim() || null;
}

/** One-click connect using an already-approved agent/bot signer. */
export function farcasterAgentConnectReady(): boolean {
  return Boolean(neynarApiConfigured() && neynarAgentSignerUuid());
}

/** Classic Warpcast-approve flow (create signer + custody EIP-712). */
export function farcasterManagedSignerReady(): boolean {
  return Boolean(neynarApiConfigured() && neynarFid() != null && neynarCustodyKey());
}

/** True when founders can connect a write signer (cast / reply). */
export function farcasterWriteConfigured(): boolean {
  return farcasterAgentConnectReady() || farcasterManagedSignerReady();
}

/** EIP-712 SignedKeyRequest for Farcaster key registry on Optimism. */
async function signKeyRequest(opts: {
  requestFid: number;
  publicKey: `0x${string}`;
  deadline: number;
}): Promise<string> {
  const raw = process.env["NEYNAR_CUSTODY_PRIVATE_KEY"];
  if (!raw) throw new Error("NEYNAR_CUSTODY_PRIVATE_KEY is not set");
  const pk = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  const account = privateKeyToAccount(pk);

  return account.signTypedData({
    domain: {
      name: "Farcaster SignedKeyRequestValidator",
      version: "1",
      chainId: 10,
      verifyingContract: "0x00000000FC259A00d73656738111cE493F5C9f60",
    },
    types: {
      SignedKeyRequest: [
        { name: "requestFid", type: "uint256" },
        { name: "key", type: "bytes" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "SignedKeyRequest",
    message: {
      requestFid: BigInt(opts.requestFid),
      key: opts.publicKey,
      deadline: BigInt(opts.deadline),
    },
  });
}

export type FarcasterSignerPending = {
  signerUuid: string;
  approvalUrl: string;
  publicKey: string;
  status: string;
};

export type FarcasterCastCard = {
  hash: string;
  text: string;
  author: string;
  authorFid: number;
  likes: number;
  recasts: number;
  replies: number;
  timestamp: string | null;
  url: string;
  channel: string | null;
};

export type FarcasterUserCard = {
  fid: number;
  username: string;
  displayName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  pfpUrl: string | null;
  score: number | null;
};

function mapCast(raw: Record<string, unknown>): FarcasterCastCard | null {
  const hash = typeof raw["hash"] === "string" ? raw["hash"] : null;
  if (!hash) return null;
  const author = (raw["author"] ?? {}) as Record<string, unknown>;
  const username = typeof author["username"] === "string" ? author["username"] : "unknown";
  const fid = Number(author["fid"] ?? 0);
  const reactions = (raw["reactions"] ?? {}) as Record<string, unknown>;
  const channel = (raw["channel"] ?? null) as { id?: string } | null;
  const repliesObj = raw["replies"] as { count?: number } | undefined;
  return {
    hash,
    text: String(raw["text"] ?? "").slice(0, 500),
    author: username,
    authorFid: fid,
    likes: Number(reactions["likes_count"] ?? 0),
    recasts: Number(reactions["recasts_count"] ?? 0),
    replies: Number(repliesObj?.count ?? 0),
    timestamp: typeof raw["timestamp"] === "string" ? raw["timestamp"] : null,
    url: `https://warpcast.com/${username}/${hash.slice(0, 10)}`,
    channel: channel?.id ?? null,
  };
}

export async function searchFarcasterCasts(
  query: string,
  limit = 12,
): Promise<FarcasterCastCard[]> {
  const q = query.trim().slice(0, 120);
  if (!q) return [];
  const url = new URL(`${NEYNAR_BASE}/farcaster/cast/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(Math.min(25, Math.max(1, limit))));
  const res = await fetch(url, { headers: neynarHeaders() });
  const json = (await res.json()) as {
    result?: { casts?: Record<string, unknown>[] };
    message?: string;
  };
  if (!res.ok) throw new Error(json.message || `Cast search failed (${res.status})`);
  return (json.result?.casts ?? [])
    .map((c) => mapCast(c))
    .filter((c): c is FarcasterCastCard => Boolean(c));
}

export async function fetchChannelFeed(
  channelId: string,
  limit = 12,
): Promise<FarcasterCastCard[]> {
  const id = channelId.replace(/^\/+/, "").trim().slice(0, 64) || "base";
  const url = new URL(`${NEYNAR_BASE}/farcaster/feed/channels`);
  url.searchParams.set("channel_ids", id);
  url.searchParams.set("with_recasts", "false");
  url.searchParams.set("limit", String(Math.min(25, Math.max(1, limit))));
  const res = await fetch(url, { headers: neynarHeaders() });
  const json = (await res.json()) as {
    casts?: Record<string, unknown>[];
    message?: string;
  };
  if (!res.ok) throw new Error(json.message || `Channel feed failed (${res.status})`);
  return (json.casts ?? [])
    .map((c) => mapCast(c))
    .filter((c): c is FarcasterCastCard => Boolean(c));
}

export async function searchFarcasterUsers(
  query: string,
  limit = 8,
): Promise<FarcasterUserCard[]> {
  const q = query.trim().replace(/^@/, "").slice(0, 64);
  if (!q) return [];
  const url = new URL(`${NEYNAR_BASE}/farcaster/user/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(Math.min(20, Math.max(1, limit))));
  const res = await fetch(url, { headers: neynarHeaders() });
  const json = (await res.json()) as {
    result?: { users?: Record<string, unknown>[] };
    message?: string;
  };
  if (!res.ok) throw new Error(json.message || `User search failed (${res.status})`);
  return (json.result?.users ?? []).map((u) => {
    const profile = (u["profile"] ?? {}) as { bio?: { text?: string } };
    return {
      fid: Number(u["fid"] ?? 0),
      username: String(u["username"] ?? ""),
      displayName: String(u["display_name"] ?? u["username"] ?? ""),
      bio: String(profile.bio?.text ?? "").slice(0, 240),
      followerCount: Number(u["follower_count"] ?? 0),
      followingCount: Number(u["following_count"] ?? 0),
      pfpUrl: typeof u["pfp_url"] === "string" ? u["pfp_url"] : null,
      score: typeof u["score"] === "number" ? u["score"] : null,
    };
  });
}

/** Mentions / replies for a connected FID (needs write connect to act on them). */
export async function fetchFarcasterNotifications(fid: number): Promise<
  Array<{
    externalId: string;
    authorHandle: string | null;
    authorName: string | null;
    body: string;
  }>
> {
  if (!fid) return [];
  const url = new URL(`${NEYNAR_BASE}/farcaster/notifications`);
  url.searchParams.set("fid", String(fid));
  url.searchParams.set("type", "mentions,replies");
  url.searchParams.set("priority_mode", "false");
  const res = await fetch(url, { headers: neynarHeaders() });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    notifications?: Array<{
      cast?: {
        hash?: string;
        text?: string;
        author?: { username?: string; display_name?: string };
      };
    }>;
  };
  return (json.notifications ?? [])
    .map((n) => {
      const cast = n.cast;
      if (!cast?.hash || !cast.text) return null;
      return {
        externalId: cast.hash,
        authorHandle: cast.author?.username ? `@${cast.author.username}` : null,
        authorName: cast.author?.display_name ?? null,
        body: cast.text.slice(0, 500),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
}

/**
 * Attach the env agent signer to a company (no Warpcast popup).
 * Uses NEYNAR_AGENT_ID / NEYNAR_SIGNER_UUID — must already be approved with write perms.
 */
export async function connectEnvAgentSigner(companyId: string): Promise<{
  handle: string | null;
  fid: number | null;
  signerUuid: string;
}> {
  const uuid = neynarAgentSignerUuid();
  if (!uuid) {
    throw new Error("Set NEYNAR_AGENT_ID (or NEYNAR_SIGNER_UUID) to connect the bot signer.");
  }
  const status = await lookupFarcasterSigner(uuid);
  if (status.status !== "approved") {
    throw new Error(
      `Neynar agent signer is ${status.status} — approve it in the Neynar dashboard first.`,
    );
  }
  await saveApprovedFarcasterSigner(companyId, status);
  return {
    handle: status.username,
    fid: status.fid,
    signerUuid: status.signerUuid,
  };
}

export async function createFarcasterSignerPending(): Promise<FarcasterSignerPending> {
  if (!farcasterManagedSignerReady()) {
    throw new Error(
      "Managed Farcaster connect needs NEYNAR_API_KEY, NEYNAR_FARCASTER_FID (or NEYNAR_UID), and NEYNAR_CUSTODY_PRIVATE_KEY. Or set NEYNAR_AGENT_ID for one-click bot connect.",
    );
  }

  const appFid = neynarFid();
  if (appFid == null) {
    throw new Error("NEYNAR_FARCASTER_FID (or NEYNAR_UID) must be your FID number.");
  }

  const createRes = await fetch(`${NEYNAR_BASE}/farcaster/signer/`, {
    method: "POST",
    headers: neynarHeaders(),
  });
  const created = (await createRes.json()) as {
    signer_uuid?: string;
    public_key?: string;
    status?: string;
    message?: string;
    code?: string;
  };
  if (!createRes.ok || !created.signer_uuid || !created.public_key) {
    throw new Error(created.message || created.code || "Could not create Farcaster signer");
  }

  const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const publicKey = (
    created.public_key.startsWith("0x") ? created.public_key : `0x${created.public_key}`
  ) as `0x${string}`;
  const signature = await signKeyRequest({
    requestFid: appFid,
    publicKey,
    deadline,
  });

  const regRes = await fetch(`${NEYNAR_BASE}/farcaster/signer/signed_key/`, {
    method: "POST",
    headers: neynarHeaders(),
    body: JSON.stringify({
      signer_uuid: created.signer_uuid,
      app_fid: appFid,
      deadline,
      signature,
      sponsor: { sponsored_by_neynar: true },
    }),
  });
  const registered = (await regRes.json()) as {
    signer_uuid?: string;
    signer_approval_url?: string;
    status?: string;
    message?: string;
  };
  if (!regRes.ok || !registered.signer_approval_url) {
    throw new Error(
      registered.message || "Could not register Farcaster signer — check app FID and custody key.",
    );
  }

  return {
    signerUuid: registered.signer_uuid || created.signer_uuid,
    approvalUrl: registered.signer_approval_url,
    publicKey: created.public_key,
    status: registered.status || "pending_approval",
  };
}

export type FarcasterSignerStatus = {
  status: "generated" | "pending_approval" | "approved" | "revoked" | string;
  fid: number | null;
  username: string | null;
  signerUuid: string;
};

export async function lookupFarcasterSigner(signerUuid: string): Promise<FarcasterSignerStatus> {
  const res = await fetch(
    `${NEYNAR_BASE}/farcaster/signer/?signer_uuid=${encodeURIComponent(signerUuid)}`,
    { headers: neynarHeaders() },
  );
  const json = (await res.json()) as {
    status?: string;
    fid?: number;
    signer_uuid?: string;
    message?: string;
  };
  if (!res.ok) throw new Error(json.message || "Signer lookup failed");

  let username: string | null = null;
  if (json.status === "approved" && json.fid) {
    try {
      const userRes = await fetch(
        `${NEYNAR_BASE}/farcaster/user/bulk?fids=${json.fid}`,
        { headers: neynarHeaders() },
      );
      if (userRes.ok) {
        const users = (await userRes.json()) as {
          users?: Array<{ username?: string }>;
        };
        const u = users.users?.[0]?.username;
        username = u ? `@${u}` : null;
      }
    } catch {
      /* optional */
    }
  }

  return {
    status: json.status || "pending_approval",
    fid: json.fid ?? null,
    username,
    signerUuid: json.signer_uuid || signerUuid,
  };
}

export async function saveApprovedFarcasterSigner(
  companyId: string,
  signer: FarcasterSignerStatus,
): Promise<string> {
  if (signer.status !== "approved") {
    throw new Error("Signer is not approved yet — open the Warpcast link and approve.");
  }
  const tokens: SocialTokens = {
    accessToken: signer.signerUuid,
    refreshToken: null,
    expiresAt: null,
    scopes: "neynar:signer",
    externalUserId: signer.fid != null ? String(signer.fid) : null,
    handle: signer.username,
  };
  return saveConnectionTokens(companyId, "farcaster", tokens);
}

export async function publishFarcasterCast(
  signerUuid: string,
  text: string,
): Promise<{ hash: string; url: string | null }> {
  const res = await fetch(`${NEYNAR_BASE}/farcaster/cast/`, {
    method: "POST",
    headers: neynarHeaders(),
    body: JSON.stringify({
      signer_uuid: signerUuid,
      text: text.slice(0, 320),
    }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    cast?: { hash?: string; author?: { username?: string } };
    message?: string;
  };
  if (!res.ok || !json.cast?.hash) {
    throw new Error(json.message || "Farcaster cast failed");
  }
  const hash = json.cast.hash;
  const user = json.cast.author?.username;
  return {
    hash,
    url: user ? `https://warpcast.com/${user}/${hash.slice(0, 10)}` : `https://warpcast.com/~/conversations/${hash}`,
  };
}

/** Encrypt a pending signer uuid for short-lived oauth state rows if needed. */
export function encryptSignerUuid(uuid: string): string {
  return encryptToken(uuid);
}
