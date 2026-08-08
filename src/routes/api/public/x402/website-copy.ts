import { createFileRoute } from "@tanstack/react-router";
import { agentJson } from "@/lib/x402-ai";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";

export const Route = createFileRoute("/api/public/x402/website-copy")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse(
          { error: "use POST", input: { product: "AI company OS", audience: "solo founders" } },
          { status: 405 },
        ),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          product?: unknown;
          audience?: unknown;
        };
        const product = (typeof body.product === "string" ? body.product : "").trim().slice(0, 300);
        const audience = (typeof body.audience === "string" ? body.audience : "founders")
          .trim()
          .slice(0, 200);
        if (product.length < 3) return jsonResponse({ error: "invalid_product" }, { status: 400 });
        return withPayment("website-copy", request, () =>
          agentJson(
            'You are the Aura growth desk. Write a landing page copy block. Schema: {"headline":string,"subhead":string,"bullets":string[],"cta":string,"seo_title":string,"meta_description":string}. Headline under 9 words, 3 bullets, meta under 155 chars. No buzzword soup.',
            `Product: ${product}\nAudience: ${audience}`,
            "copy",
          ),
        );
      },
    },
  },
});
