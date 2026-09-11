import { createFileRoute } from "@tanstack/react-router";

import { AURA_SQUARE, squareTokenMetadata } from "@/lib/aura-square";

export const Route = createFileRoute("/api/square/meta/$tokenId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = String(params.tokenId ?? "").replace(/\.json$/i, "");
        const tokenId = Number.parseInt(raw, 10);
        if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > AURA_SQUARE.maxSupply) {
          return Response.json({ error: "Unknown token" }, { status: 404 });
        }
        return Response.json(squareTokenMetadata(tokenId), {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
