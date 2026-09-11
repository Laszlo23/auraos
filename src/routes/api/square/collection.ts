import { createFileRoute } from "@tanstack/react-router";

import { squareCollectionMetadata } from "@/lib/aura-square";

export const Route = createFileRoute("/api/square/collection")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(squareCollectionMetadata(), {
          headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
