import { Link } from "@tanstack/react-router";

import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type LogoSize = "xs" | "sm" | "md" | "lg";

const MARK: Record<LogoSize, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

const WORD: Record<LogoSize, string> = {
  xs: "text-[13px]",
  sm: "text-[15px]",
  md: "text-lg",
  lg: "text-[1.65rem]",
};

/** Static CI mark — core + ring + gold approval tick. */
export function AuraMark({
  className,
  title = BRAND.name,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <circle
        cx="256"
        cy="256"
        r="148"
        stroke="currentColor"
        className="text-primary"
        strokeWidth="16"
      />
      <circle
        cx="256"
        cy="256"
        r="148"
        stroke="currentColor"
        className="text-gold"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="118 812"
        transform="rotate(-58 256 256)"
      />
      <circle cx="256" cy="256" r="44" fill="currentColor" className="text-primary" />
      <circle cx="256" cy="256" r="16" fill="currentColor" className="text-primary-foreground" />
    </svg>
  );
}

export function AuraLogo({
  size = "sm",
  wordmark = true,
  to = "/",
  className,
  label = BRAND.name,
}: {
  size?: LogoSize;
  wordmark?: boolean;
  to?: "/" | "/console" | "/brand" | null;
  className?: string;
  label?: string;
}) {
  const inner = (
    <>
      <AuraMark className={cn("shrink-0", MARK[size])} title={label} />
      {wordmark ? (
        <span className={cn("font-display font-bold tracking-[0.16em]", WORD[size])}>
          AURA<span className="text-money"> OS</span>
        </span>
      ) : null}
    </>
  );

  const shared = cn("inline-flex items-center gap-2.5 text-foreground", className);

  if (to) {
    return (
      <Link to={to} className={shared} aria-label={label}>
        {inner}
      </Link>
    );
  }

  return <span className={shared}>{inner}</span>;
}
