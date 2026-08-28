import { createFileRoute } from "@tanstack/react-router";

import { RELIC_MAX_SUPPLY } from "@/lib/relic.server";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * ERC-721 token metadata for Aura Relic.
 * Contract baseURI should be: https://aibusiness.fun/api/relic/meta/
 * so tokenURI(tokenId) → /api/relic/meta/{tokenId}
 */
export const Route = createFileRoute("/api/relic/meta/$tokenId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = String(params.tokenId ?? "").replace(/\.json$/i, "");
        const tokenId = Number.parseInt(raw, 10);
        if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > RELIC_MAX_SUPPLY) {
          return Response.json({ error: "Unknown token" }, { status: 404 });
        }

        const image = `${SITE_URL}/relic.png`;

        return Response.json(
          {
            name: `Aura Relic #${tokenId} / ${RELIC_MAX_SUPPLY}`,
            description:
              "A numbered collectible from the Aura block-zero hunt. Not AURA, not pAURA, and not an investment product.",
            image,
            external_url: SITE_URL,
            background_color: "07090e",
            attributes: [
              { trait_type: "hunt", value: "block-zero" },
              { trait_type: "chain", value: "base" },
              { trait_type: "Token ID", value: tokenId, display_type: "number" },
              { trait_type: "Max Supply", value: RELIC_MAX_SUPPLY, display_type: "number" },
              { trait_type: "Issuer", value: SITE_NAME },
            ],
          },
          {
            headers: {
              "Cache-Control": "public, max-age=300, s-maxage=3600",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
