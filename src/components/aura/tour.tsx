import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

/**
 * A gentle spotlight tour for first-time visitors. It scrolls each explainer
 * section into view, dims everything else, and says one plain sentence about
 * what they are looking at.
 */
type Stop = { target: string; title: string; body: string };

const STOPS: Stop[] = [
  {
    target: "[data-tour='hero']",
    title: "Start here",
    body: "This is a company you own. You give instructions — AI employees do the work.",
  },
  {
    target: "[data-tour='steps']",
    title: "How it works",
    body: "Three steps: describe the business, the AI staff get hired, they work while you sleep.",
  },
  {
    target: "[data-tour='why']",
    title: "Why it actually works",
    body: "One shared memory, every action measured in money, and you approve anything risky.",
  },
  {
    target: "[data-tour='faq']",
    title: "The honest answers",
    body: "Open any question here — including how to buy a founding seat.",
  },
  {
    target: "[data-tour='claim']",
    title: "Buy your seat",
    body: "Founding seats are open at $99. Pay once, wake the company, then share one invite if you want.",
  },
];

const SEEN_KEY = "aura.tour.seen";

type Box = { top: number; left: number; width: number; height: number };

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY) === "1") return;
    const t = setTimeout(() => setOpen(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const measure = useCallback(() => {
    const el = document.querySelector(STOPS[i]!.target);
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    setBox({ top: r.top - 12, left: r.left - 12, width: r.width + 24, height: r.height + 24 });
  }, [i]);

  useEffect(() => {
    if (!open) return;
    const el = document.querySelector(STOPS[i]!.target);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(measure, 620);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [open, i, measure]);

  const close = () => {
    setOpen(false);
    localStorage.setItem(SEEN_KEY, "1");
  };

  const stop = STOPS[i]!;
  const last = i === STOPS.length - 1;

  // Card sits under the highlight when there's room, otherwise above it.
  const below = box ? box.top + box.height + 16 : 120;
  const cardTop = box && below + 190 > window.innerHeight ? Math.max(16, box.top - 200) : below;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          {/* dimmer with a cut-out over the current section */}
          <div className="absolute inset-0 bg-background/78 backdrop-blur-[2px]" onClick={close} />
          {box && (
            <motion.div
              layout
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
              className="pointer-events-none absolute rounded-[28px] ring-1 ring-primary/50 shadow-[0_0_0_9999px_hsl(var(--background)/0.78),0_0_60px_-10px_var(--primary)]"
            />
          )}

          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ top: cardTop }}
            className="glass absolute left-1/2 w-[min(92vw,26rem)] -translate-x-1/2 rounded-3xl p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="num text-[11px] tracking-[0.3em] text-primary">
                {String(i + 1).padStart(2, "0")} / {String(STOPS.length).padStart(2, "0")}
              </span>
              <button onClick={close} aria-label="Close tour">
                <X className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
              </button>
            </div>
            <p className="mt-3 text-[15px] font-semibold">{stop.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{stop.body}</p>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => setI((n) => Math.max(0, n - 1))}
                disabled={i === 0}
                className="flex items-center gap-1.5 rounded-2xl bg-foreground/8 px-3.5 py-2 text-[12.5px] font-medium disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={() => (last ? close() : setI((n) => n + 1))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground"
              >
                {last ? "Got it" : "Next"} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 flex gap-1.5">
              {STOPS.map((s, n) => (
                <span
                  key={s.target}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    n <= i ? "bg-primary" : "bg-foreground/12"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
