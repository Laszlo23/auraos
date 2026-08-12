import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { quidliConfigured, quidliPublicWebhookUrl, quidliWebhookSecret } from "@/lib/quidli/env";
import { parseQuidliWebhook } from "@/lib/quidli/parse-webhook";

function verifyQuidliWebhookAuth(request: Request, expectedKey: string): boolean {
  const candidates = [
    request.headers.get("x-quidli-api-key"),
    request.headers.get("x-api-key"),
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
    request.headers.get("authorization")?.replace(/^ApiKey\s+/i, ""),
  ];
  return candidates.some((v) => v?.trim() === expectedKey);
}

export const Route = createFileRoute("/api/webhooks/quidli")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          service: "quidli-connect",
          configured: quidliConfigured(),
          webhookUrl: quidliPublicWebhookUrl(),
        });
      },
      POST: async ({ request }) => {
        const secret = quidliWebhookSecret();
        if (!secret) {
          console.error("[quidli/webhook] QUIDLI_API_KEY not set — refusing");
          return Response.json({ error: "Webhook not configured" }, { status: 503 });
        }
        if (!verifyQuidliWebhookAuth(request, secret)) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const raw = await request.text();
        let payload: unknown = null;
        if (raw.trim()) {
          try {
            payload = JSON.parse(raw) as unknown;
          } catch {
            payload = { raw: raw.slice(0, 4000) };
          }
        }

        const parsed = parseQuidliWebhook(payload);
        const db = supabaseAdmin as unknown as { from: (t: string) => any };

        console.info("[quidli/webhook]", {
          eventId: parsed?.eventId ?? null,
          status: parsed?.status ?? null,
          quidliRef: parsed?.quidliRef ?? null,
        });

        if (parsed) {
          const status =
            parsed.status === "completed"
              ? "completed"
              : parsed.status === "failed"
                ? "failed"
                : parsed.status === "pending"
                  ? "submitted"
                  : null;

          if (status && (parsed.idempotencyKey || parsed.quidliRef)) {
            try {
              let q = db.from("quidli_deliveries").update({
                status,
                updated_at: new Date().toISOString(),
                raw: parsed.raw,
                ...(parsed.quidliRef ? { quidli_ref: parsed.quidliRef } : {}),
              });
              if (parsed.idempotencyKey) {
                q = q.eq("idempotency_key", parsed.idempotencyKey);
              } else if (parsed.quidliRef) {
                q = q.eq("quidli_ref", parsed.quidliRef);
              }
              await q;
            } catch (err) {
              console.warn(
                "[quidli/webhook] delivery update failed",
                err instanceof Error ? err.message : err,
              );
            }
          }
        }

        return Response.json({
          ok: true,
          eventId: parsed?.eventId ?? null,
          status: parsed?.status ?? null,
        });
      },
    },
  },
});
