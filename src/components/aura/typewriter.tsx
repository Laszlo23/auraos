import { useEffect, useRef, useState } from "react";

/**
 * Types a line out once it scrolls into view. Falls back to the full string
 * instantly when the visitor prefers reduced motion.
 */
export function Typewriter({
  text,
  speed = 34,
  className,
  caret = true,
}: {
  text: string;
  speed?: number;
  className?: string;
  caret?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setArmed(true);
          io.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    // Safety net: if the observer never fires (snap containers, mobile Safari
    // quirks), reveal the line anyway.
    const armFallback = setTimeout(() => setArmed(true), 1200);
    return () => {
      io.disconnect();
      clearTimeout(armFallback);
    };
  }, [text]);

  useEffect(() => {
    if (!armed) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const i = Math.min(text.length, Math.floor((now - start) / speed) + 1);
      setShown(text.slice(0, i));
      if (i < text.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // If rAF is throttled (background tab / low-power mode), never leave the
    // line half-typed.
    const done = setTimeout(() => setShown(text), text.length * speed + 2000);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, [armed, text, speed]);

  const done = shown.length >= text.length;

  return (
    <span ref={ref} className={className}>
      {shown}
      {caret && !done ? (
        <span className="ml-1 inline-block h-[0.82em] w-[3px] translate-y-[-0.02em] animate-pulse bg-current align-middle" />
      ) : null}
      {/* Reserves the full line box so headings never collapse to one glyph. */}
      <span aria-hidden className="opacity-0">
        {text.slice(shown.length) || "\u00a0"}
      </span>
    </span>
  );
}
