import { createFileRoute } from "@tanstack/react-router";

import { diditConfigured, diditGates } from "@/lib/didit.server";

/** Public, non-secret KYC readiness — used by the sale gate. Never returns keys. */
export const Route = createFileRoute("/api/public/kyc-health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          configured: diditConfigured(),
          gates: diditGates(),
        });
      },
    },
  },
});
