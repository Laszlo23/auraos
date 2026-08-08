/**
 * Paid x402 endpoints — re-exports the shared AI gateway.
 * Prefer importing from `@/lib/ai.server` for new code.
 */
export { aiJson as agentJson, aiConfigured, aiConfigHint } from "@/lib/ai.server";
