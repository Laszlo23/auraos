import { cn } from "@/lib/utils";

/**
 * Cinematic aurora behind auth / onboarding.
 * Uses the same hero film mirrored from https://aibusiness.fun/
 */
export function VideoBackdrop({
  className,
  intensity = 0.5,
}: {
  className?: string;
  intensity?: number;
}) {
  return (
    <div className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="h-full w-full scale-110 object-cover"
        style={{ opacity: intensity, filter: "saturate(1.15) contrast(1.05)" }}
        onError={(e) => {
          (e.currentTarget as HTMLVideoElement).style.display = "none";
        }}
      >
        <source src="/aura-hero.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,transparent,var(--background)_78%)]" />
    </div>
  );
}
