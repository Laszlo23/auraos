import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { rememberLocale, type UiLocale } from "@/lib/attribution";
import { applyDocumentLang, ensureUiLocale, t as translate } from "@/lib/i18n";

type LocaleCtx = {
  locale: UiLocale;
  setLocale: (next: UiLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>(() =>
    typeof window === "undefined" ? "en" : ensureUiLocale(),
  );

  useEffect(() => {
    const next = ensureUiLocale();
    setLocaleState(next);
    applyDocumentLang(next);
  }, []);

  const setLocale = useCallback((next: UiLocale) => {
    rememberLocale(next);
    setLocaleState(next);
    applyDocumentLang(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, locale, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback for routes outside provider (should not happen under Root).
    const locale = typeof window === "undefined" ? "en" : ensureUiLocale();
    return {
      locale,
      setLocale: (next) => {
        rememberLocale(next);
        applyDocumentLang(next);
      },
      t: (key, vars) => translate(key, locale, vars),
    };
  }
  return ctx;
}
