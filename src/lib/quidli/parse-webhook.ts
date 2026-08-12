import { normalizeQuidliPlatform, type QuidliPlatform } from "@/lib/quidli/policy";

export type ParsedQuidliWebhook = {
  eventId: string;
  eventType: string;
  platform: QuidliPlatform | null;
  handle: string | null;
  amountUsdc: number | null;
  tokenAddress: string | null;
  chainId: number | null;
  status: "completed" | "failed" | "pending" | "unknown";
  quidliRef: string | null;
  idempotencyKey: string | null;
  raw: Record<string, unknown>;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function mapStatus(raw: string | null): ParsedQuidliWebhook["status"] {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();
  if (["completed", "success", "succeeded", "confirmed", "done"].includes(s)) return "completed";
  if (["failed", "error", "rejected", "cancelled", "canceled"].includes(s)) return "failed";
  if (["pending", "submitted", "processing", "queued"].includes(s)) return "pending";
  return "unknown";
}

export function parseQuidliWebhook(payload: unknown): ParsedQuidliWebhook | null {
  const root = asRecord(payload);
  if (!root) return null;
  const data = asRecord(root["data"]) ?? root;

  const eventId =
    pickString(root, "id", "event_id", "eventId") ||
    pickString(data, "id", "event_id", "eventId") ||
    pickString(root, "delivery_id", "deliveryId", "drop_id") ||
    `evt:${JSON.stringify(payload).slice(0, 48)}`;

  const eventType =
    pickString(root, "type", "event", "event_type", "eventType") ||
    pickString(data, "type", "event", "status") ||
    "unknown";

  const platformRaw =
    pickString(data, "platform", "network", "channel") ||
    pickString(root, "platform", "network", "channel");
  const platform = platformRaw ? normalizeQuidliPlatform(platformRaw) : null;

  const handle =
    pickString(data, "handle", "username", "recipient", "to") ||
    pickString(root, "handle", "username", "recipient", "to");

  const amountUsdc =
    pickNumber(data, "amount_usdc", "amountUsdc", "amount") ??
    pickNumber(root, "amount_usdc", "amountUsdc", "amount");

  const tokenAddress =
    pickString(data, "token_address", "tokenAddress", "token") ||
    pickString(root, "token_address", "tokenAddress");

  const chainId =
    pickNumber(data, "chain_id", "chainId") ?? pickNumber(root, "chain_id", "chainId");

  const status = mapStatus(
    pickString(data, "status", "state") || pickString(root, "status", "state") || eventType,
  );

  const quidliRef =
    pickString(data, "id", "reference", "ref", "delivery_id", "deliveryId", "drop_id") ||
    pickString(root, "reference", "ref", "delivery_id", "deliveryId");

  const idempotencyKey =
    pickString(data, "idempotency_key", "idempotencyKey") ||
    pickString(root, "idempotency_key", "idempotencyKey");

  return {
    eventId,
    eventType,
    platform,
    handle,
    amountUsdc,
    tokenAddress,
    chainId,
    status,
    quidliRef,
    idempotencyKey,
    raw: root,
  };
}
