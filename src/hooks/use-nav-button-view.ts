import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const KEY = "aura:nav-button-view";
const EVENT = "aura:nav-button-view-change";

export const NAV_BUTTON_VIEWS = ["comfortable", "compact", "icons"] as const;
export type NavButtonView = (typeof NAV_BUTTON_VIEWS)[number];

function isNavButtonView(value: string | null): value is NavButtonView {
  return value === "comfortable" || value === "compact" || value === "icons";
}

function read(): NavButtonView {
  try {
    const raw = localStorage.getItem(KEY);
    return isNavButtonView(raw) ? raw : "comfortable";
  } catch {
    return "comfortable";
  }
}

/** How sidebar buttons look: roomy, tight, or icon-only. */
export function useNavButtonView() {
  const [view, setViewState] = useState<NavButtonView>("comfortable");

  useEffect(() => {
    setViewState(read());
    const sync = () => setViewState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setView = useCallback((next: NavButtonView) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { view, setView };
}

export function navItemChrome(
  view: NavButtonView,
  opts: { active: boolean; collapsed: boolean },
): { hideLabel: boolean; link: string; icon: string } {
  const hideLabel = opts.collapsed || view === "icons";
  const tone = opts.active
    ? "text-foreground"
    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground";

  switch (view) {
    case "comfortable":
      return {
        hideLabel,
        link: cn(
          "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors",
          tone,
          hideLabel && "justify-center px-0",
        ),
        icon: "relative h-[17px] w-[17px] shrink-0",
      };
    case "compact":
      return {
        hideLabel,
        link: cn(
          "group relative flex items-center gap-2 rounded-xl px-2 py-1.5 text-[12px] transition-colors",
          tone,
          hideLabel && "justify-center px-0",
        ),
        icon: "relative h-3.5 w-3.5 shrink-0",
      };
    case "icons":
      return {
        hideLabel: true,
        link: cn(
          "group relative flex items-center justify-center rounded-2xl p-2 text-sm transition-colors",
          tone,
        ),
        icon: "relative h-[17px] w-[17px] shrink-0",
      };
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
