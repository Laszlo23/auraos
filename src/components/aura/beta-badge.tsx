/**
 * Global corner notice that the product is still in beta / active development.
 */
export function BetaBadge() {
  return (
    <div
      role="status"
      aria-label="Still in beta and development"
      className="pointer-events-none fixed bottom-3 right-3 z-[90] max-w-[11.5rem] select-none sm:bottom-4 sm:right-4 sm:max-w-[13rem]"
    >
      <div className="rounded-md border border-white/15 bg-[oklch(0.16_0.02_250/0.92)] px-2.5 py-1.5 shadow-[0_8px_28px_oklch(0.1_0.02_250/0.45)] backdrop-blur-md">
        <p className="font-mono text-[9px] font-medium uppercase leading-snug tracking-[0.14em] text-primary sm:text-[10px]">
          Still in beta
        </p>
        <p className="mt-0.5 text-[10px] font-medium leading-tight tracking-wide text-muted-foreground sm:text-[11px]">
          and development
        </p>
      </div>
    </div>
  );
}
