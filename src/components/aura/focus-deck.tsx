import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useSwipeAxis } from "@/hooks/use-swipe-axis";

type FocusDeckProps = {
  children: ReactNode;
  className?: string;
  /** Labels for page dots / “N of M”. Length should match snap children. */
  labels?: string[];
};

/**
 * Mobile-only vertical snap deck — one focus card per viewport.
 * Hidden from md+; pair with a desktop stacked layout.
 */
export function FocusDeck({ children, className, labels }: FocusDeckProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = labels?.length ?? 0;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const sync = () => {
      const h = el.clientHeight || 1;
      const next = Math.round(el.scrollTop / h);
      setIndex(Math.max(0, Math.min(next, Math.max(0, count - 1))));
    };

    el.addEventListener("scroll", sync, { passive: true });
    sync();
    return () => el.removeEventListener("scroll", sync);
  }, [count]);

  const go = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const h = el.clientHeight;
    const next = Math.max(0, Math.min(index + dir, Math.max(0, count - 1)));
    el.scrollTo({ top: next * h, behavior: "smooth" });
    setIndex(next);
  };

  const swipe = useSwipeAxis({
    axis: "y",
    enabled: count > 1,
    threshold: 56,
    ratio: 1.35,
    onSwipe: go,
  });

  return (
    <div className={cn("md:hidden", className)}>
      <div
        ref={scrollerRef}
        data-no-swipe
        {...swipe}
        className="focus-deck -mx-5 h-[calc(100svh-12.75rem)] snap-y snap-mandatory overflow-y-auto overscroll-y-contain px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {count > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {labels?.[index] ?? "Focus"} · {index + 1}/{count}
          </p>
          <div className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to ${labels?.[i] ?? `card ${i + 1}`}`}
                onClick={() => {
                  const el = scrollerRef.current;
                  if (!el) return;
                  el.scrollTo({ top: i * el.clientHeight, behavior: "smooth" });
                  setIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-primary" : "w-1.5 bg-foreground/20",
                )}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
