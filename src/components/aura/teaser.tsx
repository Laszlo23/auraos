import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Play, X } from "lucide-react";

import { useLocale } from "@/hooks/use-locale";
import { trackTeaser } from "@/lib/teaser-track";
import { mediaPath } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Local mirrors of production assets from https://aibusiness.fun/ */
const TEASER_POSTER = mediaPath("/aura-teaser-poster.jpg");
const TEASER_VIDEO = mediaPath("/aura-teaser.mp4");

/**
 * 15-second vertical teaser cut from the Aura hero film.
 * Opens in a phone-shaped glass lightbox — the same 9:16 frame it ships to TikTok in.
 * Every view-through quartile and the CTA click land in `teaser_events`.
 */
export function TeaserLightbox({
  open,
  onClose,
  placement = "hero",
  onClaim,
}: {
  open: boolean;
  onClose: () => void;
  placement?: string;
  onClaim?: () => void;
}) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const marks = useRef<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    marks.current = new Set();
    setLoaded(false);
    trackTeaser("open", { placement });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const v = videoRef.current;
    if (v) {
      if (v.readyState >= 2) setLoaded(true);
      v.currentTime = 0;
      void v.play().catch(() => undefined);
    }
    document.body.style.overflow = "hidden";
    // Never let the spinner outlive the film: some browsers stall on canplay.
    const bail = setTimeout(() => setLoaded(true), 2500);
    return () => {
      clearTimeout(bail);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, placement]);

  const mark = useCallback(
    (event: Parameters<typeof trackTeaser>[0], pct: number) => {
      if (marks.current.has(event)) return;
      marks.current.add(event);
      trackTeaser(event, { placement, positionPct: pct });
    },
    [placement],
  );

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    if (pct > 1) mark("view_start", 0);
    if (pct >= 25) mark("q25", 25);
    if (pct >= 50) mark("q50", 50);
    if (pct >= 75) mark("q75", 75);
  }, [mark]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aura OS 15-second teaser"
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/86 px-4 py-8 backdrop-blur-xl animate-in fade-in duration-300"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close teaser"
        className="absolute right-5 top-5 rounded-full bg-foreground/10 p-2.5 text-foreground/80 transition-colors hover:bg-foreground/20"
      >
        <X className="h-4 w-4" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[min(24rem,92vw)] flex-col items-center gap-4"
      >
        <div className="glass relative w-full overflow-hidden rounded-[2rem] p-1.5 shadow-[var(--shadow-glow)]">
          {!loaded ? (
            <div className="absolute inset-1.5 z-10 grid place-items-center rounded-[1.6rem] bg-background/70 backdrop-blur-sm">
              <span className="grid h-10 w-10 place-items-center">
                <span className="absolute h-10 w-10 animate-[spin_2.2s_linear_infinite] rounded-full border border-primary/25 border-t-primary" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
            </div>
          ) : null}
          <video
            ref={videoRef}
            className="aspect-[9/16] w-full rounded-[1.6rem] object-cover"
            poster={TEASER_POSTER}
            controls
            autoPlay
            loop
            playsInline
            preload="metadata"
            onLoadedData={() => setLoaded(true)}
            onPlaying={() => setLoaded(true)}
            onCanPlay={() => setLoaded(true)}
            onTimeUpdate={onTimeUpdate}
            onEnded={() => trackTeaser("complete", { placement, positionPct: 100 })}
          >
            <source src={TEASER_VIDEO} type="video/mp4" />
          </video>
        </div>

        <button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            const pct = v?.duration ? (v.currentTime / v.duration) * 100 : 0;
            trackTeaser("cta_click", { placement, positionPct: pct });
            onClose();
            if (onClaim) onClaim();
            else void navigate({ to: "/access", search: {} });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90"
        >
          Earn your invite <ArrowRight className="h-4 w-4" />
        </button>

        <a
          href={TEASER_VIDEO}
          download="aura-os-teaser.mp4"
          onClick={() => trackTeaser("download", { placement })}
          className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Download · 1080×1920 · 15s
        </a>
      </div>
    </div>
  );
}

/** Small poster tile that opens the teaser. */
export function TeaserCard({ className }: { className?: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  // Local poster — Lovable CDN assets 404 outside Lovable Cloud.
  const posterSrc = TEASER_POSTER;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group glass relative flex w-full items-center gap-4 rounded-3xl p-4 text-left transition-colors hover:bg-foreground/8",
          className,
        )}
      >
        <span className="relative shrink-0 overflow-hidden rounded-2xl ring-1 ring-primary/25 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.55)]">
          <img
            src={posterSrc}
            alt="Aura OS 15-second teaser thumbnail — dark OS screen with cyan mark"
            title="Watch the Aura OS teaser"
            width={108}
            height={192}
            loading="lazy"
            decoding="async"
            className="h-24 w-[3.375rem] object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 group-hover:scale-110">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
          </span>
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {t("landing.teaserKicker")}
          </span>
          <span className="mt-1.5 block text-[15px] font-semibold leading-snug">
            {t("landing.teaserTitle")}
          </span>
          <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
            {t("landing.teaserBody")}
          </span>
        </span>
      </button>
      <TeaserLightbox open={open} onClose={() => setOpen(false)} placement="pillars" />
    </>
  );
}
