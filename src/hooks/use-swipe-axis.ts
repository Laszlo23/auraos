import { useCallback, useRef, type TouchEvent } from "react";

const DEFAULT_THRESHOLD = 70;
const DEFAULT_RATIO = 1.6;

function shouldIgnoreSwipeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("[data-no-swipe]") ||
    target.closest('input, textarea, select, [contenteditable="true"]'),
  );
}

/**
 * Axis-locked swipe helpers for mobile focus navigation.
 * Horizontal: route changes. Vertical: focus-deck (optional assist).
 */
export function useSwipeAxis(opts: {
  axis: "x" | "y";
  onSwipe: (direction: 1 | -1) => void;
  enabled?: boolean;
  threshold?: number;
  ratio?: number;
}) {
  const {
    axis,
    onSwipe,
    enabled = true,
    threshold = DEFAULT_THRESHOLD,
    ratio = DEFAULT_RATIO,
  } = opts;

  const start = useRef<{ x: number; y: number } | null>(null);
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      if (shouldIgnoreSwipeTarget(e.target)) {
        start.current = null;
        return;
      }
      const t = e.touches[0];
      start.current = t ? { x: t.clientX, y: t.clientY } : null;
    },
    [enabled],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const from = start.current;
      const t = e.changedTouches[0];
      start.current = null;
      if (!from || !t) return;
      if (shouldIgnoreSwipeTarget(e.target)) return;

      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;
      const primary = axis === "x" ? dx : dy;
      const secondary = axis === "x" ? dy : dx;

      if (Math.abs(primary) < threshold) return;
      if (Math.abs(primary) < Math.abs(secondary) * ratio) return;

      // Swipe left / up → next (1); right / down → prev (-1)
      onSwipeRef.current(primary < 0 ? 1 : -1);
    },
    [axis, enabled, threshold, ratio],
  );

  return { onTouchStart, onTouchEnd };
}
