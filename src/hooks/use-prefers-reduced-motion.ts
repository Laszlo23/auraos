import { useEffect, useState } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/** Subscribe to prefers-reduced-motion for smooth / accessible UI. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return reduced;
}

export { prefersReducedMotion };
