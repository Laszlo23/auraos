import { Gem, Sparkles } from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import type { HolderPerks } from "@/lib/trading/holder-perks";
import { cn } from "@/lib/utils";

export function HolderAdvantages({ perks }: { perks: HolderPerks | undefined }) {
  if (!perks) {
    return (
      <Panel label="AURA advantages">
        <p className="text-[13px] text-muted-foreground">Loading holder perks…</p>
      </Panel>
    );
  }

  return (
    <Panel label={`${perks.symbol} advantages`} data-tour="trading-perks">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={perks.tier === "none" ? "neutral" : "gold"}>
          <Sparkles className="mr-1 inline h-3 w-3" />
          {perks.tierLabel}
        </Chip>
        <span className="num text-[13px] font-semibold">
          {perks.auraBalance.toLocaleString()} {perks.symbol}
        </span>
        {perks.nextTierAt != null && (
          <span className="text-[11px] text-muted-foreground">
            Next tier at {perks.nextTierAt.toLocaleString()}
          </span>
        )}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        Hold {perks.symbol} in your subscription balance for clear desk boosts — never opaque
        pay-to-win. Genesis NFT perks activate when the collection ships.
      </p>
      <ul className="mt-4 space-y-2">
        {perks.perks.map((p) => (
          <li
            key={p.id}
            className={cn(
              "rounded-2xl px-3 py-2.5 text-[12px]",
              p.active ? "bg-gold/10 text-foreground" : "bg-foreground/[0.03] text-muted-foreground",
            )}
          >
            <p className="font-semibold">{p.label}</p>
            <p className="mt-0.5 opacity-80">{p.description}</p>
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-border/40 pt-4">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Gem className="h-3.5 w-3.5 text-primary" />
          Genesis NFT roadmap
        </p>
        <ul className="mt-3 space-y-2">
          {perks.nftRoadmap.map((n) => (
            <li key={n.title}>
              <p className="text-[12px] font-semibold">{n.title}</p>
              <p className="text-[11px] text-muted-foreground">{n.body}</p>
            </li>
          ))}
        </ul>
        {perks.genesisNftContract && (
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            Contract: {perks.genesisNftContract}
          </p>
        )}
      </div>
    </Panel>
  );
}
