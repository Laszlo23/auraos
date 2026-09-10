import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Panel } from "@/components/aura/primitives";

/** Culture loops stay culture. This strip sends people back to the working OS. */
export function OsDeskBridge() {
  return (
    <Panel label="Run the OS" glow>
      <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
        Squads, Quest, and Tickpix are how we show up together. The desk is where work files a
        receipt — nothing spends or goes public until you approve.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/console"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          Command center <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          to="/missions"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
        >
          First mission
        </Link>
        <Link
          to="/approvals"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
        >
          Approvals
        </Link>
        <Link
          to="/trust"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
        >
          Covenant
        </Link>
      </div>
    </Panel>
  );
}
