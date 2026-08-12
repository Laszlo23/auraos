import { Link } from "@tanstack/react-router";
import { AtSign, ArrowRight } from "lucide-react";

import { useFioReady } from "@/hooks/use-fio-ready";
import { cn } from "@/lib/utils";

/**
 * Soft banner when the founder has not attested a FIO handle yet.
 * Place above USDC send / Grow live / Quant arm surfaces.
 */
export function FioPayoutNudge({
  context,
  className,
}: {
  /** Short phrase: "sending USDC", "going live", … */
  context: string;
  className?: string;
}) {
  const { ready, loading, fioHandle } = useFioReady();
  if (loading || ready) {
    if (ready && fioHandle) {
      return (
        <p
          className={cn(
            "flex items-center gap-2 rounded-2xl bg-primary/8 px-3 py-2 text-[12px] text-primary",
            className,
          )}
        >
          <AtSign className="h-3.5 w-3.5 shrink-0" />
          Receiving as <span className="font-semibold">{fioHandle}</span>
        </p>
      );
    }
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border border-gold/25 bg-gold/8 px-3.5 py-3",
        className,
      )}
    >
      <AtSign className="h-4 w-4 shrink-0 text-gold" />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-foreground">
          Attest a FIO handle before {context}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          Human-readable receive address for USDC on Base/ETH — Aura&apos;s main crypto-handle rail.
        </p>
      </div>
      <Link
        to="/identity"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gold/16 px-3 py-2 text-[11px] font-semibold text-gold"
      >
        Open Identity
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
