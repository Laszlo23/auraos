import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import { useLocale } from "@/hooks/use-locale";
import {
  ECONOMICS_LAYERS,
  PRICING_TIERS,
  SEAT_BENEFITS,
  SEAT_NOT_INCLUDED,
  loc,
} from "@/lib/product-story";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

export function FoundingSeatCard({ className }: { className?: string }) {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <article className={cn("glass rounded-[1.8rem] p-6 sm:p-8", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        {de ? "Founding Seat" : "Founding seat"}
      </p>
      <h3 className="mt-2 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">
        $99{" "}
        <span className="text-[1.1rem] text-muted-foreground">{de ? "einmalig" : "one time"}</span>
      </h3>
      <p className="mt-3 text-[14px] font-semibold">{de ? "Du bekommst:" : "You get:"}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {SEAT_BENEFITS.map((b) => (
          <li key={b.en} className="flex items-start gap-2 text-[13px]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {loc(locale, b)}
          </li>
        ))}
      </ul>
      <p className="mt-5 rounded-2xl border border-gold/30 bg-gold/8 px-4 py-3 text-[13px] leading-relaxed">
        {loc(locale, SEAT_NOT_INCLUDED)}
      </p>
      <Link
        to="/access"
        onClick={() => trackTeaser("cta_click", { placement: "seat_card_buy" })}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        {de ? "Seat kaufen — $99" : "Buy founding seat — $99"} <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function PricingTable() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        {de ? "Was kostet die KI-Firma?" : "How much does my AI company cost?"}
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
        {de
          ? "Seat einmal. Abo laufend. Token optional."
          : "Seat once. Subscription ongoing. Token optional."}
      </h2>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border/40 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <th className="py-3 pr-4 font-medium" />
              {PRICING_TIERS.map((t) => (
                <th key={t.id} className="py-3 pr-4 font-semibold text-foreground">
                  {t.name}
                  {"recommended" in t && t.recommended ? (
                    <span className="ml-2 text-[10px] text-gold">
                      {de ? "empfohlen" : "recommended"}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/30">
              <td className="py-3 pr-4 text-muted-foreground">{de ? "Monatlich" : "Monthly"}</td>
              {PRICING_TIERS.map((t) => (
                <td key={t.id} className="py-3 pr-4 font-semibold">
                  {t.price}
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/30">
              <td className="py-3 pr-4 text-muted-foreground">
                {de ? "KI-Belegschaft" : "AI workforce"}
              </td>
              {PRICING_TIERS.map((t) => (
                <td key={t.id} className="py-3 pr-4">
                  {loc(locale, t.workforce)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/30">
              <td className="py-3 pr-4 text-muted-foreground">
                {de ? "Automation" : "Automation"}
              </td>
              {PRICING_TIERS.map((t) => (
                <td key={t.id} className="py-3 pr-4">
                  {loc(locale, t.automation)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 pr-4 text-muted-foreground">
                {de ? "Am besten für" : "Best for"}
              </td>
              {PRICING_TIERS.map((t) => (
                <td key={t.id} className="py-3 pr-4">
                  {loc(locale, t.bestFor)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-2xl text-[13px] text-muted-foreground">
        {de
          ? "Founding Seat = 99 $ einmalig. Abo = laufend. AURA = Ökosystem-Schicht, nicht nötig zum Betrieb."
          : "Founding seat = $99 one-time. Subscription = ongoing. AURA = ecosystem layer, not required to operate."}
      </p>
    </section>
  );
}

export function StackLayers() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        {de ? "Reihenfolge" : "The stack"}
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
        {de ? "Produkt zuerst. Token zuletzt." : "Product first. Token last."}
      </h2>
      <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ECONOMICS_LAYERS.map((l) => (
          <li key={l.level} className="glass rounded-3xl p-5">
            <p className="font-display text-2xl text-gold">{l.level}</p>
            <p className="mt-2 font-semibold">{loc(locale, l.title)}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{loc(locale, l.body)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
