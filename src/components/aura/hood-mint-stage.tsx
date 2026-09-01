import { useState } from "react";

import { HoodAuraClaim } from "@/components/aura/hood-aura-claim";
import { HoodEarlyPassGate } from "@/components/aura/hood-early-pass";
import { HoodMintCountdown } from "@/components/aura/hood-mint-countdown";
import { HoodWalletMint } from "@/components/aura/hood-wallet-mint";
import { SocialJoinRow } from "@/components/aura/launch-countdown";
import { hoodMintIsOpen } from "@/lib/hood-mint";
import { cn } from "@/lib/utils";

type StepId = "wait" | "early" | "mint";

function StepPill({
  id,
  label,
  active,
  done,
}: {
  id: StepId;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
        active
          ? "border-gold/50 bg-gold/10 text-gold"
          : done
            ? "border-gold/25 text-gold/70"
            : "border-white/10 text-muted-foreground",
      )}
      aria-current={active ? "step" : undefined}
      data-step={id}
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded-full text-[9px]",
          active ? "bg-gold text-background" : done ? "bg-gold/30 text-gold" : "bg-white/10",
        )}
      >
        {done ? "✓" : id === "wait" ? "1" : id === "early" ? "2" : "3"}
      </span>
      {label}
    </div>
  );
}

export function HoodMintStage({ locale }: { locale: "en" | "de" }) {
  const de = locale === "de";
  const [earlyUnlocked, setEarlyUnlocked] = useState(false);
  const mintOpen = hoodMintIsOpen() || earlyUnlocked;
  const publicOpen = hoodMintIsOpen();

  const activeStep: StepId = publicOpen ? "mint" : earlyUnlocked ? "mint" : "early";

  return (
    <div className="jewel space-y-6 rounded-[1.65rem] border border-gold/30 p-5 sm:p-7">
      <div>
        <p className="label-luxury-gold">{de ? "Mint-Schalter" : "Mint desk"}</p>
        <h2 className="mt-2 font-display text-[clamp(1.35rem,3vw,1.85rem)] font-semibold tracking-tight">
          {de ? "Early Pass → Wallet → Claim" : "Early pass → wallet → claim"}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <StepPill
          id="wait"
          label={de ? "Warten" : "Wait"}
          active={!publicOpen && !earlyUnlocked}
          done={publicOpen || earlyUnlocked}
        />
        <StepPill
          id="early"
          label={de ? "Early" : "Early"}
          active={activeStep === "early"}
          done={earlyUnlocked || publicOpen}
        />
        <StepPill
          id="mint"
          label={de ? "Mint" : "Mint"}
          active={activeStep === "mint" && mintOpen}
          done={false}
        />
      </div>

      <HoodMintCountdown locale={locale} showSocials={false} compact />

      {!publicOpen ? (
        <HoodEarlyPassGate locale={locale} onUnlocked={setEarlyUnlocked} compact />
      ) : null}

      {mintOpen ? (
        <HoodWalletMint locale={locale} earlyUnlocked={earlyUnlocked} compact />
      ) : null}

      <details className="group rounded-[1.2rem] border border-gold/20 bg-hood-stage/40 px-4 py-3">
        <summary className="cursor-pointer list-none text-[13px] font-semibold text-foreground/90 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-gold/80 group-open:hidden">
            {de ? "Schon gemintet? AURA claimen →" : "Already minted? Claim AURA →"}
          </span>
          <span className="hidden text-gold/80 group-open:inline">
            {de ? "AURA Claim" : "AURA claim"}
          </span>
        </summary>
        <div className="mt-4 border-t border-gold/15 pt-4">
          <HoodAuraClaim locale={locale} embedded />
        </div>
      </details>

      <div className="border-t border-gold/15 pt-4">
        <p className="mb-2 text-[11px] text-muted-foreground">
          {de
            ? "Offizielle Kanäle — nie einer CA aus einer DM."
            : "Official channels — never a CA from a DM."}
        </p>
        <SocialJoinRow placement="hood-mint-stage" />
      </div>
    </div>
  );
}
