import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Muted looping film behind a story act. Only starts decoding once the act is
 * near the viewport, so the landing page stays light on mobile data.
 */
export function ActFilm({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [armed, setArmed] = useState(false);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        if (visible) setArmed(true);
        const v = videoRef.current;
        if (!v) return;
        if (visible) void v.play().catch(() => undefined);
        else v.pause();
      },
      { rootMargin: "25% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {armed && !reducedMotion ? (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          onCanPlay={() => setReady(true)}
          className={cn(
            "h-full w-full scale-105 object-cover brightness-110 transition-opacity duration-[1600ms]",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : null}
      <div className="absolute inset-0 bg-background/45" />
      <div className="absolute inset-0 bg-[radial-gradient(115%_85%_at_50%_50%,transparent,var(--background)_78%)]" />
      {/* Always-on aurora so acts never go flat if CDN film 404s */}
      <div
        className="animate-aurora absolute -inset-[30%] opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 40% 45%, oklch(0.75 0.14 199 / 0.22), transparent 55%), radial-gradient(circle at 65% 60%, oklch(0.75 0.12 78 / 0.1), transparent 50%)",
        }}
      />
    </div>
  );
}
