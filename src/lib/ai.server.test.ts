import { afterEach, describe, expect, it } from "vitest";

import {
  AI_LANES,
  AI_PROVIDER_DEFAULT_ORDER,
  aiConfigHint,
  openRouterLaneSpec,
  resolveAiProviderOrder,
  type AiLane,
} from "@/lib/ai.server";

describe("AI gateway", () => {
  const touched: string[] = [];

  function setEnv(key: string, value: string | undefined) {
    if (!touched.includes(key)) {
      touched.push(key);
    }
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  afterEach(() => {
    for (const key of touched) delete process.env[key];
    touched.length = 0;
  });

  it("puts OpenRouter first so one key unlocks the catalog", () => {
    expect(AI_PROVIDER_DEFAULT_ORDER[0]).toBe("openrouter");
    expect(AI_PROVIDER_DEFAULT_ORDER).toContain("gemini");
    expect(AI_PROVIDER_DEFAULT_ORDER.at(-1)).toBe("xai");
  });

  it("covers every quality lane", () => {
    expect([...AI_LANES]).toEqual(["fast", "smart", "json"]);
  });

  it("routes fast to Auto Router with cheap latest fallbacks", () => {
    const spec = openRouterLaneSpec("fast");
    expect(spec.model).toBe("openrouter/auto");
    expect(spec.costTier).toBe("low");
    expect(spec.preferThroughput).toBe(true);
    expect(spec.fallbacks[0]).toBe("~google/gemini-flash-latest");
  });

  it("routes smart to Auto Router with frontier latest fallbacks", () => {
    const spec = openRouterLaneSpec("smart");
    expect(spec.model).toBe("openrouter/auto");
    expect(spec.costTier).toBe("high");
    expect(spec.fallbacks).toEqual([
      "~anthropic/claude-sonnet-latest",
      "~openai/gpt-latest",
      "~google/gemini-pro-latest",
    ]);
    expect(spec.fallbacks.length).toBeLessThanOrEqual(3);
  });

  it("routes json to Auto Router with schema-friendly fallbacks", () => {
    const spec = openRouterLaneSpec("json");
    expect(spec.jsonMode).toBe(true);
    expect(spec.costTier).toBe("medium");
    expect(spec.fallbacks).toContain("~openai/gpt-mini-latest");
  });

  it("lets env pin a lane model without a code change", () => {
    setEnv("OPENROUTER_SMART_MODEL", "anthropic/claude-sonnet-4.6");
    expect(openRouterLaneSpec("smart").model).toBe("anthropic/claude-sonnet-4.6");
    expect(openRouterLaneSpec("fast").model).toBe("openrouter/auto");
  });

  it("points operators at OPENROUTER_API_KEY first", () => {
    expect(aiConfigHint()).toMatch(/OPENROUTER_API_KEY/);
  });

  it("prepends OpenRouter when a stale provider order omitted it", () => {
    setEnv("OPENROUTER_API_KEY", "sk-or-test");
    setEnv("AI_PROVIDER_ORDER", "gemini,moonshot,groq");
    expect(resolveAiProviderOrder()[0]).toBe("openrouter");
    expect(resolveAiProviderOrder()).toContain("gemini");
  });

  it("honors an explicit order that already lists OpenRouter", () => {
    setEnv("OPENROUTER_API_KEY", "sk-or-test");
    setEnv("AI_PROVIDER_ORDER", "gemini,openrouter");
    expect(resolveAiProviderOrder()).toEqual(["gemini", "openrouter"]);
  });

  it("fails closed on an unknown lane at compile time", () => {
    const lane: AiLane = "smart";
    switch (lane) {
      case "fast":
      case "smart":
      case "json":
        break;
      default: {
        const _exhaustive: never = lane;
        expect(_exhaustive).toBeUndefined();
      }
    }
  });
});
