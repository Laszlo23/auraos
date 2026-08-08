import { createFileRoute } from "@tanstack/react-router";
import { agentJson } from "@/lib/x402-ai";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";

const SCHEMA = `Return strict JSON: {"company":string,"domain":string,"industry":string,"hq":string,"size_band":string,"positioning":string,"buying_signals":string[],"outreach_angle":string,"confidence":number}`;

async function enrich(domain: string) {
  const out = await agentJson(
    `You are Orin, the Aura sales agent. Enrich a company from its domain. ${SCHEMA}. Use confidence 0-1 and say what you are unsure about inside positioning.`,
    `Domain: ${domain}`,
    "notes",
  );
  return { domain, agent: "Orin", ...out };
}

export const Route = createFileRoute("/api/public/x402/lead-enrich")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse({ error: "use POST", input: { domain: "acme.com" } }, { status: 405 }),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { domain?: unknown };
        const domain = (typeof body.domain === "string" ? body.domain : "")
          .trim()
          .toLowerCase()
          .slice(0, 120);
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain))
          return jsonResponse({ error: "invalid_domain" }, { status: 400 });
        return withPayment("lead-enrich", request, () => enrich(domain));
      },
    },
  },
});
