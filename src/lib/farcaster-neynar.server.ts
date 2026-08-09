// Neynar managed signer helpers for Farcaster channel connect.
import { privateKeyToAccount } from "viem/accounts";

import {
  encryptToken,
  saveConnectionTokens,
  socialConfigured,
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

export async function createFarcasterSignerPending(): Promise<FarcasterSignerPending> {
  if (!socialConfigured("farcaster")) {
    throw new Error(
      "Farcaster is not configured. Set NEYNAR_API_KEY, NEYNAR_FARCASTER_FID, and NEYNAR_CUSTODY_PRIVATE_KEY.",
    );
  }

  const appFid = Number(process.env["NEYNAR_FARCASTER_FID"]);
  if (!Number.isFinite(appFid) || appFid <= 0) {
    throw new Error("NEYNAR_FARCASTER_FID must be your app FID number.");
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
