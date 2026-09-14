import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  AURA_CURVE_COPY,
  AURA_OFFICIAL_PAIRS,
  AURA_REWARD_SPLIT_BPS,
  AURA_SWAP_BURN_BPS,
  auraGaugeAddress,
  auraTrailingFeeApr7d,
  formatBps,
} from "@/lib/aura-curve";
import {
  auraGetOfficialCa,
  BASE_WETH,
  officialAuraUniswapUrl,
  type AuraUniswapInput,
} from "@/lib/aura-fairlaunch";
import { getAuraSwapDesk, quoteAuraSwap } from "@/lib/aura-swap.functions";
import { AURA_SWAP_ASSETS, type AuraSwapAsset } from "@/lib/aura-swap.server";
import { BASE_USDC } from "@/lib/private-sale";
import { visibleRefetchInterval } from "@/hooks/use-aura";

function settleInputFor(from: AuraSwapAsset): AuraUniswapInput | null {
  switch (from) {
    case "ETH":
      return "ETH";
    case "WETH":
      return "WETH";
    case "USDC":
      return "USDC";
    case "AURA":
      return null;
    default: {
      const _exhaustive: never = from;
      return _exhaustive;
    }
  }
}

function uniswapOutputCurrency(asset: AuraUniswapInput): string {
  switch (asset) {
    case "ETH":
      return "ETH";
    case "WETH":
      return BASE_WETH;
    case "USDC":
      return BASE_USDC;
    default: {
      const _exhaustive: never = asset;
      return _exhaustive;
    }
  }
}

export function AuraSwapDesk({ de = false }: { de?: boolean }) {
  const [from, setFrom] = useState<AuraSwapAsset>("ETH");
  const [to, setTo] = useState<AuraSwapAsset>("AURA");
  const [amount, setAmount] = useState("0.02");
  const [stakeAmount, setStakeAmount] = useState("");
  const [burnSeen, setBurnSeen] = useState(false);

  const desk = useQuery({
    queryKey: ["aura-swap-desk"],
    queryFn: () => getAuraSwapDesk(),
    refetchInterval: visibleRefetchInterval(60_000),
  });

  const quoteQ = useQuery({
    queryKey: ["aura-swap-quote", from, to, amount],
    queryFn: () => quoteAuraSwap({ data: { from, to, amount } }),
    refetchInterval: visibleRefetchInterval(20_000),
  });

  const quote = quoteQ.data;
  const gauge = auraGaugeAddress();
  const apr = auraTrailingFeeApr7d();
  const pairs = desk.data?.pairs ?? AURA_OFFICIAL_PAIRS.map((p) => ({
    id: p.id,
    label: p.label,
    officialBook: p.officialBook,
    phase: p.phase,
    live: false,
  }));

  const flip = () => {
    setFrom(to);
    setTo(from);
  };

  const settleReady = Boolean(quote?.live);
  const settleHref = useMemo(() => {
    const ca = auraGetOfficialCa();
    if (!ca || !settleReady) return null;
    // Buying AURA: deep-link Uniswap with the pay asset as input.
    if (to === "AURA") {
      const input = settleInputFor(from);
      return input ? officialAuraUniswapUrl(ca, input) : null;
    }
    // Selling AURA: Uniswap with AURA as input (output is the other side).
    if (from === "AURA") {
      const out = settleInputFor(to);
      if (!out) return null;
      const params = new URLSearchParams({
        chain: "base",
        inputCurrency: ca,
        outputCurrency: uniswapOutputCurrency(out),
      });
      return `https://app.uniswap.org/swap?${params.toString()}`;
    }
    return null;
  }, [from, to, settleReady]);
  const burnHint = useMemo(
    () =>
      de
        ? `${formatBps(AURA_SWAP_BURN_BPS)} der AURA-Seite wird gesenkt — klein, damit das Buch funktioniert. Kein „deflationary moon“.`
        : `${formatBps(AURA_SWAP_BURN_BPS)} of the AURA side is burned — small so the book still works. Not “deflationary moon.”`,
    [de],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/40 bg-foreground/[0.02] px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {de ? "Swap-Desk" : "Swap desk"}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          {de ? "Was du gibst. Was du nimmst." : "What you put in. What you take out."}
        </h2>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          {de
            ? "Nur offizielle Paare. Quote ohne Wallet. Settlement auf Base. Kein DEX."
            : "Official pairs only. Quote without a wallet. Settle on Base. Not a DEX."}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {de ? "Du gibst" : "You put in"}
            </span>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value as AuraSwapAsset)}
              className="mt-1 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-[14px]"
            >
              {AURA_SWAP_ASSETS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={flip}
            className="self-end rounded-xl border border-border/50 px-3 py-2 text-[13px] font-semibold hover:border-primary/40"
          >
            ↔
          </button>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {de ? "Du nimmst" : "You take out"}
            </span>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as AuraSwapAsset)}
              className="mt-1 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-[14px]"
            >
              {AURA_SWAP_ASSETS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {de ? "Betrag" : "Amount"}
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-[14px]"
          />
        </label>

        <div className="mt-4 rounded-xl border border-border/40 px-4 py-3 text-[13px] leading-relaxed">
          {quoteQ.isLoading ? (
            <p className="text-muted-foreground">{de ? "Quote…" : "Quoting…"}</p>
          ) : quote ? (
            <>
              <p className="font-semibold">
                {quote.pairLabel ?? (de ? "Kein offizielles Paar" : "No official pair")}
                {quote.live ? (
                  <span className="ml-2 text-[11px] uppercase tracking-[0.12em] text-primary">
                    live
                  </span>
                ) : (
                  <span className="ml-2 text-[11px] uppercase tracking-[0.12em] text-amber-600">
                    {de ? "noch nicht live" : "not live"}
                  </span>
                )}
              </p>
              <p className="mt-1 text-muted-foreground">
                {quote.amountOut
                  ? `${quote.amountIn} ${quote.from} → ${quote.amountOut} ${quote.to}`
                  : `${quote.amountIn} ${quote.from} → ${quote.to}`}
              </p>
              {quote.reason ? <p className="mt-2 text-muted-foreground">{quote.reason}</p> : null}
              <p className="mt-2 text-[12px] text-muted-foreground">{quote.feeNote}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{burnHint}</p>
            </>
          ) : null}
        </div>

        {settleHref ? (
          <a
            href={settleHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground"
          >
            {de ? "Auf Uniswap settlen (Base)" : "Settle on Uniswap (Base)"}
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {settleReady
              ? de
                ? "Route öffnet Uniswap"
                : "Open Uniswap to settle"
              : de
                ? "Settlement nach T-0"
                : "Settle after T-0"}
          </button>
        )}
        <p className="mt-2 text-[12px] text-muted-foreground">
          {de
            ? "Farcaster- / Base-App-Wallets: mit ETH kaufen. USDC geht auch. Settlement läuft auf Uniswap — nicht in dieser Seite."
            : "Farcaster / Base App wallets: buy with ETH. USDC works too. Settlement is on Uniswap — not inside this page."}{" "}
          {de ? AURA_CURVE_COPY.softwareNotEquityDe : AURA_CURVE_COPY.softwareNotEquity}
        </p>
      </section>

      <section id="lp" className="rounded-2xl border border-border/40 px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          AuraGauge
        </p>
        <h3 className="mt-2 text-[17px] font-semibold">
          {de ? "Staken. Fees claimen. Kein APY-Versprechen." : "Stake. Claim fees. No promised APY."}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {de ? AURA_CURVE_COPY.noApyDe : AURA_CURVE_COPY.noApy}{" "}
          {de ? "LP-Staker" : "LP stakers"} {formatBps(AURA_REWARD_SPLIT_BPS.lpStakers)}.
        </p>
        <div className="mt-4 rounded-xl border border-border/40 bg-foreground/[0.02] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {de ? "Fee-APR · nachlaufend 7 Tage · Schätzung" : "Fee APR · trailing 7d · estimate"}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {apr === null ? (de ? "—" : "—") : `${apr.toFixed(2)}%`}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {de
              ? "Kein festes APY. Zahl erscheint, wenn das Buch eine echte 7-Tage-Woche hat."
              : "Not a fixed APY. Number appears after the book has a real 7-day window."}
          </p>
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {de ? "AURA staken" : "Stake AURA"}
          </span>
          <input
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="mt-1 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-[14px]"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!gauge}
            className="rounded-xl border border-border/50 px-4 py-2 text-[13px] font-semibold disabled:opacity-40"
          >
            {de ? "Staken" : "Stake"}
          </button>
          <button
            type="button"
            disabled={!gauge}
            className="rounded-xl border border-border/50 px-4 py-2 text-[13px] font-semibold disabled:opacity-40"
          >
            {de ? "Claim" : "Claim"}
          </button>
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {gauge ?? (de ? "Gauge-CA nach T-0" : "Gauge CA after T-0")}
        </p>
      </section>

      <section className="rounded-2xl border border-border/40 px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {de ? "Paare" : "Pairs"}
        </p>
        <ul className="mt-3 space-y-2">
          {pairs.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border/30 px-3 py-2 text-[13px]"
            >
              <span className="font-semibold">
                {p.label}
                {p.officialBook ? (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {de ? "offizielles Buch" : "official book"}
                  </span>
                ) : (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {de ? "Phase 3" : "phase 3"}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {p.live ? "live" : de ? "unveröffentlicht" : "unpublished"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section id="quests" className="rounded-2xl border border-border/40 px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Quest
        </p>
        <h3 className="mt-2 text-[17px] font-semibold">
          {de ? "Leichte Gamification. Kein Game-Token." : "Light gamification. No game token."}
        </h3>
        <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">aura:first-swap</span> —{" "}
            {de ? "erster Swap auf diesem Desk nach T-0." : "first swap on this desk after T-0."}
          </li>
          <li>
            <span className="font-semibold text-foreground">aura:lp-week</span> —{" "}
            {de
              ? "≥ USDC-Äquivalent LP für 7 Tage. XP + Staub aus dem 10%-Bonus-Topf."
              : "≥ USDC-equivalent LP for 7 days. XP + dust from the 10% bonus bucket."}
          </li>
          <li>
            <span className="font-semibold text-foreground">aura:burn-seen</span> —{" "}
            {de ? "Burn-bps gelesen (Bildung, kein Pay-to-win)." : "read the burn bps (education, not pay-to-win)."}
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setBurnSeen(true)}
          className="mt-4 rounded-xl border border-border/50 px-4 py-2 text-[13px] font-semibold hover:border-primary/40"
        >
          {burnSeen
            ? de
              ? "Burn-Regel gelesen"
              : "Burn rule seen"
            : de
              ? "Burn-bps ansehen"
              : "See burn bps"}
        </button>
        {burnSeen ? (
          <p className="mt-2 text-[12px] text-muted-foreground">
            {burnHint}{" "}
            <Link to="/quest" className="font-semibold text-primary hover:underline">
              /quest
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}
