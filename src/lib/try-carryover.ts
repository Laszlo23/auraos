/** Session carry-over from /try walkthrough → onboarding prompt. Not a paid seat. */

export const TRY_CARRYOVER_KEY = "aura.try_brief";
const MAX_PROMPT = 500;

export type TryCarryover = {
  prompt: string;
  savedAt: number;
};

export function encodeTryCarryover(prompt: string, savedAt: number = Date.now()): string | null {
  const trimmed = prompt.trim().slice(0, MAX_PROMPT);
  if (!trimmed) return null;
  return JSON.stringify({ prompt: trimmed, savedAt } satisfies TryCarryover);
}

export function decodeTryCarryover(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TryCarryover>;
    const prompt =
      typeof parsed.prompt === "string" ? parsed.prompt.trim().slice(0, MAX_PROMPT) : "";
    return prompt || null;
  } catch {
    return null;
  }
}

export function saveTryCarryover(prompt: string): void {
  if (typeof sessionStorage === "undefined") return;
  const encoded = encodeTryCarryover(prompt);
  if (!encoded) return;
  sessionStorage.setItem(TRY_CARRYOVER_KEY, encoded);
}

/** Read without clearing — auth can happen across a few hops. */
export function peekTryCarryover(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return decodeTryCarryover(sessionStorage.getItem(TRY_CARRYOVER_KEY));
}

/** Consume once onboarding has the sentence. */
export function consumeTryCarryover(): string | null {
  const prompt = peekTryCarryover();
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(TRY_CARRYOVER_KEY);
  return prompt;
}
