import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { useLocale } from "@/hooks/use-locale";
import {
  CATEGORY_FLOW,
  CATEGORY_LINE,
  JOURNEY_STEPS,
  WALKTHROUGH_NOTE,
  loc,
} from "@/lib/product-story";
import { trackTeaser } from "@/lib/teaser-track";

export function ProductJourney({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocale();
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
        {locale === "de" ? "Die Kategorie" : "The category"}
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3.2rem)] leading-[1.05] tracking-tight">
        {loc(locale, CATEGORY_LINE)}
      </h2>
      <p className="mt-3 font-mono text-[12px] tracking-tight text-gold sm:text-[13px]">
        {loc(locale, CATEGORY_FLOW)}
      </p>
      <p className="mt-3 max-w-xl text-[13px] text-muted-foreground">
        {loc(locale, WALKTHROUGH_NOTE)}
      </p>

      <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {JOURNEY_STEPS.map((s) => (
          <li key={s.n} className="glass rounded-3xl p-4">
            <p className="font-display text-2xl text-gold">{s.n}</p>
            <p className="mt-2 text-[13px] font-semibold">{loc(locale, s.title)}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              {loc(locale, s.body)}
            </p>
          </li>
        ))}
      </ol>

      {!compact ? null : (
        <Link
          to="/how-it-works"
          onClick={() => trackTeaser("cta_click", { placement: "home_journey_more" })}
          className="mt-8 inline-flex items-center gap-2 text-[13px] font-semibold text-primary"
        >
          {locale === "de" ? "Ganzen Lebenszyklus sehen" : "See the complete company lifecycle"}{" "}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}
