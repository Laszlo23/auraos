import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { mediaPath } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Cinematic hero film — same asset as https://aibusiness.fun/
 * Served from `/aura-hero.mp4`. Canvas aurora is only a fallback if the film fails.
 * Plays only while in view; respects prefers-reduced-motion (poster / canvas only).
 */
export function HeroFilm({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOk, setVideoOk] = useState(false);
  const [inView, setInView] = useState(true);
  const reducedMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.06, 1.24]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.15]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        setInView(visible);
      },
      { rootMargin: "10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (videoOk || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const orbs = Array.from({ length: 4 }, (_, i) => ({
      x: 0.2 + i * 0.2,
      y: 0.3 + (i % 2) * 0.2,
      r: 0.28,
      speed: 0.1 + i * 0.04,
      phase: i * 1.4,
    }));

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (t: number) => {
      const sec = t * 0.001;
      ctx.fillStyle = "#07090e";
      ctx.fillRect(0, 0, w, h);
      for (const o of orbs) {
        const x = (o.x + Math.sin(sec * o.speed + o.phase) * 0.06) * w;
        const y = (o.y + Math.cos(sec * o.speed * 0.9 + o.phase) * 0.05) * h;
        const r = o.r * Math.max(w, h);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(0, 229, 255, 0.2)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [videoOk, reducedMotion]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reducedMotion) return;
    const ok = () => setVideoOk(true);
    const fail = () => setVideoOk(false);
    v.addEventListener("loadeddata", ok);
    v.addEventListener("playing", ok);
    v.addEventListener("error", fail);
    if (inView) void v.play().catch(() => setVideoOk(false));
    else v.pause();
    return () => {
      v.removeEventListener("loadeddata", ok);
      v.removeEventListener("playing", ok);
      v.removeEventListener("error", fail);
    };
  }, [inView, reducedMotion]);

  return (
    <div
      ref={ref}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
    >
      <motion.div
        style={{ scale: reducedMotion ? 1 : scale, opacity }}
        className="absolute inset-0 film-grade"
      >
        {!videoOk ? (
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        ) : null}
        {!reducedMotion ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={mediaPath("/aura-teaser-poster.jpg")}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
              videoOk ? "opacity-100" : "opacity-0",
            )}
          >
            <source src={mediaPath("/aura-hero.mp4")} type="video/mp4" />
          </video>
        ) : (
          <img
            src={mediaPath("/aura-teaser-poster.jpg")}
            alt="Aura OS cinematic hero still — dark operating system desk with cyan accent light"
            title="Aura OS hero"
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
            fetchPriority="high"
          />
        )}
      </motion.div>

      <div className="absolute inset-0 bg-background/42" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_28%_42%,transparent_0%,color-mix(in_oklab,var(--background)_55%,transparent)_55%,var(--background)_92%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,transparent_30%,var(--background)_95%)] opacity-80" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-b from-transparent via-background/75 to-background" />
      {/* Living film edge — cyan/gold hairline that reads as OS chrome */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent opacity-80"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_26%,transparent),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_70%)] blur-2xl"
      />
    </div>
  );
}
