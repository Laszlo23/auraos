/**
 * Didit verification API — server only.
 * Docs: https://docs.didit.me/sessions-api/create-session
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const DIDIT_API_BASE = "https://verification.didit.me";

export type KycStatus =
  | "none"
  | "not_started"
  | "in_progress"
  | "in_review"
  | "approved"
  | "declined"
  | "expired"
  | "abandoned";

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

export function mapDiditStatus(raw: string | null | undefined): KycStatus {
  const n = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  switch (n) {
    case "":
    case "none":
      return "none";
    case "approved":
      return "approved";
    case "declined":
      return "declined";
    case "in_review":
      return "in_review";
    case "not_started":
      return "not_started";
    case "in_progress":
    case "awaiting_user":
    case "resubmitted":
      return "in_progress";
    case "expired":
    case "kyc_expired":
      return "expired";
    case "abandoned":
      return "abandoned";
    default:
      return "in_progress";
  }
}

export function isKycApproved(status: KycStatus): boolean {
  return status === "approved";
}

type WorkflowRow = {
  workflow_id?: string;
  uuid?: string;
  workflow_label?: string;
  workflow_type?: string | null;
  status?: string;
  is_default?: boolean;
  is_archived?: boolean;
};

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

export async function resolveDiditWorkflowId(): Promise<string> {
  const pinned = (process.env.DIDIT_WORKFLOW_ID || "").trim();
  if (pinned) return pinned;

  const res = await diditFetch("/v3/workflows/?limit=50");
  if (!res.ok) {
    throw new Error(`Didit workflows failed (${res.status}). Publish a KYC workflow in the console.`);
  }
  const body = (await res.json()) as { results?: WorkflowRow[] };
  const rows = body.results ?? [];
  const published = rows.filter(
    (w) => w.status === "published" && !w.is_archived && (w.workflow_type ?? "kyc") === "kyc",
  );
  const pick = published.find((w) => w.is_default) ?? published[0] ?? rows.find((w) => w.status === "published");
  const id = pick?.workflow_id || pick?.uuid;
  if (!id) throw new Error("No published Didit KYC workflow. Create one at business.didit.me → Workflows.");
  return id;
}

export async function createDiditSession(input: {
  vendorData: string;
  callback: string;
  language?: string;
}): Promise<DiditSession> {
  const workflow_id = await resolveDiditWorkflowId();
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

function shortenFloats(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(shortenFloats);
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, shortenFloats(v)]),
    );
  }
  if (typeof data === "number" && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
}

function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

export function verifyDiditWebhook(input: {
  jsonBody: unknown;
  rawBody: string;
  signatureV2: string | null;
  signatureRaw: string | null;
  signatureSimple: string | null;
  timestamp: string | null;
  secret: string;
  nowSec?: number;
}): boolean {
  const { jsonBody, rawBody, signatureV2, signatureRaw, signatureSimple, timestamp, secret } = input;
  if (!secret || !timestamp) return false;
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false;

  const safeEq = (expectedHex: string, header: string) => {
    const a = Buffer.from(expectedHex, "utf8");
    const b = Buffer.from(header, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  };
  const hmac = (payload: string) => createHmac("sha256", secret).update(payload, "utf8").digest("hex");

  if (signatureV2) {
    const canonical = JSON.stringify(sortKeys(shortenFloats(jsonBody)));
    if (safeEq(hmac(canonical), signatureV2)) return true;
  }
  if (signatureRaw) {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    if (safeEq(expected, signatureRaw)) return true;
  }
  if (signatureSimple && jsonBody && typeof jsonBody === "object") {
    const body = jsonBody as Record<string, unknown>;
    const nested =
      body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : null;
    const canonical = [
      String(body.timestamp ?? ""),
      String(body.session_id ?? nested?.session_id ?? ""),
      String(body.status ?? nested?.status ?? ""),
      String(body.webhook_type ?? body.event ?? ""),
    ].join(":");
    if (safeEq(hmac(canonical), signatureSimple)) return true;
  }
  return false;
}

export function extractDiditWebhookSession(payload: unknown): {
  sessionId: string | null;
  vendorData: string | null;
  status: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { sessionId: null, vendorData: null, status: null };
  }
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  return {
    sessionId: typeof data.session_id === "string" ? data.session_id : null,
    vendorData: typeof data.vendor_data === "string" ? data.vendor_data : null,
    status: typeof data.status === "string" ? data.status : null,
  };
}
