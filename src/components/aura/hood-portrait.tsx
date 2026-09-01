import { mediaPath } from "@/lib/site";
import { resolveHoodTraits, type HoodSealId } from "@/lib/hood-traits";
import { cn } from "@/lib/utils";

export type HoodPortraitSize = "hero" | "passport" | "chip" | "tile";

function SealMark({ id, className }: { id: HoodSealId; className?: string }) {
  const common = {
    viewBox: "0 0 80 56",
    className,
    "aria-hidden": true as const,
  };
  switch (id) {
    case "crown":
      return (
        <svg {...common}>
          <path d="M12 44 V22 L28 34 L40 12 L52 34 L68 22 V44 Z" fill="currentColor" />
        </svg>
      );
    case "rose":
      return (
        <svg {...common}>
          <circle cx="40" cy="22" r="12" fill="currentColor" />
          <circle cx="32" cy="28" r="8" fill="currentColor" opacity="0.7" />
          <rect x="38" y="30" width="4" height="14" rx="2" fill="#3dcf8e" />
        </svg>
      );
    case "ledger":
      return (
        <svg {...common}>
          <rect x="24" y="10" width="32" height="30" rx="3" fill="currentColor" />
          <rect x="28" y="18" width="24" height="2" fill="#07090e" opacity="0.45" />
          <rect x="28" y="24" width="18" height="2" fill="#07090e" opacity="0.45" />
        </svg>
      );
    case "rail":
      return (
        <svg {...common}>
          <rect x="12" y="30" width="56" height="6" rx="2" fill="currentColor" />
          <rect x="16" y="14" width="5" height="22" fill="currentColor" />
          <rect x="38" y="14" width="5" height="22" fill="currentColor" />
          <rect x="60" y="14" width="5" height="22" fill="currentColor" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <ellipse cx="40" cy="26" rx="22" ry="12" fill="currentColor" />
          <circle cx="40" cy="26" r="6" fill="#07090e" />
          <circle cx="42" cy="24" r="2" fill="#f6f1e4" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path
            d="M40 8 C52 20 56 28 56 36 C56 46 48 52 40 52 C32 52 24 46 24 36 C24 28 28 20 40 8 Z"
            fill="currentColor"
          />
        </svg>
      );
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/** Colored noggles overlay — trait colors actually show on the portrait. */
function NogglesOverlay({
  fill,
  stem,
  className,
}: {
  fill: string;
  stem: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 80" className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <rect x="28" y="28" width="58" height="34" rx="8" fill={fill} opacity="0.92" />
      <rect x="114" y="28" width="58" height="34" rx="8" fill={fill} opacity="0.92" />
      <rect x="86" y="38" width="28" height="10" rx="3" fill={stem} />
      <rect x="22" y="36" width="10" height="18" rx="3" fill={stem} />
      <rect x="168" y="36" width="10" height="18" rx="3" fill={stem} />
      <rect x="38" y="36" width="20" height="18" rx="4" fill="#07090e" opacity="0.35" />
      <rect x="124" y="36" width="20" height="18" rx="4" fill="#07090e" opacity="0.35" />
    </svg>
  );
}

const SIZE: Record<HoodPortraitSize, string> = {
  hero: "rounded-[2rem]",
  passport: "rounded-[1.35rem]",
  chip: "rounded-full",
  tile: "rounded-[1.4rem]",
};

const RARITY_RING: Record<string, string> = {
  Legendary: "ring-2 ring-gold/70 shadow-[0_0_40px_-8px_oklch(0.85_0.16_85/0.8)]",
  Rare: "ring-1 ring-violet-400/50",
  Uncommon: "ring-1 ring-emerald-400/40",
  Common: "",
};

export function HoodPortrait({
  tokenId,
  size = "passport",
  className,
  foil = true,
  showMeta = true,
}: {
  tokenId: number;
  size?: HoodPortraitSize;
  className?: string;
  foil?: boolean;
  /** Hide bottom overlay (e.g. hero with external caption) */
  showMeta?: boolean;
}) {
  const traits = resolveHoodTraits(tokenId);
  const compact = size === "chip";
  const frameRadius = compact ? "rounded-full" : traits.frame.radiusClass;
  const frameBorder = compact ? "border border-gold/40" : traits.frame.borderClass;

  return (
    <div
      className={cn(
        "hood-frame group relative overflow-hidden bg-hood-stage",
        frameRadius,
        frameBorder,
        SIZE[size],
        RARITY_RING[traits.rarity],
        foil && !compact && "shadow-[var(--shadow-gold)]",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0" style={{ background: traits.background.css }} />
      <img
        src={mediaPath(traits.character.art)}
        alt={`${traits.character.name} — The Hood #${traits.tokenId}`}
        width={800}
        height={800}
        decoding="async"
        style={{ filter: traits.mood.filter }}
        className={cn(
          "relative z-[1] aspect-square w-full object-cover",
          compact
            ? "scale-110"
            : "scale-[1.04] [mask-image:radial-gradient(ellipse_78%_78%_at_50%_42%,#000_58%,transparent_86%)]",
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{ background: traits.mood.wash }}
      />
      {!compact ? (
        <NogglesOverlay
          fill={traits.noggles.fill}
          stem={traits.noggles.stem}
          className="pointer-events-none absolute left-1/2 top-[34%] z-[3] h-[18%] w-[58%] -translate-x-1/2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
        />
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(180deg,transparent_48%,oklch(0.1_0.02_80/0.72))]"
      />
      {!compact && showMeta ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex items-end justify-between gap-3 p-3 sm:p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/90">
              {traits.character.name}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/80">{traits.character.role}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              {traits.rarity} · {traits.mood.label}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-hood-stage/70 px-2 py-1.5 text-gold backdrop-blur-sm">
            <SealMark id={traits.seal.id} className="h-5 w-7" />
            <span className="num text-[11px] font-semibold">#{traits.tokenId}</span>
          </div>
        </div>
      ) : compact ? (
        <div
          aria-hidden
          className="absolute inset-0 z-[4] rounded-full ring-1 ring-inset ring-gold/40"
        />
      ) : null}
      {foil && !compact ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5] opacity-0 transition duration-700 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, oklch(0.9 0.12 85 / 0.18) 46%, transparent 62%)",
          }}
        />
      ) : null}
    </div>
  );
}

export function HoodStillFrame({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hood-frame overflow-hidden rounded-[1.4rem] border border-gold/20 bg-foreground/[0.03]",
        className,
      )}
    >
      <img
        src={mediaPath(src)}
        alt={alt}
        width={800}
        height={800}
        loading="lazy"
        decoding="async"
        className="aspect-square w-full object-cover film-grade"
      />
    </div>
  );
}
