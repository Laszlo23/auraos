import { createFileRoute } from "@tanstack/react-router";
import { agentJson } from "@/lib/x402-ai";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";

export const Route = createFileRoute("/api/public/x402/property-valuation")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse(
          { error: "use POST", input: { address: "Mariahilfer Str 12, Wien", size_sqm: 78 } },
          { status: 405 },
        ),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          address?: unknown;
          size_sqm?: unknown;
        };
        const address = (typeof body.address === "string" ? body.address : "").trim().slice(0, 240);
        const size =
          typeof body.size_sqm === "number" && body.size_sqm > 0
            ? Math.min(body.size_sqm, 2000)
            : null;
        if (address.length < 4) return jsonResponse({ error: "invalid_address" }, { status: 400 });
        return withPayment("property-valuation", request, () =>
          agentJson(
            'You are the Aura real-estate desk. Give an indicative residential valuation. Schema: {"address":string,"currency":string,"estimate":number,"range":[number,number],"price_per_sqm":number,"rent_month":number,"gross_yield_pct":number,"confidence":"low"|"medium"|"high","drivers":string[],"caveat":string}. Estimates are indicative, not an appraisal.',
            `${address}${size ? ` — ${size} sqm` : ""}`,
            "valuation",
          ),
        );
      },
    },
  },
});
