import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * A mellow dopamine beat: soft light motes rise once, then dissolve.
 * Deliberately quiet — no confetti storms, no sound.
 */
export function Celebrate({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="pointer-events-none fixed inset-0 z-[80] grid place-items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.5, 0], scale: 2.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="h-40 w-40 rounded-full bg-primary/25 blur-3xl"
          />
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = (i / 18) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: Math.cos(angle) * (120 + (i % 5) * 34),
                  y: Math.sin(angle) * (90 + (i % 4) * 30) - 40,
                  scale: 1,
                }}
                transition={{ duration: 1.5, delay: i * 0.015, ease: [0.16, 1, 0.3, 1] }}
                className="absolute h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]"
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

export function XpToast({ label, amount, show }: { label: string; amount: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass pointer-events-none fixed bottom-8 left-1/2 z-[90] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm shadow-[var(--shadow-glow)]"
        >
          <span className="text-muted-foreground">{label}</span>{" "}
          <span className="num font-semibold text-primary">+{amount} XP</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
