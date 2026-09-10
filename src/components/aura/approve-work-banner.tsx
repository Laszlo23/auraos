import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/** First-run: filed work is waiting — proof only appears after founder approval. */
export function ApproveWorkBanner({ awaiting }: { awaiting: number }) {
  if (awaiting <= 0) return null;
  return (
    <div className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3">
      <p className="text-[13px] font-semibold text-foreground">
        Your company filed work — approve it to get proof.
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
        {awaiting} item{awaiting === 1 ? "" : "s"} waiting. Nothing spends or goes public until you
        tap yes. Quiet zeros on /proof stay zeros until then.
      </p>
      <Link
        to="/approvals"
        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold"
      >
        Open approvals <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
