import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { useLocale } from "@/hooks/use-locale";
import { loc, ROBINHOOD_HOMEPAGE_LINE } from "@/lib/robinhood-momentum";

export function RobinhoodMomentumStrip({ className = "" }: { className?: string }) {
  const { locale } = useLocale();

  return (
    <Link
      to="/tokenomics"
      hash="robinhood"
      className={`group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-[13px] leading-snug text-foreground/90 transition-colors hover:border-primary/40 hover:bg-primary/[0.1] ${className}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
        Robinhood Chain
      </span>
      <span className="text-muted-foreground">{loc(locale, ROBINHOOD_HOMEPAGE_LINE)}</span>
      <span className="inline-flex items-center gap-1 font-semibold text-primary">
        Read the plan <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
