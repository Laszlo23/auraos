export function AuroraField({ intensity = 1 }: { intensity?: number }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="animate-aurora absolute -left-[15%] -top-[25%] h-[75vh] w-[75vw] rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--primary) 40%, transparent), transparent 65%)",
          opacity: 0.5 * intensity,
        }}
      />
      <div
        className="animate-aurora absolute -right-[20%] top-[10%] h-[70vh] w-[65vw] rounded-full blur-[150px]"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, color-mix(in oklab, var(--gold) 32%, transparent), transparent 66%)",
          opacity: 0.34 * intensity,
          animationDelay: "-9s",
          animationDuration: "34s",
        }}
      />
      <div
        className="animate-aurora absolute bottom-[-30%] left-[20%] h-[70vh] w-[70vw] rounded-full blur-[160px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--chart-3) 40%, transparent), transparent 68%)",
          opacity: 0.36 * intensity,
          animationDelay: "-16s",
          animationDuration: "40s",
        }}
      />
      {/* Fine scan veil — reads as living OS substrate */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, color-mix(in oklab, var(--primary) 35%, transparent) 3px)",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
