import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const STORAGE_KEY = "auraos:beta-badge-dismissed";

/**
 * Global notice that the product is still in beta / active development.
 * Dismissible; sits above the mobile bottom nav so it never fights the chrome.
 */
export function BetaBadge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* private mode */
    }
    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          role="status"
          aria-label="Still in beta and development"
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-[6.75rem] z-[90] flex justify-center px-4 md:inset-x-auto md:bottom-5 md:right-5 md:justify-end md:px-0"
        >
          <div
            className="pointer-events-auto group relative flex max-w-[17rem] items-start gap-2.5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[oklch(0.18_0.02_250/0.42)] px-3.5 py-2.5 shadow-[0_12px_40px_oklch(0.08_0.03_250/0.35),inset_0_1px_0_oklch(1_0_0/0.06)] backdrop-blur-xl backdrop-saturate-150"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,oklch(0.78_0.1_199/0.12),transparent_42%,oklch(0.82_0.1_85/0.06))]"
            />
            <span
              aria-hidden
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80 shadow-[0_0_10px_oklch(0.78_0.12_199/0.55)]"
            />
            <div className="relative min-w-0 flex-1 pr-1">
              <p className="font-mono text-[9px] font-medium uppercase leading-none tracking-[0.22em] text-primary/90">
                Still in beta
              </p>
              <p className="mt-1.5 text-[11px] font-medium leading-snug tracking-wide text-foreground/55">
                Live build · evolving daily
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss beta notice"
              className="relative -mr-0.5 -mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl text-foreground/35 transition-colors hover:bg-white/[0.06] hover:text-foreground/75"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
