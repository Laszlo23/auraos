/**
 * Unified AI gateway for Aura OS (post-Lovable).
 *
 * OpenRouter first when OPENROUTER_API_KEY is set — one key, the live catalog,
 * Auto Router (market-ranked per prompt), and ~latest aliases so we ride new
 * frontier releases without another SDK. Direct keys stay as fallbacks:
 *   OpenRouter → Gemini → Moonshot → Groq → FreeLLM → OpenAI → Lovable → xAI
 *
 * Lanes (quality, not vanity):
 *   fast  — public greeter, high-volume chat
 *   smart — Atlas, weekly reports, conversion copy, outreach
 *   json  — structured extract / plan jobs
 *
 * Optional AI_PROVIDER_ORDER overrides try order.
 */

export type AiProviderName =
  | "openrouter"
  | "gemini"
  | "groq"
  | "moonshot"
  | "xai"
  | "freellm"
  | "openai"
  | "lovable";

export type AiLane = "fast" | "smart" | "json";

export const AI_LANES: readonly AiLane[] = ["fast", "smart", "json"];

type Provider = {
  name: AiProviderName;
  chatUrl: string;
  headers: Record<string, string>;
  model: string;
};

export const AI_PROVIDER_DEFAULT_ORDER: AiProviderName[] = [
  "openrouter",
  "gemini",
  "moonshot",
  "groq",
  "freellm",
  "openai",
  "lovable",
  "xai",
];

const DEFAULT_ORDER = AI_PROVIDER_DEFAULT_ORDER;

function env(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return undefined;
}

function buildProviders(): Record<AiProviderName, Provider | null> {
  const geminiKey = env(
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_API_KEY",
    "GENERATIVE_AI_API_KEY",
  );
  const groqKey = env("GROQ_API_KEY");
  const moonshotKey = env("MOONSHOT_API_KEY");
  const xaiKey = env("XAI_API_KEY");
  const freellmKey = env("FREELLM_API_KEY", "FREELMAN_API_KEY");
  const freellmBase = (env("FREELLM_BASE_URL") ?? "").replace(/\/+$/, "");
  const openaiKey = env("OPENAI_API_KEY");
  const openaiBase = (env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const lovableKey = env("LOVABLE_API_KEY");
  const openrouterKey = env("OPENROUTER_API_KEY");
  const siteUrl = (env("SITE_URL") ?? "https://aibusiness.fun").replace(/\/+$/, "");

  return {
    openrouter: openrouterKey
      ? {
          name: "openrouter",
          chatUrl: "https://openrouter.ai/api/v1/chat/completions",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": siteUrl,
            "X-Title": "Aura OS",
          },
          model: env("OPENROUTER_MODEL") ?? "openrouter/auto",
        }
      : null,
    gemini: geminiKey
      ? {
          name: "gemini",
          // Google OpenAI-compatible endpoint — same SSE shape as everyone else
          chatUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${geminiKey}`,
          },
          model: env("GEMINI_MODEL", "AI_CHAT_MODEL") ?? "gemini-3.6-flash",
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
          model: env("GROQ_MODEL", "AI_CHAT_MODEL") ?? "openai/gpt-oss-20b",
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

export function resolveAiProviderOrder(): AiProviderName[] {
  const raw = env("AI_PROVIDER_ORDER");
  const allowed = new Set(DEFAULT_ORDER);
  const parsed = raw
    ? raw
        .split(/[,:\s]+/)
        .map((s) => s.trim().toLowerCase() as AiProviderName)
        .filter((s) => allowed.has(s))
    : [];
  const order = parsed.length ? parsed : [...DEFAULT_ORDER];
  // Stale AI_PROVIDER_ORDER from before OpenRouter shipped should not hide a live key.
  if (env("OPENROUTER_API_KEY") && !order.includes("openrouter")) {
    order.unshift("openrouter");
  }
  return order;
}

function providers(): Provider[] {
  const map = buildProviders();
  const list: Provider[] = [];
  for (const name of resolveAiProviderOrder()) {
    const p = map[name];
    if (p) list.push(p);
  }
  return list;
}

export function aiConfigured(): boolean {
  return providers().length > 0;
}

export function aiConfigHint(): string {
  return "Prefer OPENROUTER_API_KEY (Auto Router + latest frontier). Fallbacks: GEMINI_API_KEY, MOONSHOT_API_KEY, GROQ_API_KEY, FREELLM_API_KEY + FREELLM_BASE_URL, OPENAI_API_KEY. XAI_API_KEY is last-resort when credits remain.";
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
  // Auth / credit / rate issues should never hard-stop the whole chain —
  // fall through to the next configured provider.
  if (status === 401 || status === 403 || status === 429 || status === 402 || status === 503) {
    return true;
  }
  // Wrong/retired model names should fall through the provider chain.
  if (status === 404) return true;
  const d = detail.toLowerCase();
  return (
    d.includes("quota") ||
    d.includes("rate limit") ||
    d.includes("insufficient") ||
    d.includes("suspended") ||
    d.includes("no_providers") ||
    d.includes("no candidate model") ||
    d.includes("billing") ||
    d.includes("credit") ||
    d.includes("spending") ||
    d.includes("not found the model") ||
    d.includes("model_not_found") ||
    d.includes("does not exist") ||
    d.includes("permission denied") ||
    d.includes("invalid model")
  );
}

const DEFAULT_MAX_TOKENS = 1024;

export type OpenRouterLaneSpec = {
  model: string;
  fallbacks: string[];
  costTier: "low" | "medium" | "high";
  jsonMode?: boolean;
  preferThroughput?: boolean;
};

function csvModels(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;
  const parsed = raw
    .split(/[,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length ? parsed : fallback;
}

/** Curated OpenRouter ladder. ~latest aliases follow each lab's newest ship. */
export function openRouterLaneSpec(lane: AiLane): OpenRouterLaneSpec {
  switch (lane) {
    case "fast":
      return {
        model: env("OPENROUTER_FAST_MODEL", "OPENROUTER_MODEL") ?? "openrouter/auto",
        fallbacks: csvModels(env("OPENROUTER_FAST_FALLBACKS"), [
          "~google/gemini-flash-latest",
          "~openai/gpt-mini-latest",
        ]).slice(0, 3),
        costTier: "low",
        preferThroughput: true,
      };
    case "smart":
      return {
        model: env("OPENROUTER_SMART_MODEL", "OPENROUTER_MODEL") ?? "openrouter/auto",
        fallbacks: csvModels(env("OPENROUTER_SMART_FALLBACKS"), [
          "~anthropic/claude-sonnet-latest",
          "~openai/gpt-latest",
          "~google/gemini-pro-latest",
        ]).slice(0, 3),
        costTier: "high",
      };
    case "json":
      return {
        model: env("OPENROUTER_JSON_MODEL", "OPENROUTER_MODEL") ?? "openrouter/auto",
        fallbacks: csvModels(env("OPENROUTER_JSON_FALLBACKS"), [
          "~openai/gpt-mini-latest",
          "~google/gemini-flash-latest",
          "~anthropic/claude-haiku-latest",
        ]).slice(0, 3),
        costTier: "medium",
        jsonMode: true,
      };
    default: {
      const _exhaustive: never = lane;
      return _exhaustive;
    }
  }
}

function chatPayload(
  p: Provider,
  lane: AiLane,
  body: Record<string, unknown>,
): Record<string, unknown> {
  if (p.name !== "openrouter") return body;
  const spec = openRouterLaneSpec(lane);
  const payload: Record<string, unknown> = {
    ...body,
    model: typeof body.model === "string" && body.model ? body.model : spec.model,
    models: spec.fallbacks,
    route: "fallback",
    plugins: [{ id: "auto-router", cost_tier: spec.costTier }],
  };
  if (spec.preferThroughput) {
    payload.provider = { sort: "throughput" };
  }
  if (spec.jsonMode) {
    payload.response_format = { type: "json_object" };
  }
  return payload;
}

function messageText(choice: {
  message?: {
    content?: string | null;
    reasoning_content?: string | null;
    reasoning?: string | null;
  };
}): string | null {
  const msg = choice.message;
  if (!msg) return null;
  const content = typeof msg.content === "string" ? msg.content.trim() : "";
  if (content) return content;
  // Kimi / Groq gpt-oss may put the answer only in reasoning(_content).
  const reasoningContent =
    typeof msg.reasoning_content === "string" ? msg.reasoning_content.trim() : "";
  if (reasoningContent) return reasoningContent;
  const reasoning = typeof msg.reasoning === "string" ? msg.reasoning.trim() : "";
  return reasoning || null;
}

export async function aiChat(opts: {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  model?: string;
  maxTokens?: number;
  /** Override per-provider timeout (ms). */
  timeoutMs?: number;
  /** Quality lane — defaults to fast. Use smart for Atlas / founder work. */
  lane?: AiLane;
}): Promise<string> {
  const chain = providers();
  if (chain.length === 0) throw new Error(`AI is not configured. ${aiConfigHint()}`);

  const lane: AiLane = opts.lane ?? "fast";
  const messages: ChatMessage[] = [
    ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
    ...opts.messages,
  ];
  const maxTokens = Math.min(8192, Math.max(64, opts.maxTokens ?? DEFAULT_MAX_TOKENS));
  const timeoutMs = opts.timeoutMs ?? (maxTokens > 1500 ? AI_FETCH_MS_LONG : AI_FETCH_MS);

  let lastError = "AI unavailable";
  for (const p of chain) {
    let res: Response;
    try {
      res = await fetch(p.chatUrl, {
        method: "POST",
        headers: p.headers,
        signal: fetchTimeoutSignal(timeoutMs),
        body: JSON.stringify(
          chatPayload(p, lane, {
            model: p.name === "openrouter" ? opts.model : (opts.model ?? p.model),
            messages,
            max_tokens: maxTokens,
          }),
        ),
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
  lane?: AiLane;
}): Promise<Response> {
  const chain = providers();
  if (chain.length === 0) {
    return new Response(`AI is not configured. ${aiConfigHint()}`, { status: 500 });
  }

  const lane: AiLane = opts.lane ?? "fast";
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
        signal: fetchTimeoutSignal(lane === "smart" ? 30_000 : 20_000),
        body: JSON.stringify(
          chatPayload(p, lane, {
            model: p.name === "openrouter" ? opts.model : (opts.model ?? p.model),
            stream: true,
            messages,
            max_tokens: maxTokens,
          }),
        ),
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
                  choices?: {
                    delta?: {
                      content?: string;
                      reasoning_content?: string;
                      reasoning?: string;
                    };
                  }[];
                };
                const deltaObj = event.choices?.[0]?.delta;
                const delta =
                  deltaObj?.content || deltaObj?.reasoning_content || deltaObj?.reasoning;
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
        "X-Aura-AI-Lane": lane,
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
  opts?: { lane?: AiLane; timeoutMs?: number },
): Promise<Record<string, unknown>> {
  const chain = providers();
  if (chain.length === 0) throw new Error(`missing_ai_key — ${aiConfigHint()}`);

  const lane: AiLane = opts?.lane ?? "json";
  const timeoutMs = opts?.timeoutMs ?? AI_FETCH_MS;
  let lastError = "ai_unavailable";
  for (const p of chain) {
    let res: Response;
    try {
      res = await fetch(p.chatUrl, {
        method: "POST",
        headers: p.headers,
        signal: fetchTimeoutSignal(timeoutMs),
        body: JSON.stringify(
          chatPayload(p, lane, {
            model: p.name === "openrouter" ? undefined : p.model,
            messages: [
              {
                role: "system",
                content: `${system} Return strict JSON only — no markdown fences, no prose outside JSON.`,
              },
              { role: "user", content: user },
            ],
          }),
        ),
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
    const data = (await res.json()) as {
      model?: string;
      choices?: {
        message?: {
          content?: string | null;
          reasoning_content?: string | null;
          reasoning?: string | null;
        };
      }[];
    };
    const text = data.choices?.[0] ? messageText(data.choices[0]) : null;
    const raw = (text ?? "").replace(/```json|```/g, "").trim();
    const meta = {
      served_by: p.name,
      served_model: typeof data.model === "string" ? data.model : undefined,
      lane,
      generated_at: new Date().toISOString(),
    };
    try {
      return { ...(JSON.parse(raw) as Record<string, unknown>), ...meta };
    } catch {
      return { [fallbackKey]: raw.slice(0, 2000), ...meta };
    }
  }
  throw new Error(lastError);
}
