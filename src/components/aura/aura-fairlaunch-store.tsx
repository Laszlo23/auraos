import { Link } from "@tanstack/react-router";
import { Smartphone, Wallet } from "lucide-react";

import { AuraBuyPacks } from "@/components/aura/aura-buy-packs";
import { AuraFairlaunchWallet } from "@/components/aura/aura-fairlaunch-wallet";
import { AuraOfficialCas } from "@/components/aura/aura-official-cas";
import { SaleWalletRoot } from "@/components/aura/sale-wallet";
import { AURA_GET_COPY, auraGetCaLive } from "@/lib/aura-fairlaunch";
import { cn } from "@/lib/utils";

export type FairlaunchWay = "smart" | "wallet";

export function AuraFairlaunchStore({
  de = false,
  way,
  onWay,
}: {
  de?: boolean;
  way: FairlaunchWay;
  onWay: (next: FairlaunchWay) => void;
}) {
  const live = auraGetCaLive();

  return (
    <div className="space-y-8">
      {live ? (
        <AuraOfficialCas de={de} />
      ) : (
        <p className="max-w-xl text-[14px] leading-relaxed text-muted-foreground">
          {de ? AURA_GET_COPY.clockWaitDe : AURA_GET_COPY.clockWait}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={way === "smart"}
          onClick={() => onWay("smart")}
          className={cn(
            "rounded-[1.6rem] border px-5 py-5 text-left transition-colors",
            way === "smart"
              ? "border-primary/40 bg-primary/10"
              : "border-border/50 bg-foreground/[0.02] hover:border-primary/25",
          )}
        >
          <Smartphone className="h-5 w-5 text-primary" aria-hidden />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            {de ? AURA_GET_COPY.smartTagDe : AURA_GET_COPY.smartTag}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {de ? AURA_GET_COPY.smartTitleDe : AURA_GET_COPY.smartTitle}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {de ? AURA_GET_COPY.smartBodyDe : AURA_GET_COPY.smartBody}
          </p>
        </button>
        <button
          type="button"
          aria-pressed={way === "wallet"}
          onClick={() => onWay("wallet")}
          className={cn(
            "rounded-[1.6rem] border px-5 py-5 text-left transition-colors",
            way === "wallet"
              ? "border-primary/40 bg-primary/10"
              : "border-border/50 bg-foreground/[0.02] hover:border-primary/25",
          )}
        >
          <Wallet className="h-5 w-5 text-primary" aria-hidden />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            {de ? AURA_GET_COPY.walletTagDe : AURA_GET_COPY.walletTag}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {de ? AURA_GET_COPY.walletTitleDe : AURA_GET_COPY.walletTitle}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {de ? AURA_GET_COPY.walletBodyDe : AURA_GET_COPY.walletBody}
          </p>
        </button>
      </div>

      <section className="rounded-[1.6rem] border border-primary/20 bg-foreground/[0.03] px-5 py-6">
        {way === "smart" ? (
          <AuraBuyPacks de={de} compact />
        ) : (
          <SaleWalletRoot
            wcName="Get AURA"
            wcDescription="Official AURA/USDC on Base"
            wcUrl="https://aibusiness.fun/get"
          >
            <AuraFairlaunchWallet de={de} live={live} />
          </SaleWalletRoot>
        )}
      </section>

      <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
        {de ? AURA_GET_COPY.disclaimerDe : AURA_GET_COPY.disclaimer}{" "}
        <Link to="/trust" className="font-semibold text-primary hover:underline">
          /trust
        </Link>
      </p>
    </div>
  );
}
