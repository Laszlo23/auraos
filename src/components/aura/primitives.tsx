import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { AuraMotif } from "@/components/aura/aura-motif";

export function Panel({
  className,
  children,
  glow = false,
  motif,
  delay = 0,
  label,
  action,
  bodyClassName,
  ...rest
}: {
  className?: string;
  children: ReactNode;
  glow?: boolean;
  /** Geometric accent (defaults on when glow is true). */
  motif?: boolean;
  delay?: number;
  label?: string;
  action?: ReactNode;
  bodyClassName?: string;
} & Omit<React.ComponentProps<typeof motion.div>, "children">) {
  const showMotif = motif ?? glow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "glass hover-lift relative rounded-3xl",
        showMotif && "overflow-hidden",
        glow && "shadow-[var(--shadow-glow)]",
        className,
      )}
      {...rest}
    >
      {showMotif ? <AuraMotif /> : null}
      {label ? (
        <>
          <div className="relative z-10 flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
            <span className="h-1.5 w-1.5 rotate-45 bg-primary/70" aria-hidden />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {label}
            </h2>
            {action ? <div className="ml-auto flex items-center gap-2">{action}</div> : null}
          </div>
          <div
            className={cn(
              "relative z-10 p-5",
              showMotif && "pb-10 pr-16 sm:pr-20",
              bodyClassName,
            )}
          >
            {children}
          </div>
        </>
      ) : (
        <div className={cn("relative z-10", showMotif && "pb-8 pr-14")}>{children}</div>
      )}
    </motion.div>
  );
}

export function DataRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "gold" | "primary" | "default";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-2.5 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "num text-sm font-semibold",
          tone === "gold" && "text-gold",
          tone === "primary" && "text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-6 border-b border-border/50 pb-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rotate-45 bg-primary/70" />
          {title}
        </h2>
        {hint ? <p className="mt-1.5 text-[13px] text-muted-foreground/80">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-gradient text-3xl font-semibold leading-[1.06] md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Pulse({
  tone = "primary",
}: {
  tone?: "primary" | "gold" | "muted" | "destructive";
}) {
  const color =
    tone === "gold"
      ? "bg-gold"
      : tone === "muted"
        ? "bg-muted-foreground"
        : tone === "destructive"
          ? "bg-destructive"
          : "bg-primary";
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      <span className={cn("animate-breathe absolute inset-0 rounded-full", color)} />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "gold" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-secondary text-secondary-foreground",
    primary: "bg-primary/12 text-primary",
    gold: "bg-gold/14 text-gold",
    danger: "bg-destructive/14 text-destructive",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Meter({ value, tone = "primary" }: { value: number; tone?: "primary" | "gold" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/8">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className={cn("h-full rounded-full", tone === "gold" ? "bg-gold" : "bg-primary")}
      />
    </div>
  );
}

export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("shimmer relative rounded-2xl bg-foreground/6", className)}>
      <div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
        style={{ animation: "shimmer-sweep 1.6s ease-in-out infinite" }}
      />
    </div>
  );
}
