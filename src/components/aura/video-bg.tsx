import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { mediaPath } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Cinematic aurora behind auth / onboarding.
 * Uses the same hero film mirrored from https://aibusiness.fun/
 * Loads metadata only; pauses off-screen; skips film when reduced motion.
 */
export function VideoBackdrop({
  className,
  intensity = 0.5,
}: {
  className?: string;
  intensity?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(true);
  const [failed, setFailed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reducedMotion || failed) return;
    if (inView) void v.play().catch(() => setFailed(true));
    else v.pause();
  }, [inView, reducedMotion, failed]);

  return (
    <div
      ref={wrapRef}
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}
    >
      {!reducedMotion && !failed ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={mediaPath("/aura-teaser-poster.jpg")}
          className="h-full w-full scale-110 object-cover"
          style={{ opacity: intensity, filter: "saturate(1.15) contrast(1.05)" }}
          onError={() => setFailed(true)}
        >
          <source src={mediaPath("/aura-hero.mp4")} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, oklch(0.75 0.14 199 / 0.18), transparent 55%), #07090e",
          }}
        />
      )}
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,transparent,var(--background)_78%)]" />
    </div>
  );
}
