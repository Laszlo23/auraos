import { AURA_CURVE_COPY, AURA_DEV_BUY_USDC } from "@/lib/aura-curve";
import {
  AURA_TOKEN_DESCRIPTION,
  AURA_TOKEN_DESCRIPTION_DE,
  AURA_TOKEN_WEBSITE,
  auraTokenImageUrl,
  auraTokenSocials,
} from "@/lib/aura-token-meta";
import { AURA_TOKEN_SYMBOL } from "@/lib/aura-token";

export function AuraTokenIdentity({ de = false, compact = false }: { de?: boolean; compact?: boolean }) {
  const socials = auraTokenSocials();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <img
        src={auraTokenImageUrl()}
        alt={`${AURA_TOKEN_SYMBOL} logo`}
        width={compact ? 56 : 72}
        height={compact ? 56 : 72}
        className="h-14 w-14 shrink-0 rounded-2xl border border-border/40 bg-foreground/[0.03] object-contain p-2 sm:h-[4.5rem] sm:w-[4.5rem]"
      />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {AURA_TOKEN_SYMBOL} · Base
        </p>
        <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">
          {de ? AURA_TOKEN_DESCRIPTION_DE : AURA_TOKEN_DESCRIPTION}
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground">
          {de ? AURA_CURVE_COPY.officialSeedDe : AURA_CURVE_COPY.officialSeed} ${AURA_DEV_BUY_USDC.toLocaleString("en-US")}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {de ? AURA_CURVE_COPY.youCanSellDe : AURA_CURVE_COPY.youCanSell}{" "}
          {de ? AURA_CURVE_COPY.tokenTaxZeroDe : AURA_CURVE_COPY.tokenTaxZero}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {de ? AURA_CURVE_COPY.startingBookDe : AURA_CURVE_COPY.startingBook}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {socials.map((s) => (
            <a
              key={s.platform}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:border-primary/40 hover:text-primary"
            >
              {s.label}
            </a>
          ))}
          <a
            href={AURA_TOKEN_WEBSITE}
            className="rounded-full border border-border/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:border-primary/40 hover:text-primary"
          >
            /token
          </a>
          <a
            href="/api/token/aura"
            className="rounded-full border border-border/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:border-primary/40 hover:text-primary"
          >
            JSON
          </a>
        </div>
      </div>
    </div>
  );
}
