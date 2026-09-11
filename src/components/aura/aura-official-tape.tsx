import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { MarketCandles } from "@/components/aura/trading/market-candles";
import { visibleRefetchInterval } from "@/hooks/use-aura";
import { AURA_DEV_BUY_USDC } from "@/lib/aura-curve";
import { getAuraOfficialTape } from "@/lib/aura-tape.functions";
import type { ChartInterval } from "@/lib/trading/market-data.server";

export function AuraOfficialTape({ de = false }: { de?: boolean }) {
  const [interval, setInterval] = useState<ChartInterval>("1h");
  const tape = useQuery({
    queryKey: ["aura-official-tape", interval],
    queryFn: () => getAuraOfficialTape({ data: { interval } }),
    refetchInterval: visibleRefetchInterval(30_000),
  });
  const data = tape.data;
  const candles = data?.candles ?? [];

  return (
    <section id="tape" className="rounded-2xl border border-border/40 px-5 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        AURA/USDC
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        {de ? "Öffentliches Tape" : "Public tape"}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {de
          ? `Offizieller T-0-Seed ${AURA_DEV_BUY_USDC.toLocaleString("de-AT")} $ USDC → Launch-Treasury / Buch. Kein ETHUSDT als AURA.`
          : `Official T-0 seed $${AURA_DEV_BUY_USDC.toLocaleString("en-US")} USDC → launch treasury / book. We will not draw ETHUSDT as AURA.`}
      </p>
      {candles.length >= 2 ? (
        <div className="mt-4 overflow-x-auto">
          <MarketCandles
            candles={candles}
            loading={tape.isLoading}
            interval={interval}
            onIntervalChange={setInterval}
          />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border/50 px-4 py-8 text-center text-[13px] text-muted-foreground">
          {data?.reason ??
            (de
              ? "Tape erscheint, wenn der AURA/USDC-Pool live ist. pAURA ist ein Beleg, kein Chart."
              : "Tape publishes when the AURA/USDC pool is live. pAURA is a receipt, not a chart.")}
        </div>
      )}
      <p className="mt-3 text-[12px]">
        <Link to="/square" className="font-semibold text-primary hover:underline">
          {de ? "Aura Square — Token binden →" : "Aura Square — bind tokens →"}
        </Link>
        <span className="text-muted-foreground">
          {de ? " · kein Hood, kein pAURA" : " · not Hood, not pAURA"}
        </span>
      </p>
    </section>
  );
}
