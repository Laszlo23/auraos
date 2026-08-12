/**
 * Mem0 Platform long-term memory (https://docs.mem0.ai).
 * Complements Postgres agent.memory / knowledge_items — semantic recall across runs.
 *
 * Env (any one): MEM0_API_KEY | MEMO_API_KEY | MEM0_KEY
 * Optional: MEM0_APP_ID (default auraos)
 */
import MemoryClient from "mem0ai";

import { MEMORY_UPDATE_MAX_CHARS } from "@/lib/agent-memory";

export type Mem0Scope = {
  /** Company-scoped user id for Mem0 (required for search filters). */
  companyId: string;
  agentId?: string | null;
  /** Optional founder user id for metadata. */
  founderUserId?: string | null;
  runId?: string | null;
};

function mem0ApiKey(): string | null {
  return (
    process.env["MEM0_API_KEY"]?.trim() ||
    process.env["MEMO_API_KEY"]?.trim() ||
    process.env["MEM0_KEY"]?.trim() ||
    null
  );
}

export function mem0Configured(): boolean {
  return Boolean(mem0ApiKey());
}

function appId(): string {
  return process.env["MEM0_APP_ID"]?.trim() || "auraos";
}

/** Mem0 user_id = company — shared company brain across agents. */
function companyUserId(companyId: string): string {
  return `company:${companyId}`;
}

function client(): MemoryClient | null {
  const apiKey = mem0ApiKey();
  if (!apiKey) return null;
  return new MemoryClient({ apiKey });
}

export type Mem0Fact = { id?: string; memory: string; score?: number };

/**
 * Semantic search for a task / chat prompt. Soft-fails to [] if Mem0 is down.
 */
export async function searchMem0(
  query: string,
  scope: Mem0Scope,
  opts?: { topK?: number },
): Promise<Mem0Fact[]> {
  const c = client();
  if (!c) return [];
  const q = query.trim().slice(0, 500);
  if (!q || !scope.companyId) return [];

  try {
    // Platform v3: entity IDs in filters (snake_case). Company-wide brain — all agents share recall.
    const raw = await c.search(q, {
      filters: { user_id: companyUserId(scope.companyId) },
      topK: opts?.topK ?? 8,
      threshold: 0.1,
    });

    const results = Array.isArray(raw)
      ? raw
      : (((raw as { results?: unknown })?.results as unknown[]) ?? []);

    return results
      .map((r) => {
        const row = r as { id?: string; memory?: string; score?: number };
        const memory = String(row.memory ?? "").trim();
        if (!memory) return null;
        return {
          id: row.id,
          memory: memory.slice(0, 400),
          score: typeof row.score === "number" ? row.score : undefined,
        };
      })
      .filter((x): x is Mem0Fact => Boolean(x));
  } catch (e) {
    console.warn("mem0 search failed", e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Persist a lesson / conversation turn into Mem0 (inferred facts).
 * Soft-fails — local Postgres memory remains source of truth for the UI.
 */
export async function addMem0Lesson(
  lesson: string,
  scope: Mem0Scope,
  opts?: { assistantAck?: string },
): Promise<{ ok: boolean }> {
  const c = client();
  if (!c) return { ok: false };
  const content = lesson.trim().slice(0, MEMORY_UPDATE_MAX_CHARS);
  if (!content || !scope.companyId) return { ok: false };

  try {
    const messages = [
      { role: "user" as const, content },
      {
        role: "assistant" as const,
        content: opts?.assistantAck ?? "Noted — saved to company long-term memory.",
      },
    ];
    await c.add(messages, {
      userId: companyUserId(scope.companyId),
      agentId: scope.agentId ?? undefined,
      appId: appId(),
      runId: scope.runId ?? undefined,
      metadata: {
        source: "auraos",
        company_id: scope.companyId,
        founder_user_id: scope.founderUserId ?? undefined,
      },
    });
    return { ok: true };
  } catch (e) {
    console.warn("mem0 add failed", e instanceof Error ? e.message : e);
    return { ok: false };
  }
}

/** Store a short founder↔Atlas exchange for companion-style recall. */
export async function addMem0ChatTurn(
  userText: string,
  assistantText: string,
  scope: Mem0Scope,
): Promise<{ ok: boolean }> {
  const c = client();
  if (!c) return { ok: false };
  const u = userText.trim().slice(0, 2000);
  const a = assistantText.trim().slice(0, 2000);
  if (!u || !a || !scope.companyId) return { ok: false };

  try {
    await c.add(
      [
        { role: "user", content: u },
        { role: "assistant", content: a },
      ],
      {
        userId: companyUserId(scope.companyId),
        agentId: scope.agentId ?? "atlas",
        appId: appId(),
        runId: scope.runId ?? undefined,
        metadata: {
          source: "auraos-ceo",
          company_id: scope.companyId,
        },
      },
    );
    return { ok: true };
  } catch (e) {
    console.warn("mem0 chat add failed", e instanceof Error ? e.message : e);
    return { ok: false };
  }
}

export function formatMem0Facts(facts: Mem0Fact[]): string {
  if (!facts.length) return "";
  return `Long-term memory (Mem0):\n${facts.map((f) => `- ${f.memory}`).join("\n")}`;
}
