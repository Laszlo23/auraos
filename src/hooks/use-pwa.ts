import { useEffect } from "react";

/** Register the root service worker once per session (client-only). */
export function usePwa() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (import.meta.env.DEV) return; // avoid SW fighting Vite HMR in local dev

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* silent — install UI still works via BIP / iOS tips */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
}
