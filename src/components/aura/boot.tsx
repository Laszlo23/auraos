import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { PulseOrbit } from "@/components/aura/pulse-orbit";

const LINES = ["waking the eight", "loading the roster", "loading the reserve"];

/**
 * Cinematic boot curtain. Plays once per browser session so returning
 * scrolls stay instant, and never blocks interaction for longer than ~1.6s.
 */
export function BootCurtain() {
  const [done, setDone] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.sessionStorage.getItem("aura.booted")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.sessionStorage.setItem("aura.booted", "1");
      return;
    }
    setDone(false);
    document.body.style.overflow = "hidden";
    const tick = setInterval(() => setStep((s) => Math.min(s + 1, LINES.length - 1)), 480);
    const end = setTimeout(() => {
      window.sessionStorage.setItem("aura.booted", "1");
      setDone(true);
    }, 1650);
    return () => {
      clearInterval(tick);
      clearTimeout(end);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (done) document.body.style.overflow = "";
  }, [done]);

  return (
    <AnimatePresence>
      {!done ? (
        <motion.div
          key="boot"
          exit={{ opacity: 0, filter: "blur(14px)" }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[95] grid place-items-center bg-background"
        >
          <div className="flex flex-col items-center gap-7">
            <motion.div
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <PulseOrbit size="lg" label={false} />
            </motion.div>

            <div className="h-4 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={step}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.28 }}
                  className="block text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground"
                >
                  {LINES[step]}
                </motion.span>
              </AnimatePresence>
            </div>

            <span className="relative h-px w-44 overflow-hidden bg-foreground/10">
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
                className="absolute inset-0 origin-left bg-primary"
              />
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
