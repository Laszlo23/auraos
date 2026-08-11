import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Dual-spectrum intent light — cyan intelligence + gold revenue, offset slightly
 * so the surface feels dimensional rather than a single flashlight blob.
 */
export function AuraLens() {
  const reduced = usePrefersReducedMotion();
  const cyanRef = useRef<HTMLDivElement>(null);
  const goldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;

    const cyan = cyanRef.current;
    const gold = goldRef.current;
    if (!cyan || !gold) return;

    let raf = 0;
    let tx = window.innerWidth * 0.52;
    let ty = window.innerHeight * 0.38;
    let cx = tx;
    let cy = ty;
    let gx = tx;
    let gy = ty;
    let visible = false;

    const tick = () => {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      gx += (tx - 48 - gx) * 0.08;
      gy += (ty + 36 - gy) * 0.08;
      const op = visible ? "1" : "0";
      cyan.style.transform = `translate3d(${cx - 260}px, ${cy - 260}px, 0)`;
      cyan.style.opacity = op;
      gold.style.transform = `translate3d(${gx - 180}px, ${gy - 180}px, 0)`;
      gold.style.opacity = visible ? "0.85" : "0";
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
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] overflow-hidden mix-blend-screen"
    >
      <div
        ref={cyanRef}
        className="h-[520px] w-[520px] rounded-full opacity-0 transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle at 40% 38%, color-mix(in oklab, var(--primary) 36%, transparent) 0%, color-mix(in oklab, var(--primary) 8%, transparent) 42%, transparent 70%)",
          filter: "blur(1px)",
          willChange: "transform, opacity",
        }}
      />
      <div
        ref={goldRef}
        className="h-[360px] w-[360px] rounded-full opacity-0 transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--gold) 22%, transparent) 0%, transparent 65%)",
          willChange: "transform, opacity",
        }}
      />
    </div>
  );
}
