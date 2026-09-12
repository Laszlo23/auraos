import { createFileRoute } from "@tanstack/react-router";

import { persistKycDecision } from "@/lib/kyc.functions";

export const Route = createFileRoute("/api/webhooks/didit")({
  server: {
    handlers: {
      GET: async () => {
        const { diditConfigured, diditWebhookSecret } = await import("@/lib/didit.server");
        return Response.json({
          service: "didit-kyc",
          configured: diditConfigured(),
          webhookSigned: Boolean(diditWebhookSecret()),
        });
      },
      POST: async ({ request }) => {
        const { diditWebhookSecret, extractDiditWebhookSession, verifyDiditWebhook } =
          await import("@/lib/didit.server");
        const secret = diditWebhookSecret();
        if (!secret) {
          return Response.json({ error: "Webhook not configured" }, { status: 503 });
        }

        const raw = await request.text();
        let jsonBody: unknown = null;
        try {
          jsonBody = raw.trim() ? JSON.parse(raw) : null;
        } catch {
          return Response.json({ error: "invalid json" }, { status: 400 });
        }

        const ok = verifyDiditWebhook({
          jsonBody,
          rawBody: raw,
          signatureV2: request.headers.get("x-signature-v2"),
          signatureRaw: request.headers.get("x-signature"),
          signatureSimple: request.headers.get("x-signature-simple"),
          timestamp: request.headers.get("x-timestamp"),
          secret,
        });
        if (!ok) return Response.json({ error: "unauthorized" }, { status: 401 });

        const extracted = extractDiditWebhookSession(jsonBody);
        if (extracted.sessionId || extracted.vendorData) {
          try {
            await persistKycDecision({
              userId: extracted.vendorData,
              sessionId: extracted.sessionId,
              vendorData: extracted.vendorData,
              rawStatus: extracted.status,
            });
          } catch (err) {
            console.error("[didit/webhook] persist failed", err);
            return Response.json({ error: "persist failed" }, { status: 500 });
          }
        }

        return Response.json({ ok: true });
      },
    },
  },
});
