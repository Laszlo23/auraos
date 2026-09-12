import { createFileRoute } from "@tanstack/react-router";

import { DIDIT_VERIFY_CALLBACK_PATH } from "@/lib/didit-workflow";
import { persistKycDecision } from "@/lib/kyc.functions";
import { requireUserFromRequest } from "@/lib/request-auth.server";
import { SITE_URL } from "@/lib/site";

/**
 * Create a Didit session server-side. Returns { url, session_id } only.
 * vendor_data is the authenticated user id — never taken from the browser body.
 */
export const Route = createFileRoute("/api/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUserFromRequest(request);
        if (!auth.ok) return auth.response;

        const { DiditSessionError, createDiditSession, diditConfigured } =
          await import("@/lib/didit.server");
        if (!diditConfigured()) {
          return Response.json({ error: "kyc_not_configured" }, { status: 503 });
        }

        try {
          const session = await createDiditSession({
            vendorData: auth.userId,
            callback: `${SITE_URL}${DIDIT_VERIFY_CALLBACK_PATH}`,
          });
          if (!session.url) {
            return Response.json({ error: "session_create_failed" }, { status: 502 });
          }

          await persistKycDecision({
            userId: auth.userId,
            sessionId: session.session_id,
            vendorData: auth.userId,
            rawStatus: session.status ?? "Not Started",
            workflowId: session.workflow_id ?? null,
          });

          return Response.json({ url: session.url, session_id: session.session_id });
        } catch (err) {
          if (err instanceof DiditSessionError) {
            console.error("[didit/verify] session create failed", err.code);
            return Response.json(
              { error: err.code === "credits" ? "didit_credits" : "session_create_failed" },
              { status: err.code === "credits" ? 402 : 502 },
            );
          }
          console.error("[didit/verify] session create failed");
          return Response.json({ error: "session_create_failed" }, { status: 502 });
        }
      },
    },
  },
});
