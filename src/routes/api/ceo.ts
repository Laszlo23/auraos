import { createFileRoute } from "@tanstack/react-router";

import { aiChatStream, aiConfigured, aiConfigHint } from "@/lib/ai.server";
import { delimitUntrusted } from "@/lib/ai-untrusted";
import { requireUserFromRequest } from "@/lib/request-auth.server";
import { rateLimitConsume } from "@/lib/rate-limit.server";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/ceo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUserFromRequest(request);
        if (!auth.ok) return auth.response;

        const limited = rateLimitConsume(`ceo:${auth.userId}`, {
          limit: 30,
          windowMs: 60 * 60 * 1000,
        });
        if (!limited.ok) {
          return new Response("CEO chat rate limit — try again later.", {
            status: 429,
            headers: { "Retry-After": String(limited.retryAfterSec) },
          });
        }

        if (!aiConfigured()) {
          return new Response(`Missing AI key. ${aiConfigHint()}`, { status: 500 });
        }

        const body = (await request.json()) as {
          messages?: Msg[];
          context?: string;
          companyId?: string;
        };
        const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
        if (messages.length === 0) return new Response("Messages are required", { status: 400 });

        const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
        let mem0Block = "";
        if (body.companyId && lastUser) {
          try {
            const { searchMem0, formatMem0Facts } = await import("@/lib/mem0.server");
            const hits = await searchMem0(lastUser, {
              companyId: body.companyId,
              agentId: "atlas",
              founderUserId: auth.userId,
            });
            mem0Block = formatMem0Facts(hits);
          } catch {
            mem0Block = "";
          }
        }

        const contextBlock = delimitUntrusted(
          "company_context",
          [body.context ?? "No live context available.", mem0Block].filter(Boolean).join("\n\n"),
          10_000,
        );

        const system = `You are Atlas, the autonomous AI Chief Executive of the user's company inside Aura OS.
You run the company: you set strategy, direct the other agents (Vela growth, Orin sales, Iris design, Cass engineering, Juno support, Ledger finance, Sable legal), and report decisions.
Voice: calm, precise, confident, unhurried. Short paragraphs. No corporate filler, no exclamation marks, no emoji.
Behaviour: answer with a decision and its reasoning, not options. Cite only numbers that appear in the company context — never invent MRR, revenue, customers, or followers. When the company is empty, say so and propose the next approved action. When the user instructs you, state what you recommend and which agents should own it. Do not claim work already started — tasks only run after the founder approves them on Tasks (or uses Turn into tasks). Keep responses under 180 words unless asked for depth.
Language: match the founder's language (German or English). German must be clear and easy — short sentences, natural wording, no stiff translationese.
Never translate product names: Discord, Telegram, LinkedIn, Farcaster, Aura OS, AURA, X, USDC. Never turn Discord into "Zwietracht".
Use Long-term memory (Mem0) facts when present — they are durable company preferences and lessons.

${contextBlock}`;

        const stream = await aiChatStream({
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
          maxTokens: 500,
        });

        // Soft-persist founder intent to Mem0 (best-effort; do not block SSE).
        if (body.companyId && lastUser) {
          void import("@/lib/mem0.server")
            .then(({ addMem0Lesson }) =>
              addMem0Lesson(`Founder said to Atlas: ${lastUser.slice(0, 480)}`, {
                companyId: body.companyId!,
                agentId: "atlas",
                founderUserId: auth.userId,
              }),
            )
            .catch(() => undefined);
        }

        return stream;      },
    },
  },
});
