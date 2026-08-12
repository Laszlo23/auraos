export function AuroraField({ intensity = 1 }: { intensity?: number }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      {/* Deep radial stage */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% -10%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 58%), radial-gradient(ellipse 60% 50% at 100% 100%, color-mix(in oklab, var(--gold) 10%, transparent), transparent 55%)",
        }}
      />

      <div
        className="animate-aurora absolute -left-[18%] -top-[28%] h-[80vh] w-[80vw] rounded-full blur-[150px]"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--primary) 48%, transparent), transparent 64%)",
          opacity: 0.55 * intensity,
        }}
      />
      <div
        className="animate-aurora absolute -right-[22%] top-[6%] h-[74vh] w-[68vw] rounded-full blur-[160px]"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, color-mix(in oklab, var(--gold) 38%, transparent), transparent 66%)",
          opacity: 0.38 * intensity,
          animationDelay: "-9s",
          animationDuration: "34s",
        }}
      />
      <div
        className="animate-aurora absolute bottom-[-32%] left-[12%] h-[74vh] w-[74vw] rounded-full blur-[170px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--chart-3) 46%, transparent), transparent 68%)",
          opacity: 0.4 * intensity,
          animationDelay: "-16s",
          animationDuration: "40s",
        }}
      />
      <div
        className="animate-aurora absolute left-[40%] top-[40%] h-[42vh] w-[42vw] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--chart-5) 36%, transparent), transparent 70%)",
          opacity: 0.22 * intensity,
          animationDelay: "-22s",
          animationDuration: "48s",
        }}
      />

      {/* Perspective grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklab, var(--primary) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--primary) 55%, transparent) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 10%, transparent 72%)",
          animation: "grid-drift 48s linear infinite",
        }}
      />

      {/* Fine scan veil */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, color-mix(in oklab, var(--primary) 40%, transparent) 3px)",
          maskImage: "radial-gradient(ellipse at 50% 28%, black 18%, transparent 78%)",
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 42%, color-mix(in oklab, var(--background) 78%, black) 100%)",
        }}
      />
    </div>
  );
}
