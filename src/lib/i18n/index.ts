import { peekLocale, rememberLocale, type UiLocale } from "@/lib/attribution";
import { de } from "./de";
import { en } from "./en";
import { interpolate, localeFromBrowser, resolveMessage, type MessageTree } from "./types";

const catalogs: Record<UiLocale, MessageTree> = { en, de };

export { localeFromBrowser };
export type { UiLocale };

/** Resolve UI locale: stored → browser → en. Explicit ?lang=/path handled in captureAttribution. */
export function resolveUiLocale(opts?: { acceptLanguage?: string | null }): UiLocale {
  if (typeof window !== "undefined") {
    const stored = peekLocale();
    // peekLocale already returns stored or attr or en — enhance with browser if still default-ish
    try {
      const raw = window.localStorage.getItem("aura.ui_locale");
      if (raw === "de" || raw === "en") return raw;
    } catch {
      /* ignore */
    }
    return localeFromBrowser(navigator.language || opts?.acceptLanguage);
  }
  return localeFromBrowser(opts?.acceptLanguage);
}

/** Ensure a locale is persisted on first visit (browser or explicit). */
export function ensureUiLocale(explicit?: UiLocale | null): UiLocale {
  if (typeof window === "undefined") return explicit || "en";
  try {
    const raw = window.localStorage.getItem("aura.ui_locale");
    if (raw === "de" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  const next = explicit || localeFromBrowser(navigator.language);
  rememberLocale(next);
  return next;
}

export function t(
  key: string,
  locale: UiLocale = "en",
  vars?: Record<string, string | number>,
): string {
  const primary = resolveMessage(catalogs[locale] || en, key);
  const fallback = locale === "en" ? undefined : resolveMessage(en, key);
  const template = primary || fallback || key;
  return interpolate(template, vars);
}

export function applyDocumentLang(locale: UiLocale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}
