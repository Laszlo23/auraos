import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FocusCardProps = {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * One job per mobile viewport inside a FocusDeck.
 */
export function FocusCard({ eyebrow, title, children, footer, className }: FocusCardProps) {
  return (
    <section
      className={cn(
        "flex h-full min-h-full snap-start snap-always flex-col justify-center py-2",
        className,
      )}
    >
      <div className="glass relative flex max-h-full min-h-0 flex-col overflow-hidden rounded-3xl p-5 shadow-[var(--shadow-float)]">
        {(eyebrow || title) && (
          <header className="mb-4 shrink-0">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-2 text-xl font-semibold leading-tight tracking-tight">{title}</h2>
            ) : null}
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
        {footer ? <div className="mt-4 shrink-0">{footer}</div> : null}
      </div>
    </section>
  );
}
