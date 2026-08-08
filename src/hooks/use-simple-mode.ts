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
  const [simple, setSimple] = useState(true);

  useEffect(() => {
    setSimple(read());
    const sync = () => setSimple(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !read();
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* private mode */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { simple, toggle };
}
