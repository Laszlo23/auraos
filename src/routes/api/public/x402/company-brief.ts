import { createFileRoute } from "@tanstack/react-router";
import { agentJson } from "@/lib/x402-ai";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";

async function brief(subject: string) {
  const out = await agentJson(
    'You are Atlas, the Aura CEO agent. Write a tight strategic brief. Return strict JSON: {"subject":string,"thesis":string,"forces":string[],"risks":string[],"moves":string[],"one_line":string}. Max 4 items per array, each under 22 words.',
    subject,
    "brief",
  );
  return { subject, agent: "Atlas", ...out };
}

export const Route = createFileRoute("/api/public/x402/company-brief")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse(
          { error: "use POST", input: { subject: "onchain payments in 2026" } },
          { status: 405 },
        ),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { subject?: unknown };
        const subject = (typeof body.subject === "string" ? body.subject : "").trim().slice(0, 300);
        if (subject.length < 3) return jsonResponse({ error: "invalid_subject" }, { status: 400 });
        return withPayment("company-brief", request, () => brief(subject));
      },
    },
  },
});
