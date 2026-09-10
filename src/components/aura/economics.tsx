import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import { useLocale } from "@/hooks/use-locale";
import { ECONOMICS_LAYERS, SEAT_BENEFITS, SEAT_NOT_INCLUDED, loc } from "@/lib/product-story";
import { OS_PRICE, osCopy } from "@/lib/os-pricing";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

const LADDER = ["try", "month", "year", "local"] as const;

export function FoundingSeatCard({ className }: { className?: string }) {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <article className={cn("glass rounded-[1.8rem] p-6 sm:p-8", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        {de ? "Aura OS" : "Aura OS"}
      </p>
      <h3 className="mt-2 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">
        {de ? "299 $ / Jahr" : "$299 / year"}
        <span className="block text-[1.1rem] font-normal text-muted-foreground">
          {de ? "oder 29 $ / Monat — du wählst." : "or $29 / month — you choose."}
        </span>
      </h3>
      <p className="mt-3 text-[14px] font-semibold">{de ? "Im Jahr-Preis:" : "In the year:"}</p>
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
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/access"
          search={{ plan: "year" }}
          onClick={() => trackTeaser("cta_click", { placement: "seat_card_year" })}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          {de ? "Jahr starten — 299 $" : "Start the year — $299"} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/access"
          search={{ plan: "month" }}
          onClick={() => trackTeaser("cta_click", { placement: "seat_card_month" })}
          className="inline-flex items-center gap-2 rounded-2xl border border-border/60 px-5 py-3 text-sm font-semibold"
        >
          {de ? "Monatlich — 29 $" : "Monthly — $29"}
        </Link>
      </div>
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
          ? "Gratis testen. Monatlich. Oder ein Jahr — fair."
          : "Try free. Go monthly. Or take the year — fair."}
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {LADDER.map((id) => {
          const plan = OS_PRICE[id];
          const copy = osCopy(locale, id);
          const rec = "recommended" in plan && plan.recommended;
          return (
            <article
              key={id}
              className={cn(
                "rounded-[1.6rem] border px-5 py-6",
                rec ? "border-gold/45 bg-gold/8" : "border-border/50 bg-foreground/[0.02]",
              )}
            >
              {rec ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
                  {de ? "Empfohlen" : "Best value"}
                </p>
              ) : (
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {copy.name}
                </p>
              )}
              <p className="mt-2 font-display text-3xl tracking-tight">
                {copy.price}
                <span className="text-[1rem] font-normal text-muted-foreground">{copy.period}</span>
              </p>
              {rec ? <p className="mt-1 text-[13px] font-semibold">{copy.name}</p> : null}
              {"note" in copy && copy.note ? (
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  {copy.note}
                </p>
              ) : (
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  {id === "try"
                    ? de
                      ? "Desk, Quest, Pit — ohne Karte."
                      : "Desk, Quest, Pit — no card."
                    : id === "month"
                      ? de
                        ? "Jederzeit kündbar. Gleiches OS wie das Jahr."
                        : "Cancel anytime. Same OS as the year."
                      : de
                        ? "Für Wiener Betriebe. Review-Boost extra."
                        : "For Wien shops. Review boost extra."}
                </p>
              )}
              <Link
                to={plan.href.startsWith("/access") ? "/access" : plan.href}
                search={
                  id === "year" ? { plan: "year" } : id === "month" ? { plan: "month" } : undefined
                }
                onClick={() => trackTeaser("cta_click", { placement: `price_card_${id}` })}
                className={cn(
                  "mt-5 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold",
                  rec
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/60 text-foreground",
                )}
              >
                {copy.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          );
        })}
      </div>
      <p className="mt-6 max-w-2xl text-[13px] text-muted-foreground">
        {de
          ? "Hood-NFT bleibt ein optionales 299 $-Mint für den Founding-Kreis — nicht nötig, um das OS zu fahren. Extra Compute nur, wenn du mehr fährst."
          : "The Hood NFT stays an optional $299 mint for the founding circle — not required to run the OS. Extra compute only if you run hotter."}
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
