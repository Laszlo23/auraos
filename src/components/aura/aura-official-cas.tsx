import { useState } from "react";
import { Check, Copy } from "lucide-react";

import {
  AURA_CURVE_COPY,
  AURA_DEV_BUY_USDC,
  auraOfficialCaRows,
  formatBps,
  AURA_REWARD_SPLIT_BPS,
  AURA_SWAP_BURN_BPS,
} from "@/lib/aura-curve";
import { auraLaunchTreasuryAddress } from "@/lib/aura-token";
import { auraTokenAddress } from "@/lib/aura-self-launch";
import { privateSaleBasescan } from "@/lib/private-sale";

export function AuraOfficialCas({ de = false }: { de?: boolean }) {
  const rows = auraOfficialCaRows({
    token: auraTokenAddress(),
    treasury: auraLaunchTreasuryAddress(),
  });
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied((cur) => (cur === id ? null : cur)), 1600);
    } catch {
      /* select the monospace value manually */
    }
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        {de ? "Offizielle AURA-CAs" : "Official AURA CAs"}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {de ? AURA_CURVE_COPY.vsCultureCoinDe : AURA_CURVE_COPY.vsCultureCoin}{" "}
        {de ? AURA_CURVE_COPY.softwareNotEquityDe : AURA_CURVE_COPY.softwareNotEquity}
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground">
        {de ? "Fee-Split" : "Fee split"}: LP {formatBps(AURA_REWARD_SPLIT_BPS.lpStakers)} ·{" "}
        {de ? "Ops" : "ops"} {formatBps(AURA_REWARD_SPLIT_BPS.protocolSink)} · burn{" "}
        {formatBps(AURA_REWARD_SPLIT_BPS.burn)} · Quest {formatBps(AURA_REWARD_SPLIT_BPS.questBonus)}
        {" · "}
        {de ? "Swap-Burn" : "swap burn"} {formatBps(AURA_SWAP_BURN_BPS)}
        {" · "}
        {de ? "Seed" : "seed"} ${AURA_DEV_BUY_USDC.toLocaleString("en-US")} USDC
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {de ? AURA_CURVE_COPY.officialSeedDe : AURA_CURVE_COPY.officialSeed}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {de ? AURA_CURVE_COPY.tokenTaxZeroDe : AURA_CURVE_COPY.tokenTaxZero}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {de ? AURA_CURVE_COPY.startingBookDe : AURA_CURVE_COPY.startingBook}
      </p>
      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-border/40 bg-background/40 px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {de ? row.labelDe : row.label}
              {!row.t0 ? (
                <span className="ml-2 font-normal normal-case tracking-normal">
                  {de ? "(nicht T-0)" : "(not T-0)"}
                </span>
              ) : null}
            </p>
            {row.value ? (
              <>
                <p className="mt-1 break-all font-mono text-[12px] text-foreground/90">{row.value}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copy(row.id, row.value!)}
                    className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:border-primary/40 hover:text-primary"
                  >
                    {copied === row.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === row.id ? (de ? "Kopiert" : "Copied") : de ? "Kopieren" : "Copy"}
                  </button>
                  {row.kind !== "pool" || row.value.length === 42 ? (
                    <a
                      href={privateSaleBasescan(
                        row.kind === "token" ? `/token/${row.value}` : `/address/${row.value}`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary hover:underline"
                    >
                      Basescan
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-1 text-[12px] text-muted-foreground">
                {de
                  ? "Noch nicht veröffentlicht — 48h-Ankündigung zuerst."
                  : "Unpublished — 48h announce first."}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
