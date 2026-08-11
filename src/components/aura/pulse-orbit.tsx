import { cn } from "@/lib/utils";

type PulseOrbitSize = "sm" | "md" | "lg" | "hero";

const SIZE: Record<PulseOrbitSize, string> = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  hero: "h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20",
};

/**
 * Signature brand mark — a living orbital core.
 * The "company pulse": concentric rings + beating nucleus that syncs to --aura-pulse.
 */
export function PulseOrbit({
  size = "md",
  className,
  label = true,
}: {
  size?: PulseOrbitSize;
  className?: string;
  /** Show wordmark beside the mark (hero / header). */
  label?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn("relative inline-grid shrink-0 place-items-center", SIZE[size])}
        aria-hidden
      >
        {/* Outer breath halo */}
        <span className="aura-pulse-halo absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_38%,transparent)_0%,transparent_70%)]" />

        <svg viewBox="0 0 80 80" className="relative h-full w-full overflow-visible">
          {/* Slow outer orbit */}
          <circle
            className="aura-orbit-spin"
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="color-mix(in oklab, var(--primary) 42%, transparent)"
            strokeWidth="0.9"
            strokeDasharray="2.5 7"
            style={{ transformOrigin: "40px 40px" }}
          />
          {/* Mid ring */}
          <circle
            cx="40"
            cy="40"
            r="24"
            fill="none"
            stroke="color-mix(in oklab, var(--foreground) 16%, transparent)"
            strokeWidth="0.7"
          />
          {/* Counter-spin gold tick ring */}
          <circle
            className="aura-orbit-spin-rev"
            cx="40"
            cy="40"
            r="16"
            fill="none"
            stroke="color-mix(in oklab, var(--gold) 55%, transparent)"
            strokeWidth="1.1"
            strokeDasharray="4 14"
            strokeLinecap="round"
            style={{ transformOrigin: "40px 40px" }}
          />
          {/* Nucleus */}
          <circle
            className="aura-pulse-core"
            cx="40"
            cy="40"
            r="5.5"
            fill="var(--primary)"
            style={{ transformOrigin: "40px 40px" }}
          />
          <circle
            cx="40"
            cy="40"
            r="2.2"
            fill="color-mix(in oklab, var(--primary-foreground) 80%, white)"
          />
        </svg>
      </span>

      {label ? (
        <span
          className={cn(
            "font-display font-bold tracking-[0.16em]",
            size === "hero"
              ? "text-[1.45rem] sm:text-[1.75rem]"
              : size === "lg"
                ? "text-lg"
                : "text-[15px]",
          )}
        >
          AURA<span className="text-money"> OS</span>
        </span>
      ) : null}
    </div>
  );
}
