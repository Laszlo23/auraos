/**
 * Unified AI gateway for Aura OS (post-Lovable).
 *
 * Cheap-first OpenAI-compatible chain:
 *   FreeLLM (stacked free tiers) → Moonshot → Gemini → Groq → xAI → OpenAI → Lovable
 *
 * FreeLLMAPI (https://github.com/tashfeenahmed/freellmapi) aggregates free-tier
 * providers behind one /v1 endpoint with model=auto routing. Keep paid keys as
 * fallbacks when the free pool is rate-limited.
 *
 * Set FREELLM_API_KEY + FREELLM_BASE_URL (e.g. http://127.0.0.1:3001/v1).
 * Optional AI_PROVIDER_ORDER overrides try order.
 */

export type AiProviderName =
  | "gemini"
  | "groq"
  | "moonshot"
  | "xai"
  | "freellm"
  | "openai"
  | "lovable";

type Provider = {
  name: AiProviderName;
  chatUrl: string;
  headers: Record<string, string>;
  model: string;
};

const DEFAULT_ORDER: AiProviderName[] = [
  "freellm",
  "moonshot",
  "gemini",
  "groq",
  "xai",
  "openai",
  "lovable",
];

function env(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return undefined;
}

function buildProviders(): Record<AiProviderName, Provider | null> {
  const geminiKey = env("GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY", "GENERATIVE_AI_API_KEY");
  const groqKey = env("GROQ_API_KEY");
  const moonshotKey = env("MOONSHOT_API_KEY");
  const xaiKey = env("XAI_API_KEY");
  const freellmKey = env("FREELLM_API_KEY", "FREELMAN_API_KEY");
  const freellmBase = (env("FREELLM_BASE_URL") ?? "").replace(/\/+$/, "");
  const openaiKey = env("OPENAI_API_KEY");
  const openaiBase = (env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const lovableKey = env("LOVABLE_API_KEY");

  return {
    gemini: geminiKey
      ? {
          name: "gemini",
          // Google OpenAI-compatible endpoint — same SSE shape as everyone else
          chatUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${geminiKey}`,
          },
          model: env("GEMINI_MODEL", "AI_CHAT_MODEL") ?? "gemini-flash-latest",
        }
      : null,
    groq: groqKey
      ? {
          name: "groq",
          chatUrl: "https://api.groq.com/openai/v1/chat/completions",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          model: env("GROQ_MODEL", "AI_CHAT_MODEL") ?? "llama-3.1-8b-instant",
        }
      : null,
    moonshot: moonshotKey
      ? {
          name: "moonshot",
          chatUrl: `${(env("MOONSHOT_BASE_URL") ?? "https://api.moonshot.ai/v1").replace(/\/+$/, "")}/chat/completions`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${moonshotKey}`,
          },
          model: env("MOONSHOT_MODEL", "AI_CHAT_MODEL") ?? "kimi-k3",
        }
      : null,
    xai: xaiKey
      ? {
          name: "xai",
          chatUrl: "https://api.x.ai/v1/chat/completions",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${xaiKey}`,
          },
          // Prefer a cheap/fast Grok when credits are limited
          model: env("XAI_MODEL", "AI_CHAT_MODEL") ?? "grok-3-mini",
        }
      : null,
    freellm:
      freellmKey && freellmBase
        ? {
            name: "freellm",
            chatUrl: `${freellmBase}/chat/completions`,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${freellmKey}`,
            },
            model: env("FREELLM_MODEL", "AI_CHAT_MODEL") ?? "auto",
          }
        : null,
    openai: openaiKey
      ? {
          name: "openai",
          chatUrl: `${openaiBase}/chat/completions`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          model: env("OPENAI_MODEL", "AI_CHAT_MODEL") ?? "gpt-4.1-mini",
        }
      : null,
    lovable: lovableKey
      ? {
          name: "lovable",
          chatUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": lovableKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          model: env("LOVABLE_AI_MODEL", "AI_CHAT_MODEL") ?? "google/gemini-3.6-flash",
        }
      : null,
  };
}

function providerOrder(): AiProviderName[] {
  const raw = env("AI_PROVIDER_ORDER");
  if (!raw) return DEFAULT_ORDER;
  const allowed = new Set(DEFAULT_ORDER);
  const parsed = raw
    .split(/[,:\s]+/)
    .map((s) => s.trim().toLowerCase() as AiProviderName)
    .filter((s) => allowed.has(s));
  return parsed.length ? parsed : DEFAULT_ORDER;
}

function providers(): Provider[] {
  const map = buildProviders();
  const list: Provider[] = [];
  for (const name of providerOrder()) {
    const p = map[name];
    if (p) list.push(p);
  }
  return list;
}

export function aiConfigured(): boolean {
  return providers().length > 0;
}

export function aiConfigHint(): string {
  return "Prefer FreeLLMAPI (FREELLM_API_KEY + FREELLM_BASE_URL=http://127.0.0.1:3001/v1, model=auto). Fallbacks: GEMINI_API_KEY, GROQ_API_KEY, MOONSHOT_API_KEY, XAI_API_KEY.";
}

export function aiProviderNames(): AiProviderName[] {
  return providers().map((p) => p.name);
}

/** Per-provider request budget — prevents hung gateways from stalling the desk. */
const AI_FETCH_MS = 12_000;
const AI_FETCH_MS_LONG = 30_000;

function fetchTimeoutSignal(ms = AI_FETCH_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function isSoftFail(status: number, detail: string): boolean {
  if (status === 429 || status === 402 || status === 503) return true;
  // Wrong/retired model names should fall through the provider chain.
  if (status === 404) return true;
  const d = detail.toLowerCase();
  // Grok / paid APIs often return 403 when credits are exhausted.
  if (
    status === 403 &&
    (d.includes("credit") ||
      d.includes("spending") ||
      d.includes("quota") ||
      d.includes("billing") ||
      d.includes("permission-denied") ||
      d.includes("permission denied"))
  ) {
    return true;
  }
  return (
    d.includes("quota") ||
    d.includes("rate limit") ||
    d.includes("insufficient") ||
    d.includes("suspended") ||
    d.includes("no_providers") ||
    d.includes("no candidate model") ||
    d.includes("billing") ||
    d.includes("not found the model") ||
    d.includes("model_not_found") ||
    d.includes("does not exist") ||
    d.includes("permission denied") ||
    d.includes("invalid model")
  );
}

const DEFAULT_MAX_TOKENS = 1024;

function messageText(choice: {
  message?: {
    content?: string | null;
    reasoning_content?: string | null;
  };
}): string | null {
  const msg = choice.message;
  if (!msg) return null;
  const content = typeof msg.content === "string" ? msg.content.trim() : "";
  if (content) return content;
  // Kimi / reasoning models may put the answer only in reasoning_content.
  const reasoning =
    typeof msg.reasoning_content === "string" ? msg.reasoning_content.trim() : "";
  return reasoning || null;
}

export async function aiChat(opts: {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  model?: string;
  maxTokens?: number;
  /** Override per-provider timeout (ms). */
  timeoutMs?: number;
}): Promise<string> {
  const chain = providers();
  if (chain.length === 0) throw new Error(`AI is not configured. ${aiConfigHint()}`);

  const messages: ChatMessage[] = [
    ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
    ...opts.messages,
  ];
  const maxTokens = Math.min(8192, Math.max(64, opts.maxTokens ?? DEFAULT_MAX_TOKENS));
  const timeoutMs =
    opts.timeoutMs ?? (maxTokens > 1500 ? AI_FETCH_MS_LONG : AI_FETCH_MS);

  let lastError = "AI unavailable";
  for (const p of chain) {
    let res: Response;
    try {
      res = await fetch(p.chatUrl, {
        method: "POST",
        headers: p.headers,
        signal: fetchTimeoutSignal(timeoutMs),
        body: JSON.stringify({
          model: opts.model ?? p.model,
          messages,
          max_tokens: maxTokens,
        }),
      });
    } catch {
      lastError = `${p.name} unreachable`;
      continue;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (isSoftFail(res.status, detail)) {
        lastError = `${p.name} soft-fail`;
        continue;
      }
      lastError = `${p.name} ${res.status}`;
      continue;
    }
    const data = (await res.json()) as {
      choices?: {
        message?: { content?: string | null; reasoning_content?: string | null };
      }[];
    };
    const text = data.choices?.[0] ? messageText(data.choices[0]) : null;
    if (text) return text;
    lastError = `${p.name} empty`;
  }

  throw new Error(`${lastError}. ${aiConfigHint()}`);
}

/** Stream plain text deltas (chat completions SSE). */
export async function aiChatStream(opts: {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  model?: string;
  maxTokens?: number;
}): Promise<Response> {
  const chain = providers();
  if (chain.length === 0) {
    return new Response(`AI is not configured. ${aiConfigHint()}`, { status: 500 });
  }

  const messages: ChatMessage[] = [
    ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
    ...opts.messages,
  ];
  const maxTokens = Math.min(2048, Math.max(64, opts.maxTokens ?? 512));

  let lastStatus = 500;
  let lastDetail = "AI unavailable";

  for (const p of chain) {
    let upstream: Response;
    try {
      upstream = await fetch(p.chatUrl, {
        method: "POST",
        headers: p.headers,
        signal: fetchTimeoutSignal(20_000),
        body: JSON.stringify({
          model: opts.model ?? p.model,
          stream: true,
          messages,
          max_tokens: maxTokens,
        }),
      });
    } catch {
      lastDetail = `${p.name} unreachable`;
      continue;
    }

    if (!upstream.ok || !upstream.body) {
      lastDetail = await upstream.text().catch(() => `${p.name} failed`);
      lastStatus = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 500;
      if (isSoftFail(upstream.status, lastDetail)) {
        lastDetail = `${p.name} unavailable (${upstream.status})`;
        continue;
      }
      continue;
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = upstream.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const event = JSON.parse(payload) as {
                  choices?: { delta?: { content?: string } }[];
                };
                const delta = event.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {
                /* partial frame */
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        void reader.cancel();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Aura-AI-Provider": p.name,
      },
    });
  }

  return new Response(`${lastDetail}. ${aiConfigHint()}`, { status: lastStatus });
}

/** JSON-mode helper used by tasks, trading, x402, etc. */
export async function aiJson(
  system: string,
  user: string,
  fallbackKey = "result",
): Promise<Record<string, unknown>> {
  const chain = providers();
  if (chain.length === 0) throw new Error(`missing_ai_key — ${aiConfigHint()}`);

  let lastError = "ai_unavailable";
  for (const p of chain) {
    let res: Response;
    try {
      res = await fetch(p.chatUrl, {
        method: "POST",
        headers: p.headers,
        signal: fetchTimeoutSignal(),
        body: JSON.stringify({
          model: p.model,
          messages: [
            {
              role: "system",
              content: `${system} Return strict JSON only — no markdown fences, no prose outside JSON.`,
            },
            { role: "user", content: user },
          ],
        }),
      });
    } catch {
      lastError = `${p.name}_unreachable`;
      continue;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (isSoftFail(res.status, detail)) {
        lastError = `${p.name}_soft_fail`;
        continue;
      }
      lastError = `ai_${res.status}`;
      continue;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = (data.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
    const meta = { served_by: p.name, generated_at: new Date().toISOString() };
    try {
      return { ...(JSON.parse(raw) as Record<string, unknown>), ...meta };
    } catch {
      return { [fallbackKey]: raw.slice(0, 2000), ...meta };
    }
  }
  throw new Error(lastError);
}
