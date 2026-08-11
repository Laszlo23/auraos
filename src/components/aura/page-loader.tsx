import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Thin top progress bar during every router load/transition.
 * Lightweight — no full-screen block — so navigations feel intentional.
 */
export function PageProgress() {
  const busy = useRouterState({
    select: (s) =>
      s.isLoading ||
      Boolean((s as { isTransitioning?: boolean }).isTransitioning) ||
      s.status === "pending",
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (busy) {
      setVisible(true);
      return;
    }
    const t = window.setTimeout(() => setVisible(false), 220);
    return () => window.clearTimeout(t);
  }, [busy]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[96] h-0.5 overflow-hidden"
    >
      <div
        className={cn(
          "h-full w-full origin-left bg-primary transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
          busy && "animate-[page-loader-slide_1.1s_ease-in-out_infinite]",
        )}
      />
    </div>
  );
}

/**
 * Full-screen pending fallback for route loaders / Suspense (defaultPendingComponent).
 */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[94] grid place-items-center bg-background/85 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-5">
        <span className="relative grid h-12 w-12 place-items-center">
          <span className="absolute inset-0 animate-[spin_1.2s_linear_infinite] rounded-full border border-primary/20 border-t-primary motion-reduce:animate-none" />
          <span className="h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * Cold-boot curtain only when the router stays pending long enough.
 * Avoids forcing a full "Opening Aura" flash on every soft navigation.
 */
export function AppBootLoader() {
  const busy = useRouterState({
    select: (s) => s.isLoading || s.status === "pending",
  });
  const [show, setShow] = useState(false);
  const timer = useRef<number | null>(null);
  const booted = useRef(false);

  useEffect(() => {
    if (busy) {
      if (timer.current) window.clearTimeout(timer.current);
      // First paint cold boot: show sooner; later navs only if stuck.
      const delay = booted.current ? 450 : 80;
      timer.current = window.setTimeout(() => setShow(true), delay);
      return () => {
        if (timer.current) window.clearTimeout(timer.current);
      };
    }
    booted.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 120);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [busy]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="app-boot"
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[94] grid place-items-center bg-background"
        >
          <div className="flex flex-col items-center gap-5">
            <span className="relative grid h-12 w-12 place-items-center">
              <span className="absolute inset-0 animate-[spin_1.2s_linear_infinite] rounded-full border border-primary/20 border-t-primary motion-reduce:animate-none" />
              <span className="h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
              Opening Aura
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
