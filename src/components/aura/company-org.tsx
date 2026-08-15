import { motion } from "motion/react";
import {
  Banknote,
  Bot,
  Briefcase,
  Code2,
  Crown,
  Megaphone,
  MessageCircle,
  Package,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

const AGENTS: { label: string; hint: string; icon: LucideIcon }[] = [
  { label: "landing.orgGrowth", hint: "landing.orgGrowthHint", icon: Megaphone },
  { label: "landing.orgSales", hint: "landing.orgSalesHint", icon: Briefcase },
  { label: "landing.orgProduct", hint: "landing.orgProductHint", icon: Package },
  { label: "landing.orgEng", hint: "landing.orgEngHint", icon: Code2 },
  { label: "landing.orgCs", hint: "landing.orgCsHint", icon: Users },
  { label: "landing.orgFinance", hint: "landing.orgFinanceHint", icon: Banknote },
  { label: "landing.orgSocial", hint: "landing.orgSocialHint", icon: MessageCircle },
];

/**
 * One-glance org map — you own the company; the CEO runs the AI roster.
 * Decorative, not a dashboard: clarifies “AI employees” without jargon.
 */
export function CompanyOrg({ className }: { className?: string }) {
  const { t } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative", className)}
      aria-label={t("landing.orgTitle")}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
            {t("landing.orgKicker")}
          </p>
          <h3 className="mt-2 font-display text-[clamp(1.4rem,3.5vw,2rem)] leading-tight tracking-tight">
            {t("landing.orgTitle")}
          </h3>
        </div>
        <p className="max-w-xs text-[12px] leading-relaxed text-muted-foreground">
          {t("landing.orgBody")}
        </p>
      </div>

      {/* Flow strip: You → mission → CEO → work → upside */}
      <div className="mb-8 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <FlowChip icon={Crown} label={t("landing.orgYou")} tone="gold" />
        <FlowArrow />
        <span className="rounded-full border border-border/50 bg-foreground/4 px-3 py-1.5 text-primary">
          {t("landing.orgMission")}
        </span>
        <FlowArrow />
        <FlowChip icon={Bot} label={t("landing.orgCeo")} tone="primary" />
        <FlowArrow />
        <span className="rounded-full border border-border/50 bg-foreground/4 px-3 py-1.5">
          {t("landing.orgAgents")}
        </span>
        <FlowArrow />
        <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-gold">
          {t("landing.orgUpside")}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-gradient-to-b from-primary/[0.07] via-background/40 to-background/80 p-5 sm:p-8">
        {/* Soft orbit rings */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[42%] h-[min(72vw,22rem)] w-[min(72vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[42%] h-[min(48vw,14rem)] w-[min(48vw,14rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/20"
        />

        <div className="relative z-[1] mx-auto flex max-w-3xl flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 shadow-[0_0_40px_-18px_oklch(0.82_0.12_85)]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/20 text-gold">
                <Crown className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{t("landing.orgYouRole")}</p>
                <p className="text-[11px] text-muted-foreground">{t("landing.orgYouHint")}</p>
              </div>
            </div>
            <span className="hidden text-primary/50 sm:block" aria-hidden>
              ↓
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-primary/35 bg-primary/12 px-4 py-3 shadow-[var(--shadow-glow)]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[13px] font-semibold">{t("landing.orgCeoRole")}</p>
                <p className="text-[11px] text-muted-foreground">{t("landing.orgCeoHint")}</p>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            {AGENTS.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: 0.05 * i, duration: 0.45 }}
                className="flex items-center gap-2.5 rounded-2xl border border-border/40 bg-background/50 px-3 py-2.5 backdrop-blur-sm"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-foreground/6 text-primary">
                  <a.icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold">{t(a.label)}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{t(a.hint)}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-[11px] text-muted-foreground/70">{t("landing.orgNote")}</p>
        </div>
      </div>
    </motion.div>
  );
}

function FlowChip({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: "gold" | "primary";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5",
        tone === "gold"
          ? "border-gold/35 bg-gold/10 text-gold"
          : "border-primary/35 bg-primary/12 text-primary",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function FlowArrow() {
  return (
    <span className="text-primary/40" aria-hidden>
      →
    </span>
  );
}
