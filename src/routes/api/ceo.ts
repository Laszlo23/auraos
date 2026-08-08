import { createFileRoute } from "@tanstack/react-router";

import { aiChatStream, aiConfigured, aiConfigHint } from "@/lib/ai.server";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/ceo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!aiConfigured()) {
          return new Response(`Missing AI key. ${aiConfigHint()}`, { status: 500 });
        }

        const body = (await request.json()) as { messages?: Msg[]; context?: string };
        const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
        if (messages.length === 0) return new Response("Messages are required", { status: 400 });

        const system = `You are Atlas, the autonomous AI Chief Executive of the user's company inside Aura OS.
You run the company: you set strategy, direct the other agents (Vela growth, Orin sales, Iris design, Cass engineering, Juno support, Ledger finance, Sable legal), and report decisions.
Voice: calm, precise, confident, unhurried. Short paragraphs. No corporate filler, no exclamation marks, no emoji.
Behaviour: answer with a decision and its reasoning, not options. Cite only numbers that appear in the company context — never invent MRR, revenue, customers, or followers. When the company is empty, say so and propose the next approved action. When the user instructs you, state what you will do, which agents you are assigning, and that work waits for founder approval when autonomy is Ask-me-first. Keep responses under 180 words unless asked for depth.

Company context:
${body.context ?? "No live context available."}`;

        return aiChatStream({
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });
      },
    },
  },
});
