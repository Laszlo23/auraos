import { Link } from "@tanstack/react-router";

import { AuraBuyPacks } from "@/components/aura/aura-buy-packs";
import { AuraBuyWalletSteps } from "@/components/aura/aura-buy-wallet-steps";
import { AuraOfficialCas } from "@/components/aura/aura-official-cas";
import { LaunchCountdown } from "@/components/aura/launch-countdown";
import { AURA_BUY_COPY, auraBuyCaPublished } from "@/lib/aura-buy-guide";

export function AuraBuyGuide({ de = false }: { de?: boolean }) {
  const live = auraBuyCaPublished();

  return (
    <div className="space-y-10">
      <LaunchCountdown variant="compact" showSocials={false} placement="buy" />
      {live ? (
        <AuraOfficialCas de={de} />
      ) : (
        <p className="max-w-xl text-[14px] leading-relaxed text-muted-foreground">
          {de ? AURA_BUY_COPY.clockWaitDe : AURA_BUY_COPY.clockWait}
        </p>
      )}

      <section className="rounded-2xl border border-primary/25 bg-primary/[0.05] px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">1</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          {de ? AURA_BUY_COPY.path1TitleDe : AURA_BUY_COPY.path1Title}
        </h2>
        <div className="mt-4">
          <AuraBuyPacks de={de} />
        </div>
      </section>

      <AuraBuyWalletSteps de={de} />

      <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
        {de ? AURA_BUY_COPY.disclaimerDe : AURA_BUY_COPY.disclaimer}{" "}
        <Link to="/trust" className="font-semibold text-primary hover:underline">
          /trust
        </Link>
      </p>
    </div>
  );
}
