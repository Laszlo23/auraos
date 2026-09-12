import { createFileRoute } from "@tanstack/react-router";

import {
  alreadyProcessedDiditEvent,
  markDiditEventProcessed,
  persistKycDecision,
} from "@/lib/kyc.functions";

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
        const { diditEventDedupeKey, diditWebhookSecret, extractDiditWebhookSession, verifyDiditWebhook } =
          await import("@/lib/didit.server");
        const secret = diditWebhookSecret();
        if (!secret) {
          return new Response("not configured", { status: 503 });
        }

        const raw = await request.text();
        let parsed: unknown = null;
        try {
          parsed = raw.trim() ? JSON.parse(raw) : null;
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const sig = request.headers.get("x-signature-v2");
        const ts = request.headers.get("x-timestamp");
        if (!verifyDiditWebhook({ jsonBody: parsed, signatureV2: sig, timestamp: ts, secret })) {
          return new Response("unauthorized", { status: 401 });
        }

        const extracted = extractDiditWebhookSession(parsed);
        const eventKey = diditEventDedupeKey(extracted);
        if (eventKey && (await alreadyProcessedDiditEvent(eventKey))) {
          return new Response("ok");
        }

        try {
          if (extracted.sessionId || extracted.vendorData) {
            await persistKycDecision({
              userId: extracted.vendorData,
              sessionId: extracted.sessionId,
              vendorData: extracted.vendorData,
              rawStatus: extracted.status,
              workflowId: extracted.workflowId,
            });
          }
          if (eventKey) {
            await markDiditEventProcessed({
              eventId: eventKey,
              sessionId: extracted.sessionId,
              status: extracted.status,
            });
          }
        } catch (err) {
          console.error("[didit/webhook] persist failed", err);
          return new Response("persist failed", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
