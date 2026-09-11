import { AuraSwapDesk } from "@/components/aura/aura-swap-desk";
import { SaleWalletRoot } from "@/components/aura/sale-wallet";
import {
  AURA_BUY_BASE_APP_URL,
  AURA_BUY_BINANCE_URL,
  AURA_BUY_COPY,
  auraBuyCaPublished,
} from "@/lib/aura-buy-guide";

export function AuraBuyWalletSteps({ de = false }: { de?: boolean }) {
  const live = auraBuyCaPublished();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border/40 bg-foreground/[0.02] px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          2
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          {de ? AURA_BUY_COPY.path2TitleDe : AURA_BUY_COPY.path2Title}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-muted-foreground">
          {(de ? AURA_BUY_COPY.path2StepsDe : AURA_BUY_COPY.path2Steps).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <a
          href={AURA_BUY_BASE_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
        >
          {de ? AURA_BUY_COPY.path2CtaDe : AURA_BUY_COPY.path2Cta}
        </a>
      </section>

      <section className="rounded-2xl border border-border/40 bg-foreground/[0.02] px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          3
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          {de ? AURA_BUY_COPY.path3TitleDe : AURA_BUY_COPY.path3Title}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-muted-foreground">
          {(de ? AURA_BUY_COPY.path3StepsDe : AURA_BUY_COPY.path3Steps).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <a
          href={AURA_BUY_BINANCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
        >
          {de ? AURA_BUY_COPY.path3CtaDe : AURA_BUY_COPY.path3Cta}
        </a>
      </section>

      {live ? (
        <SaleWalletRoot
          wcName="Buy AURA"
          wcDescription="Official AURA/USDC on Base"
          wcUrl="https://aibusiness.fun/buy"
        >
          <AuraSwapDesk de={de} />
        </SaleWalletRoot>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {de ? AURA_BUY_COPY.settleSoonDe : AURA_BUY_COPY.settleSoon}
        </p>
      )}
    </div>
  );
}
