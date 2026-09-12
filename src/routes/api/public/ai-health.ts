import { createFileRoute } from "@tanstack/react-router";

import { aiConfigured, aiProviderNames, AI_LANES, openRouterLaneSpec } from "@/lib/ai.server";

/**
 * Public, non-secret AI readiness probe — used by the greeter and ops checks.
 * Never returns keys or base URLs.
 */
export const Route = createFileRoute("/api/public/ai-health")({
  server: {
    handlers: {
      GET: async () => {
        const providers = aiProviderNames();
        const openrouter = providers.includes("openrouter");
        return Response.json({
          ok: aiConfigured(),
          providers,
          primary: providers[0] ?? null,
          lanes: openrouter
            ? Object.fromEntries(
                AI_LANES.map((lane) => {
                  const spec = openRouterLaneSpec(lane);
                  return [lane, { model: spec.model, costTier: spec.costTier }];
                }),
              )
            : null,
        });
      },
    },
  },
});
