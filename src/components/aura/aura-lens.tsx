import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Signature interaction — a soft cyan/gold light that follows intent across
 * the marketing surface. Makes the OS feel tactile and alive without chrome clutter.
 * Disabled on touch / reduced motion.
 */
export function AuraLens() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;

    const root = rootRef.current;
    const spot = spotRef.current;
    if (!root || !spot) return;

    let raf = 0;
    let tx = window.innerWidth * 0.55;
    let ty = window.innerHeight * 0.35;
    let cx = tx;
    let cy = ty;
    let visible = false;

    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      spot.style.transform = `translate3d(${cx - 220}px, ${cy - 220}px, 0)`;
      spot.style.opacity = visible ? "1" : "0";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      visible = true;
    };
    const onLeave = () => {
      visible = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] overflow-hidden mix-blend-screen"
    >
      <div
        ref={spotRef}
        className="h-[440px] w-[440px] rounded-full opacity-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle at 42% 40%, color-mix(in oklab, var(--primary) 28%, transparent) 0%, color-mix(in oklab, var(--gold) 10%, transparent) 32%, transparent 68%)",
          filter: "blur(2px)",
          willChange: "transform, opacity",
        }}
      />
    </div>
  );
}
