import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  collectionMintUrl,
  collectionCoverUrl,
  normalizeCollectionSlug,
} from "@/lib/creator-contracts";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/api/creator/meta/$slug/$tokenId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = normalizeCollectionSlug(String(params.slug ?? ""));
        const raw = String(params.tokenId ?? "").replace(/\.json$/i, "");
        const tokenId = Number.parseInt(raw, 10);

        const { data: collection } = await supabaseAdmin
          .from("nft_collections")
          .select("*")
          .eq("slug", slug)
          .in("status", ["live", "paused", "sold_out"])
          .maybeSingle();

        if (
          !collection ||
          !Number.isFinite(tokenId) ||
          tokenId < 1 ||
          tokenId > collection.max_supply
        ) {
          return Response.json({ error: "Unknown token" }, { status: 404 });
        }

        const image = collection.cover_image_url ?? collectionCoverUrl(slug);
        const external = `${SITE_URL}/c/${slug}`;

        return Response.json(
          {
            name: `${collection.name} #${tokenId}`,
            description: collection.description ?? `${collection.name} on Robinhood Chain`,
            image,
            external_url: external,
            background_color: "07090e",
            attributes: [
              { trait_type: "Collection", value: collection.name },
              { trait_type: "Chain", value: "Robinhood Chain" },
              { trait_type: "Token ID", value: tokenId, display_type: "number" },
              { trait_type: "Max Supply", value: collection.max_supply, display_type: "number" },
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
