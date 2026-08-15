import { useState } from "react";
import { motion } from "motion/react";
import {
  Brain,
  ChevronDown,
  ClipboardCheck,
  Moon,
  Scale,
  ShieldCheck,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";

import { useLocale } from "@/hooks/use-locale";

/**
 * The "explain it to anyone" section. No jargon, no acronyms — three plain
 * sentences, three steps, and an honest answer to "why can't I just sign up?".
 */
const STEPS: { no: string; title: string; body: string; icon: LucideIcon }[] = [
  { no: "01", title: "landing.step1", body: "landing.step1Body", icon: ClipboardCheck },
  { no: "02", title: "landing.step2", body: "landing.step2Body", icon: UserRoundPlus },
  { no: "03", title: "landing.step3", body: "landing.step3Body", icon: Moon },
];

const WHY: { title: string; body: string; icon: LucideIcon }[] = [
  { title: "landing.why1", body: "landing.why1Body", icon: Brain },
  { title: "landing.why2", body: "landing.why2Body", icon: Scale },
  { title: "landing.why3", body: "landing.why3Body", icon: ShieldCheck },
];

const FAQ = [
  { q: "landing.faq1q", a: "landing.faq1a" },
  { q: "landing.faq2q", a: "landing.faq2a" },
  { q: "landing.faq3q", a: "landing.faq3a" },
  { q: "landing.faq4q", a: "landing.faq4a" },
];

export function Explainer() {
  const { t } = useLocale();
  const [open, setOpen] = useState<number | null>(2);

  return (
    <section id="plain" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
          {t("landing.plainKicker")}
        </p>
        <h2 className="mt-4 max-w-3xl font-display text-[clamp(1.8rem,5.4vw,3rem)] leading-[1.02] tracking-tight">
          {t("landing.plainTitle")}
          <br />
          <span className="text-muted-foreground">{t("landing.plainTitle2")}</span>
        </h2>
      </motion.div>

      <div data-tour="steps" className="mt-12 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.no}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-3xl p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/12 text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <span className="num text-[11px] tracking-[0.3em] text-primary">{s.no}</span>
            </div>
            <p className="mt-4 text-[15px] font-semibold leading-snug">{t(s.title)}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t(s.body)}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div data-tour="why">
          <p className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
            {t("landing.whyKicker")}
          </p>
          <div className="mt-6 space-y-6">
            {WHY.map((w) => (
              <div key={w.title} className="flex gap-4 border-l border-primary/30 pl-5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <w.icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{t(w.title)}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {t(w.body)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div data-tour="faq">
          <p className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
            {t("landing.faqKicker")}
          </p>
          <div className="mt-6 space-y-2">
            {FAQ.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="glass overflow-hidden rounded-3xl">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-[13.5px] font-medium">{t(f.q)}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-[13px] leading-relaxed text-muted-foreground">
                      {t(f.a)}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
