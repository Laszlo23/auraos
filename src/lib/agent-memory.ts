/** Cap stored agent memory so prompts stay bounded. */
export const AGENT_MEMORY_MAX_CHARS = 4000;
export const MEMORY_UPDATE_MAX_CHARS = 500;

/** Append a lesson into agent memory, newest first, truncated to max length. */
export function mergeAgentMemory(
  existing: string | null | undefined,
  update: string | null | undefined,
  maxChars = AGENT_MEMORY_MAX_CHARS,
): string {
  const lesson = (update ?? "").trim().slice(0, MEMORY_UPDATE_MAX_CHARS);
  if (!lesson) return (existing ?? "").trim().slice(0, maxChars);
  const stamp = new Date().toISOString().slice(0, 10);
  const next = `[${stamp}] ${lesson}\n${(existing ?? "").trim()}`.trim();
  if (next.length <= maxChars) return next;
  return next.slice(0, maxChars - 1).trimEnd() + "…";
}

/** Format knowledge + recent results + optional Mem0 facts for an agent prompt. */
export function formatMemoryContext(parts: {
  memory?: string | null;
  knowledge?: { title: string; summary: string | null }[];
  recentResults?: { title: string; result: string | null }[];
  /** Semantic long-term facts from Mem0 Platform. */
  mem0Facts?: string[];
}): string {
  const blocks: string[] = [];
  const memory = (parts.memory ?? "").trim();
  if (memory) blocks.push(`Agent memory:\n${memory}`);

  const mem0 = (parts.mem0Facts ?? []).map((f) => f.trim()).filter(Boolean);
  if (mem0.length) {
    blocks.push(`Long-term memory (Mem0):\n${mem0.map((f) => `- ${f}`).join("\n")}`);
  }

  const knowledge = parts.knowledge ?? [];
  if (knowledge.length) {
    blocks.push(
      `Company knowledge:\n${knowledge
        .map((k) => `- ${k.title}: ${(k.summary ?? "").trim() || "(empty)"}`)
        .join("\n")}`,
    );
  }

  const recent = parts.recentResults ?? [];
  if (recent.length) {
    blocks.push(
      `Recent completed work:\n${recent
        .map((r) => `- ${r.title}: ${(r.result ?? "").trim() || "done"}`)
        .join("\n")}`,
    );
  }

  return blocks.join("\n\n");
}
