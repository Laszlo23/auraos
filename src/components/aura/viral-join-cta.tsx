import { Link } from "@tanstack/react-router";
import { ArrowRight, Radio, ShieldCheck } from "lucide-react";

import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";
import { viralJoinHref, type ViralJoinCampaign } from "@/lib/viral-join";

/**
 * Watch / share-kit conversion strip — attributed join + pit + covenant.
 */
export function ViralJoinCta({
  campaign,
  content,
  className,
  primaryLabel = "Start with Aura",
}: {
  campaign: ViralJoinCampaign;
  content?: string;
  className?: string;
  primaryLabel?: string;
}) {
  const authHref = viralJoinHref({
    path: "/auth",
    campaign,
    content,
    mode: "signup",
  });
  const accessHref = viralJoinHref({
    path: "/access",
    campaign,
    content,
  });

  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-primary/25 bg-primary/5 p-5",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
        Join the room
      </p>
      <p className="mt-2 text-[14px] font-medium leading-snug text-foreground">
        Own a company desk. Verify on-chain. Never trust a CA from a DM.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={authHref}
          onClick={() =>
            trackTeaser("cta_click", { placement: `viral_auth_${campaign}`.slice(0, 40) })
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
        >
          {primaryLabel} <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <a
          href={accessHref}
          onClick={() =>
            trackTeaser("cta_click", { placement: `viral_access_${campaign}`.slice(0, 40) })
          }
          className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/[0.04] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          Founding seat
        </a>
        <Link
          to="/pit"
          onClick={() =>
            trackTeaser("cta_click", { placement: `viral_pit_${campaign}`.slice(0, 40) })
          }
          className="inline-flex items-center gap-2 rounded-2xl border border-border/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          <Radio className="h-3.5 w-3.5 text-primary" /> Tickpix
        </Link>
        <Link
          to="/trust"
          onClick={() =>
            trackTeaser("cta_click", { placement: `viral_trust_${campaign}`.slice(0, 40) })
          }
          className="inline-flex items-center gap-2 rounded-2xl border border-border/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Covenant
        </Link>
      </div>
    </div>
  );
}
