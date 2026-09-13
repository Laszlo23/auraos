import { useCallback, useEffect, useState } from "react";

const KEY = "aura:simple-mode";
const EVENT = "aura:simple-mode-change";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

/** Simple mode is ON by default: only the core surfaces are shown, in plain language. */
export function useSimpleMode() {
  const [simple, setSimpleState] = useState(true);

  useEffect(() => {
    setSimpleState(read());
    const sync = () => setSimpleState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setSimple = useCallback((next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* private mode */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(() => {
    setSimple(!read());
  }, [setSimple]);

  return { simple, toggle, setSimple };
}
