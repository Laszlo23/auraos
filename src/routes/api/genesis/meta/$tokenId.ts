import { createFileRoute } from "@tanstack/react-router";

import { genesisMaxSupply, genesisPriceUsdc } from "@/lib/genesis.server";
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

        const image = `${SITE_URL}/genesis-passport.png`;
        const external = `${SITE_URL}/wallet`;

        return Response.json(
          {
            name: `Aura Genesis Passport #${tokenId}`,
            description:
              "Founding Company Passport for Aura OS — utility membership for seated founders. Official seal art. Not an investment product and not part of any token launch.",
            image,
            external_url: external,
            background_color: "07090e",
            attributes: [
              { trait_type: "Collection", value: "Aura Genesis" },
              { trait_type: "Edition", value: "Founding Passport" },
              { trait_type: "Artwork", value: "Aura Genesis Passport seal" },
              { trait_type: "Token ID", value: tokenId, display_type: "number" },
              { trait_type: "Max Supply", value: max, display_type: "number" },
              { trait_type: "Price USDC", value: genesisPriceUsdc(), display_type: "number" },
              { trait_type: "Utility", value: "Desk perks · seat signal" },
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
