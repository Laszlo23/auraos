import { createFileRoute } from "@tanstack/react-router";
import { agentJson } from "@/lib/x402-ai";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";

export const Route = createFileRoute("/api/public/x402/outreach-draft")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse(
          {
            error: "use POST",
            input: { lead: "Weber Immobilien, Vienna", offer: "AI lead qualification" },
          },
          { status: 405 },
        ),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          lead?: unknown;
          offer?: unknown;
          language?: unknown;
        };
        const lead = (typeof body.lead === "string" ? body.lead : "").trim().slice(0, 400);
        const offer = (typeof body.offer === "string" ? body.offer : "").trim().slice(0, 400);
        const language = (typeof body.language === "string" ? body.language : "en").slice(0, 12);
        if (lead.length < 3 || offer.length < 3)
          return jsonResponse({ error: "invalid_input" }, { status: 400 });
        const { languageStyleBlock, sanitizeBrandNames } = await import("@/lib/ai-language");
        return withPayment("outreach-draft", request, async () => {
          const draft = (await agentJson(
            `You are the Aura Akquise desk. Draft one cold outreach email that a busy operator would actually answer.
${languageStyleBlock(language)}
Schema: {"subject":string,"body":string,"opening_line":string,"cta":string,"followup":string,"tone":string}. Under 130 words in body, no fluff, no emoji.`,
            `Lead: ${lead}\nOffer: ${offer}`,
            "draft",
          )) as Record<string, unknown>;
          for (const key of ["subject", "body", "opening_line", "cta", "followup"] as const) {
            if (typeof draft[key] === "string") {
              draft[key] = sanitizeBrandNames(draft[key] as string);
            }
          }
          return draft;
        });
      },
    },
  },
});
