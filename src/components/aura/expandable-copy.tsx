import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { ReadSurface } from "@/components/aura/read-surface";
import { cn } from "@/lib/utils";

type ExpandableCopyProps = {
  text: string;
  title?: string;
  maxLines?: 2 | 3 | 4;
  className?: string;
};

/**
 * Preview with line clamp. If content overflows, tap opens full-screen ReadSurface.
 * Never leaves truncated text without a way to read it (HIG / Material).
 */
export function ExpandableCopy({
  text,
  title = "Read",
  maxLines = 3,
  className,
}: ExpandableCopyProps) {
  const measureRef = useRef<HTMLParagraphElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);
  const previewId = useId();

  const clampClass =
    maxLines === 2 ? "line-clamp-2" : maxLines === 4 ? "line-clamp-4" : "line-clamp-3";

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const measure = () => {
      el.classList.remove("line-clamp-2", "line-clamp-3", "line-clamp-4");
      const full = el.scrollHeight;
      el.classList.add(clampClass);
      const clamped = el.clientHeight;
      setOverflows(full > clamped + 1);
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [text, clampClass]);

  if (!text.trim()) return null;

  const preview = (
    <p
      ref={measureRef}
      className={cn(
        "text-[13px] leading-relaxed text-muted-foreground",
        clampClass,
        overflows && "group-hover:text-foreground/80",
      )}
    >
      {text}
    </p>
  );

  if (!overflows) {
    return <div className={className}>{preview}</div>;
  }

  return (
    <>
      <button
        type="button"
        id={previewId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(
          "group w-full rounded-xl text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
          className,
        )}
      >
        {preview}
        <span className="mt-1.5 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Read more
        </span>
      </button>
      <ReadSurface open={open} onOpenChange={setOpen} title={title}>
        <p className="whitespace-pre-wrap">{text}</p>
      </ReadSurface>
    </>
  );
}

/** Character / line heuristic when clamp measurement is impractical (nested layouts). */
export function ExpandableCopyBlock({
  children,
  text,
  title = "Read",
  className,
}: {
  children: ReactNode;
  text: string;
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = text.trim().length > 140 || text.split("\n").length > 3;

  if (!long) {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className,
        )}
      >
        {children}
        <span className="mt-1.5 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Read more
        </span>
      </button>
      <ReadSurface open={open} onOpenChange={setOpen} title={title}>
        <p className="whitespace-pre-wrap">{text}</p>
      </ReadSurface>
    </>
  );
}
