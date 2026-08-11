import { createFileRoute } from "@tanstack/react-router";

import { aiConfigured, aiProviderNames } from "@/lib/ai.server";

/**
 * Public, non-secret AI readiness probe — used by the greeter and ops checks.
 * Never returns keys or base URLs.
 */
export const Route = createFileRoute("/api/public/ai-health")({
  server: {
    handlers: {
      GET: async () => {
        const providers = aiProviderNames();
        return Response.json({
          ok: aiConfigured(),
          providers,
          primary: providers[0] ?? null,
        });
      },
    },
  },
});
