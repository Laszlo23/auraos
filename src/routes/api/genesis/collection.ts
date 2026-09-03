import { createFileRoute } from "@tanstack/react-router";

import { hoodCollectionMetadata } from "@/lib/opensea-compat";

/**
 * Collection-level metadata for OpenSea / marketplace contractURI-style consumers.
 * GET https://aibusiness.fun/api/genesis/collection
 */
export const Route = createFileRoute("/api/genesis/collection")({
  server: {
    handlers: {
      GET: async () => {
        const meta = hoodCollectionMetadata();
        return Response.json(
          {
            ...meta,
            fee_recipient: meta.fee_recipient ?? undefined,
          },
          {
            headers: {
              "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
