import { Link } from "@tanstack/react-router";
import { LucideIcon, Plus, Sparkles } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    to: string;
  };
  secondaryAction?: {
    label: string;
    to: string;
  };
  children?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/20 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
        <Icon className="h-7 w-7" strokeWidth={1.8} />
      </div>

      <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}

      {(action || secondaryAction || children) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Link
              to={action.to}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-8px_var(--glow)] transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              {action.label}
            </Link>
          )}

          {secondaryAction && (
            <Link
              to={secondaryAction.to}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-card/40 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-card/60"
            >
              {secondaryAction.label}
            </Link>
          )}

          {children}
        </div>
      )}
    </div>
  );
}
