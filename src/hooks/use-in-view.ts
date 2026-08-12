import { useCallback, useEffect, useState } from "react";

/** True while the bound element intersects the viewport. Pauses live polls off-screen. */
export function useInView(amount = 0.15) {
  const [node, setNode] = useState<Element | null>(null);
  const [inView, setInView] = useState(false);
  const ref = useCallback((el: Element | null) => setNode(el), []);

  useEffect(() => {
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: amount },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [node, amount]);

  return { ref, inView };
}
