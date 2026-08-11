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

/**
 * The "explain it to anyone" section. No jargon, no acronyms — three plain
 * sentences, three steps, and an honest answer to "why can't I just sign up?".
 */
const STEPS: {
  no: string;
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    no: "01",
    title: "You describe the business",
    body: "In normal words. \u201cI sell apartments in Vienna.\u201d That\u2019s enough to start.",
    icon: ClipboardCheck,
  },
  {
    no: "02",
    title: "AI employees get hired",
    body: "A CEO, a marketer, a salesperson, product, ops. Each one has a job, a memory and a budget.",
    icon: UserRoundPlus,
  },
  {
    no: "03",
    title: "They work while you sleep",
    body: "They find leads, write posts, ship work, and report back in one short summary.",
    icon: Moon,
  },
];

const WHY: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "Because it never forgets",
    body: "Every agent writes to one shared company memory. Ask a question today and it answers with everything the company learned since day one.",
    icon: Brain,
  },
  {
    title: "Because work is measured, not promised",
    body: "Every action has a cost and a result attached. You see what each employee earned or spent \u2014 not a chat log.",
    icon: Scale,
  },
  {
    title: "Because you stay the boss",
    body: "Nothing spends money or goes public until you approve it. You can pause any employee mid-task.",
    icon: ShieldCheck,
  },
];

const FAQ = [
  {
    q: "So\u2026 what is this, in one sentence?",
    a: "A company you run by giving instructions instead of doing the work \u2014 the staff are AI, the results are real.",
  },
  {
    q: "Do I need to know anything technical?",
    a: "No. If you can write a text message, you can run a company here. There is nothing to install and no code to write.",
  },
  {
    q: "How do I get a seat?",
    a: "Buy open — $99 one-time, capped at 1000 companies. No invite needed to purchase. After you're in, you get one invite link to share (friends still pay). Token launch is separate.",
  },
  {
    q: "What do I actually get as a founding member?",
    a: "A paid company seat, a founding badge, one invite to pass on, in-app AURA growth rewards on paid conversions, and a concierge page-review queue. Compute billing and token launch stay separate.",
  },
];

export function Explainer() {
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
          In plain words
        </p>
        <h2 className="mt-4 max-w-3xl font-display text-[clamp(1.8rem,5.4vw,3rem)] leading-[1.02] tracking-tight">
          It&rsquo;s a company. You&rsquo;re the owner.
          <br />
          <span className="text-muted-foreground">The staff just happen to be AI.</span>
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
            <p className="mt-4 text-[15px] font-semibold leading-snug">{s.title}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div data-tour="why">
          <p className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
            Why it works
          </p>
          <div className="mt-6 space-y-6">
            {WHY.map((w) => (
              <div key={w.title} className="flex gap-4 border-l border-primary/30 pl-5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <w.icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{w.title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{w.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div data-tour="faq">
          <p className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
            Straight answers
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
                    <span className="text-[13.5px] font-medium">{f.q}</span>
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
                      {f.a}
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
