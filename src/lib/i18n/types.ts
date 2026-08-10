import type { UiLocale } from "@/lib/attribution";

export type { UiLocale };

export type MessageTree = {
  [key: string]: string | MessageTree;
};

export function resolveMessage(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let cur: string | MessageTree | undefined = tree;
  for (const p of parts) {
    if (!cur || typeof cur === "string") return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] === undefined ? `{${key}}` : String(vars[key]),
  );
}

export function localeFromBrowser(input?: string | null): UiLocale {
  const raw = (input || "").toLowerCase();
  if (raw.startsWith("de")) return "de";
  return "en";
}
