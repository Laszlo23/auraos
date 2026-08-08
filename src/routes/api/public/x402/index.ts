import { createFileRoute } from "@tanstack/react-router";
import { X402_CATALOG } from "@/lib/x402-catalog";
import { corsPreflight, jsonResponse, paymentRequirements } from "@/lib/x402-gateway";

/** Discovery manifest so paying agents can find and price every endpoint. */
export const Route = createFileRoute("/api/public/x402/")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return jsonResponse({
          x402Version: 1,
          provider: "Aura OS",
          docs: `${origin}/x402`,
          endpoints: X402_CATALOG.map((ep) => ({
            slug: ep.slug,
            name: ep.name,
            description: ep.description,
            method: "POST",
            url: `${origin}${ep.path}`,
            input: ep.input,
            price: { amount: ep.price_usdc, currency: "USDC" },
            accepts: [paymentRequirements(ep, `${origin}${ep.path}`)],
          })),
        });
      },
    },
  },
});
