/**
 * Didit verification API — server only.
 * Docs: https://docs.didit.me/sessions-api/create-session
 * Webhooks: https://docs.didit.me/integration/webhooks
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { DIDIT_WORKFLOW_ID } from "@/lib/didit-workflow";
import {
  type DiditSessionStatus,
  type KycStatus,
  isKycApproved,
} from "@/lib/kyc-status";

export type { DiditSessionStatus, KycStatus };
export { isKycApproved };

export const DIDIT_API_BASE = "https://verification.didit.me";

export type DiditGate = "sale" | "trading";

export type DiditSession = {
  session_id: string;
  session_token?: string;
  url?: string;
  vendor_data?: string | null;
  status?: string;
  workflow_id?: string;
};

export function diditApiKey(): string {
  return (process.env.DIDIT_API_KEY || process.env.BUSINESS_DID_API_KEY || "").trim();
}

export function diditWebhookSecret(): string {
  return (process.env.DIDIT_WEBHOOK_SECRET || "").trim();
}

export function diditConfigured(): boolean {
  return diditApiKey().length > 8;
}

export function diditGates(): DiditGate[] {
  const raw = (process.env.DIDIT_GATE || "sale,trading").trim();
  if (!raw || raw === "0" || raw === "off") return [];
  const out: DiditGate[] = [];
  for (const part of raw.split(",")) {
    const g = part.trim().toLowerCase();
    if (g === "sale" || g === "trading") out.push(g);
  }
  return out;
}

export function diditGateOn(gate: DiditGate): boolean {
  return diditConfigured() && diditGates().includes(gate);
}

/** Map Didit literals (case-sensitive) to stored status. Unknown → in_progress, never approved. */
export function mapDiditStatus(raw: string | null | undefined): KycStatus {
  switch (raw) {
    case "Not Started":
      return "not_started";
    case "In Progress":
      return "in_progress";
    case "Awaiting User":
      return "awaiting_user";
    case "In Review":
      return "in_review";
    case "Approved":
      return "approved";
    case "Declined":
      return "declined";
    case "Resubmitted":
      return "resubmitted";
    case "Abandoned":
      return "abandoned";
    case "Expired":
      return "expired";
    case "Kyc Expired":
      return "kyc_expired";
    case null:
    case undefined:
    case "":
      return "none";
    default:
      return "in_progress";
  }
}

async function diditFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = diditApiKey();
  if (!key) throw new Error("Didit is not configured.");
  return fetch(`${DIDIT_API_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": key,
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

export function diditWorkflowId(): string {
  return DIDIT_WORKFLOW_ID;
}

export async function createDiditSession(input: {
  vendorData: string;
  callback: string;
  language?: string;
}): Promise<DiditSession> {
  const workflow_id = diditWorkflowId();
  const res = await diditFetch("/v3/session/", {
    method: "POST",
    body: JSON.stringify({
      workflow_id,
      vendor_data: input.vendorData,
      callback: input.callback,
      callback_method: "both",
      metadata: { product: "auraos" },
      ...(input.language ? { language: input.language } : {}),
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Didit session failed (${res.status}): ${text.slice(0, 240)}`);
  }
  const session = JSON.parse(text) as DiditSession;
  if (!session.session_id) throw new Error("Didit returned no session_id.");
  return { ...session, workflow_id: session.workflow_id ?? workflow_id };
}

export async function getDiditDecision(sessionId: string): Promise<{
  session_id?: string;
  status?: string;
  vendor_data?: string | null;
  session_kind?: string;
}> {
  const res = await diditFetch(`/v3/session/${encodeURIComponent(sessionId)}/decision/`);
  if (!res.ok) {
    throw new Error(`Didit decision failed (${res.status}).`);
  }
  return (await res.json()) as {
    session_id?: string;
    status?: string;
    vendor_data?: string | null;
    session_kind?: string;
  };
}

export async function listDiditSessionsForVendor(vendorData: string): Promise<DiditSession[]> {
  const qs = new URLSearchParams({ vendor_data: vendorData, limit: "10" });
  const res = await diditFetch(`/v3/sessions/?${qs.toString()}`);
  if (!res.ok) return [];
  const body = (await res.json()) as { results?: DiditSession[] };
  return body.results ?? [];
}

/** Whole-number floats (1.0) → integers. Matches Didit X-Signature-V2 canonicalisation. */
export function shortenFloats(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, shortenFloats(x)]),
    );
  }
  if (typeof v === "number" && !Number.isInteger(v) && v % 1 === 0) return Math.trunc(v);
  return v;
}

/** Recursive lexicographic key sort (array order preserved). */
export function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.keys(v as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

export function canonicalDiditWebhookBody(jsonBody: unknown): string {
  return JSON.stringify(sortKeys(shortenFloats(jsonBody)));
}

function safeHexEqual(expectedHex: string, header: string): boolean {
  const a = Buffer.from(expectedHex, "utf8");
  const b = Buffer.from(header, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verify X-Signature-V2: freshness ≤ 300s → canonicalise → HMAC-SHA256 → constant-time compare.
 */
export function verifyDiditWebhook(input: {
  jsonBody: unknown;
  signatureV2: string | null;
  timestamp: string | null;
  secret: string;
  nowSec?: number;
}): boolean {
  const { jsonBody, signatureV2, timestamp, secret } = input;
  if (!secret || !signatureV2 || !timestamp) return false;
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(canonicalDiditWebhookBody(jsonBody), "utf8")
    .digest("hex");
  return safeHexEqual(expected, signatureV2);
}

export function extractDiditWebhookSession(payload: unknown): {
  eventId: string | null;
  sessionId: string | null;
  vendorData: string | null;
  status: string | null;
  workflowId: string | null;
  webhookType: string | null;
  timestamp: number | null;
} {
  if (!payload || typeof payload !== "object") {
    return {
      eventId: null,
      sessionId: null,
      vendorData: null,
      status: null,
      workflowId: null,
      webhookType: null,
      timestamp: null,
    };
  }
  const root = payload as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null;
  const pickStr = (...vals: unknown[]) => {
    for (const v of vals) {
      if (typeof v === "string" && v.trim()) return v;
    }
    return null;
  };
  const tsRaw = root.timestamp;
  const timestamp =
    typeof tsRaw === "number" && Number.isFinite(tsRaw)
      ? tsRaw
      : typeof tsRaw === "string" && Number.isFinite(Number(tsRaw))
        ? Number(tsRaw)
        : null;
  return {
    eventId: pickStr(root.event_id),
    sessionId: pickStr(root.session_id, nested?.session_id),
    vendorData: pickStr(root.vendor_data, nested?.vendor_data),
    status: pickStr(root.status, nested?.status),
    workflowId: pickStr(root.workflow_id, nested?.workflow_id),
    webhookType: pickStr(root.webhook_type, root.event),
    timestamp,
  };
}

export function diditEventDedupeKey(extracted: {
  eventId: string | null;
  sessionId: string | null;
  webhookType: string | null;
  timestamp: number | null;
}): string | null {
  if (extracted.eventId) return extracted.eventId;
  if (extracted.sessionId && extracted.webhookType && extracted.timestamp != null) {
    return `${extracted.sessionId}:${extracted.webhookType}:${extracted.timestamp}`;
  }
  return null;
}
