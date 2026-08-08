import { createFileRoute } from "@tanstack/react-router";
import { agentJson } from "@/lib/x402-ai";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";

export const Route = createFileRoute("/api/public/x402/imagebook-page")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse(
          { error: "use POST", input: { story: "a fox who builds a rocket", page: 1 } },
          { status: 405 },
        ),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          story?: unknown;
          page?: unknown;
          style?: unknown;
        };
        const story = (typeof body.story === "string" ? body.story : "").trim().slice(0, 300);
        const page =
          typeof body.page === "number" ? Math.min(Math.max(Math.round(body.page), 1), 60) : 1;
        const style = (typeof body.style === "string" ? body.style : "warm watercolour")
          .trim()
          .slice(0, 120);
        if (story.length < 3) return jsonResponse({ error: "invalid_story" }, { status: 400 });
        return withPayment("imagebook-page", request, () =>
          agentJson(
            'You are the Aura image-book desk. Write one illustrated page. Schema: {"page":number,"title":string,"prose":string,"image_prompt":string,"palette":string[],"aspect":"4:3"|"1:1"|"3:4"}. Prose under 70 words, image_prompt is a single render-ready sentence.',
            `Story: ${story}\nPage: ${page}\nStyle: ${style}`,
            "page_text",
          ),
        );
      },
    },
  },
});
