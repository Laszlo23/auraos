import { createFileRoute } from "@tanstack/react-router";

import { renderCreatorCollectionSvg } from "@/lib/creator-art";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeCollectionSlug } from "@/lib/creator-contracts";

export const Route = createFileRoute("/api/creator/art/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let slug: string;
        try {
          slug = normalizeCollectionSlug(String(params.slug ?? "").replace(/\.svg$/i, ""));
        } catch {
          return Response.json({ error: "Invalid slug" }, { status: 400 });
        }

        const { data: collection } = await supabaseAdmin
          .from("nft_collections")
          .select("name, slug")
          .eq("slug", slug)
          .maybeSingle();

        const name = collection?.name ?? slug;
        return new Response(renderCreatorCollectionSvg(slug, name), {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
