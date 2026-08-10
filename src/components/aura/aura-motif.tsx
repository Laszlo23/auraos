import { cn } from "@/lib/utils";

/**
 * Bottom-right geometric accent for featured glass panels.
 * Decorative only — triangles, circles, squares, lines, soft light bloom.
 */
export function AuraMotif({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 right-0 z-0 w-[min(52%,13.5rem)] overflow-hidden",
        className,
      )}
    >
      {/* Soft light bloom */}
      <div className="aura-motif-bloom absolute -bottom-8 -right-6 h-44 w-44 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_28%,transparent)_0%,color-mix(in_oklab,var(--gold)_10%,transparent)_38%,transparent_70%)] opacity-70 blur-2xl" />

      <svg
        viewBox="0 0 180 180"
        className="absolute bottom-0 right-0 h-[11.5rem] w-[11.5rem] opacity-[0.55]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer ring */}
        <circle
          className="aura-motif-spin-slow"
          cx="118"
          cy="118"
          r="52"
          stroke="color-mix(in oklab, var(--primary) 35%, transparent)"
          strokeWidth="0.75"
          strokeDasharray="3 7"
          style={{ transformOrigin: "118px 118px" }}
        />
        <circle
          cx="118"
          cy="118"
          r="36"
          stroke="color-mix(in oklab, var(--foreground) 12%, transparent)"
          strokeWidth="0.6"
        />

        {/* Drift group */}
        <g className="aura-motif-drift" style={{ transformOrigin: "118px 118px" }}>
          {/* Rotated square */}
          <rect
            className="aura-motif-spin"
            x="98"
            y="98"
            width="40"
            height="40"
            rx="1"
            stroke="color-mix(in oklab, var(--primary) 45%, transparent)"
            strokeWidth="0.85"
            style={{ transformOrigin: "118px 118px", transform: "rotate(18deg)" }}
          />
          {/* Inner diamond */}
          <rect
            x="108"
            y="108"
            width="20"
            height="20"
            stroke="color-mix(in oklab, var(--gold) 40%, transparent)"
            strokeWidth="0.7"
            style={{ transformOrigin: "118px 118px", transform: "rotate(45deg)" }}
          />

          {/* Triangles */}
          <path
            d="M48 142 L68 106 L88 142 Z"
            stroke="color-mix(in oklab, var(--primary) 38%, transparent)"
            strokeWidth="0.7"
            className="aura-motif-pulse"
          />
          <path
            d="M132 52 L148 78 L116 78 Z"
            stroke="color-mix(in oklab, var(--gold) 32%, transparent)"
            strokeWidth="0.65"
          />

          {/* Circles */}
          <circle
            className="aura-motif-pulse"
            cx="64"
            cy="64"
            r="10"
            stroke="color-mix(in oklab, var(--foreground) 18%, transparent)"
            strokeWidth="0.7"
          />
          <circle
            cx="152"
            cy="98"
            r="4"
            fill="color-mix(in oklab, var(--primary) 55%, transparent)"
            className="aura-motif-pulse"
          />
          <circle
            cx="86"
            cy="158"
            r="2.5"
            fill="color-mix(in oklab, var(--gold) 50%, transparent)"
          />

          {/* Small square cluster */}
          <rect
            x="150"
            y="140"
            width="12"
            height="12"
            stroke="color-mix(in oklab, var(--foreground) 16%, transparent)"
            strokeWidth="0.6"
            style={{ transformOrigin: "156px 146px", transform: "rotate(12deg)" }}
          />
          <rect
            x="42"
            y="88"
            width="8"
            height="8"
            stroke="color-mix(in oklab, var(--primary) 30%, transparent)"
            strokeWidth="0.55"
          />
        </g>

        {/* Hairline rules */}
        <g stroke="color-mix(in oklab, var(--foreground) 14%, transparent)" strokeWidth="0.55">
          <line className="aura-motif-dash" x1="28" y1="118" x2="168" y2="118" />
          <line className="aura-motif-dash" x1="118" y1="28" x2="118" y2="168" />
          <line
            x1="72"
            y1="48"
            x2="158"
            y2="162"
            stroke="color-mix(in oklab, var(--primary) 18%, transparent)"
          />
        </g>
      </svg>
    </div>
  );
}
