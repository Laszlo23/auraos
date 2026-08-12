/**
 * Quidli Connect REST client — POST /lookup + POST /drop
 * Spec: https://api.connect.quid.li/openapi.json
 */
import { createHash } from "node:crypto";

import {
  quidliApiBase,
  quidliApiKey,
  quidliRewardChainId,
  quidliRewardTokenAddress,
  usdcToBaseUnits,
} from "@/lib/quidli/env";
import type { QuidliPlatform } from "@/lib/quidli/policy";

export type QuidliDropParams = {
  platform: QuidliPlatform;
  handle: string;
  amountUsdc: number;
  memo?: string;
  idempotencyKey: string;
};

export type QuidliDropResult =
  | { ok: true; quidliRef: string | null; status: "submitted"; raw: unknown }
  | { ok: false; error: string; detail?: string };

/** Deterministic UUIDv4-shaped key (API requires UUID format). */
export function quidliIdempotencyUuid(seed: string): string {
  const h = createHash("sha256").update(seed).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-key": apiKey,
  };
}

function recipientType(platform: QuidliPlatform): string {
  if (platform === "twitter") return "twitter";
  if (platform === "farcaster") return "farcaster";
  if (platform === "telegram") return "telegram";
  if (platform === "email") return "email";
  if (platform === "github") return "github";
  return platform;
}

function buildRecipient(platform: QuidliPlatform, handle: string, amountUnits?: string) {
  const type = recipientType(platform);
  const base =
    type === "email"
      ? { type: "email", id: handle }
      : { type, username: handle.replace(/^@/, "") };
  if (amountUnits) return { ...base, amountInWei: amountUnits };
  return base;
}

function extractRef(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  for (const k of ["transferHash", "id", "reference", "ref", "delivery_id", "deliveryId"]) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export async function lookupHandle(opts: {
  platform: QuidliPlatform;
  handle: string;
}): Promise<{ ok: true; raw: unknown } | { ok: false; error: string; detail?: string }> {
  const apiKey = quidliApiKey();
  if (!apiKey) return { ok: false, error: "not_configured" };
  const base = quidliApiBase();
  const body = {
    recipients: [buildRecipient(opts.platform, opts.handle)],
  };
  try {
    const res = await fetch(`${base}/lookup`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text.trim()) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = { raw: text.slice(0, 2000) };
      }
    }
    if (res.ok) return { ok: true, raw: parsed };
    return {
      ok: false,
      error: `http_${res.status}`,
      detail: text.slice(0, 500),
    };
  } catch (err) {
    return {
      ok: false,
      error: "lookup_unreachable",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function dropToHandles(params: QuidliDropParams): Promise<QuidliDropResult> {
  const apiKey = quidliApiKey();
  if (!apiKey) return { ok: false, error: "not_configured" };

  const base = quidliApiBase();
  const amountUnits = usdcToBaseUnits(params.amountUsdc);
  const idempotencyKey = quidliIdempotencyUuid(params.idempotencyKey);
  const body = {
    idempotencyKey,
    chainId: quidliRewardChainId(),
    tokenContract: quidliRewardTokenAddress(),
    amountInWeiPerRecipient: amountUnits,
    recipients: [buildRecipient(params.platform, params.handle, amountUnits)],
  };

  try {
    const res = await fetch(`${base}/drop?ignoreFailedRecipients=false`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text.trim()) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = { raw: text.slice(0, 2000) };
      }
    }

    // 201 created, 202 processing (retry same key)
    if (res.status === 201 || res.status === 202 || res.ok) {
      return {
        ok: true,
        quidliRef: extractRef(parsed) ?? idempotencyKey,
        status: "submitted",
        raw: parsed,
      };
    }

    return {
      ok: false,
      error: `http_${res.status}`,
      detail: text.slice(0, 800),
    };
  } catch (err) {
    return {
      ok: false,
      error: "api_unreachable",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Smart Send wallet balances for funding checks. */
export async function getDropBalance(chainId = 8453): Promise<{
  ok: boolean;
  raw?: unknown;
  error?: string;
  detail?: string;
}> {
  const apiKey = quidliApiKey();
  if (!apiKey) return { ok: false, error: "not_configured" };
  const base = quidliApiBase();
  try {
    const res = await fetch(`${base}/drop/balance?chainId=${chainId}`, {
      method: "GET",
      headers: authHeaders(apiKey),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text.trim()) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = { raw: text.slice(0, 2000) };
      }
    }
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}`, detail: text.slice(0, 500) };
    }
    return { ok: true, raw: parsed };
  } catch (err) {
    return {
      ok: false,
      error: "balance_unreachable",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
