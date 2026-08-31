import { createFileRoute } from "@tanstack/react-router";

import { genesisMaxSupply } from "@/lib/genesis.server";
import { renderHoodPassportSvg } from "@/lib/hood-art";

/**
 * Unique marketplace image for each Hood.
 * Self-contained SVG — no external JPEG href (OpenSea often drops those).
 */
export const Route = createFileRoute("/api/genesis/art/$tokenId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = String(params.tokenId ?? "").replace(/\.(svg|json)$/i, "");
        const tokenId = Number.parseInt(raw, 10);
        const max = genesisMaxSupply();
        if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > max) {
          return Response.json({ error: "Unknown token" }, { status: 404 });
        }

        return new Response(renderHoodPassportSvg(tokenId), {
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
