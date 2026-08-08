import { createFileRoute } from "@tanstack/react-router";
import { agentJson } from "@/lib/x402-ai";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";

export const Route = createFileRoute("/api/public/x402/astro-reading")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse(
          { error: "use POST", input: { birth_date: "1991-04-17", birth_place: "Vienna" } },
          { status: 405 },
        ),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          birth_date?: unknown;
          birth_time?: unknown;
          birth_place?: unknown;
        };
        const date = (typeof body.birth_date === "string" ? body.birth_date : "")
          .trim()
          .slice(0, 20);
        const time = (typeof body.birth_time === "string" ? body.birth_time : "")
          .trim()
          .slice(0, 10);
        const place = (typeof body.birth_place === "string" ? body.birth_place : "")
          .trim()
          .slice(0, 120);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
          return jsonResponse({ error: "invalid_birth_date" }, { status: 400 });
        return withPayment("astro-reading", request, () =>
          agentJson(
            'You are the Aura astro desk. Produce an entertaining, non-medical, non-financial reading. Schema: {"sun_sign":string,"element":string,"headline":string,"reading":string,"strengths":string[],"watch_out":string[],"lucky_window":string,"disclaimer":string}. Reading under 140 words.',
            `Birth date: ${date}${time ? `, time ${time}` : ""}${place ? `, place ${place}` : ""}`,
            "reading",
          ),
        );
      },
    },
  },
});
