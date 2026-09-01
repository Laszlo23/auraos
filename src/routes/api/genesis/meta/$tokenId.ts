import { createFileRoute } from "@tanstack/react-router";

import { genesisMaxSupply, genesisPriceUsdc } from "@/lib/genesis.server";
import { HOOD } from "@/lib/hood";
import { hoodTraitAttributes, resolveHoodTraits } from "@/lib/hood-traits";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * ERC-721 token metadata for Genesis Passport.
 * Contract baseURI should be: https://aibusiness.fun/api/genesis/meta/
 * so tokenURI(tokenId) → /api/genesis/meta/{tokenId}
 */
export const Route = createFileRoute("/api/genesis/meta/$tokenId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = String(params.tokenId ?? "").replace(/\.json$/i, "");
        const tokenId = Number.parseInt(raw, 10);
        const max = genesisMaxSupply();
        if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > max) {
          return Response.json({ error: "Unknown token" }, { status: 404 });
        }

        const traits = resolveHoodTraits(tokenId);
        const image = `${SITE_URL}/api/genesis/art/${tokenId}`;
        const external = `${SITE_URL}${HOOD.path}`;

        return Response.json(
          {
            name: `${HOOD.name} #${tokenId}`,
            description:
              "The Hood — founding-circle utility for seated Aura OS founders. Of each $299 mint: 70% reserved for launch liquidity, 30% to developer ops (servers, infra). Not an investment product and not part of any token launch. Coming to Robinhood Chain when that contract is published.",
            image,
            external_url: external,
            background_color: "07090e",
            attributes: [
              { trait_type: "Collection", value: HOOD.collection },
              { trait_type: "Edition", value: "Founding Hood" },
              ...hoodTraitAttributes(traits),
              { trait_type: "Proceeds", value: "70% launch LP · 30% developer ops" },
              { trait_type: "Token ID", value: tokenId, display_type: "number" },
              { trait_type: "Max Supply", value: max, display_type: "number" },
              { trait_type: "Price USDC", value: genesisPriceUsdc(), display_type: "number" },
              { trait_type: "Utility", value: "Desk perks · founding circle" },
              { trait_type: "Chains", value: "Base (Hood) · Creator drops on Robinhood Chain" },
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
