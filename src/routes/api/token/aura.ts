import { createFileRoute } from "@tanstack/react-router";

import { auraTokenMetaJson } from "@/lib/aura-token-meta";

/** Public aggregator JSON. CA/pool stay null until env is set after the 48h announce. */
export const Route = createFileRoute("/api/token/aura")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(auraTokenMetaJson(), {
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=300",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
