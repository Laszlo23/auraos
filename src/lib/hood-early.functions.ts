import { createServerFn } from "@tanstack/react-start";

import { HOOD_EARLY_SUPPORTER_CAP, hoodEarlySlotsLeft, hoodEarlyWaveOpen } from "@/lib/hood-early";
import { hoodMintIsOpen } from "@/lib/hood-mint";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 12;
const rateBuckets = new Map<string, { n: number; reset: number }>();

function allowRate(key: string, max: number): boolean {
  const now = Date.now();
  const cur = rateBuckets.get(key);
  if (!cur || now > cur.reset) {
    rateBuckets.set(key, { n: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (cur.n >= max) return false;
  cur.n += 1;
  return true;
}

async function clientIp(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const forwarded = request.headers.get("x-forwarded-for") || "";
    const first = forwarded.split(",")[0]?.trim();
    return first || request.headers.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

export type HoodEarlyStatus = {
  configured: boolean;
  publicOpen: boolean;
  earlyCap: number;
  earlyOpen: boolean;
  totalMinted: number | null;
  slotsLeft: number | null;
};

export const getHoodEarlyStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<HoodEarlyStatus> => {
    const { hoodEarlyConfigured } = await import("@/lib/hood-early.server");
    const { genesisContractAddress, publicGenesisClient, GENESIS_ABI } =
      await import("@/lib/genesis.server");
    const publicOpen = hoodMintIsOpen();
    const configured = hoodEarlyConfigured();
    const contract = genesisContractAddress();
    let totalMinted: number | null = null;
    if (contract) {
      try {
        const client = publicGenesisClient();
        const n = await client.readContract({
          address: contract,
          abi: GENESIS_ABI,
          functionName: "totalMinted",
        });
        totalMinted = Number(n);
      } catch {
        totalMinted = null;
      }
    }
    const slotsLeft = totalMinted == null ? null : hoodEarlySlotsLeft(totalMinted);
    return {
      configured,
      publicOpen,
      earlyCap: HOOD_EARLY_SUPPORTER_CAP,
      earlyOpen: configured && hoodEarlyWaveOpen(totalMinted ?? 0, publicOpen),
      totalMinted,
      slotsLeft,
    };
  },
);

export const unlockHoodEarlyMint = createServerFn({ method: "POST" })
  .validator((input?: { password?: string }) => ({
    password: typeof input?.password === "string" ? input.password.slice(0, 200) : "",
  }))
  .handler(async ({ data }) => {
    const ip = await clientIp();
    if (!allowRate(`hood-early:${ip}`, MAX_PER_IP)) {
      return { ok: false as const, error: "rate" as const, permit: null, expiresAt: null };
    }

    const { hoodEarlyConfigured, verifyHoodEarlyPassword, issueHoodEarlyPermit } =
      await import("@/lib/hood-early.server");

    if (!hoodEarlyConfigured()) {
      return { ok: false as const, error: "unarmed" as const, permit: null, expiresAt: null };
    }
    if (hoodMintIsOpen()) {
      return { ok: false as const, error: "public_open" as const, permit: null, expiresAt: null };
    }
    if (!data.password.trim()) {
      return { ok: false as const, error: "empty" as const, permit: null, expiresAt: null };
    }
    if (!verifyHoodEarlyPassword(data.password)) {
      return { ok: false as const, error: "bad_pass" as const, permit: null, expiresAt: null };
    }

    const { genesisContractAddress, publicGenesisClient, GENESIS_ABI } =
      await import("@/lib/genesis.server");
    const contract = genesisContractAddress();
    if (contract) {
      try {
        const client = publicGenesisClient();
        const n = await client.readContract({
          address: contract,
          abi: GENESIS_ABI,
          functionName: "totalMinted",
        });
        if (hoodEarlySlotsLeft(Number(n)) <= 0) {
          return { ok: false as const, error: "sold_out" as const, permit: null, expiresAt: null };
        }
      } catch {
        /* allow unlock if RPC fails — mint UI will re-check */
      }
    }

    const issued = issueHoodEarlyPermit();
    return {
      ok: true as const,
      error: null,
      permit: issued.permit,
      expiresAt: issued.expiresAt,
    };
  });

export const checkHoodEarlyPermit = createServerFn({ method: "POST" })
  .validator((input?: { permit?: string }) => ({
    permit: typeof input?.permit === "string" ? input.permit.slice(0, 512) : "",
  }))
  .handler(async ({ data }) => {
    const { verifyHoodEarlyPermit } = await import("@/lib/hood-early.server");
    return { valid: verifyHoodEarlyPermit(data.permit) };
  });
