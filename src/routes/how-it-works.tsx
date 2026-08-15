import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { MarketingPage } from "@/components/aura/marketing-page";
import { ProductJourney } from "@/components/aura/product-journey";
import { OsPreview } from "@/components/aura/os-preview";
import { MissionCase } from "@/components/aura/why-aura";
import { useLocale } from "@/hooks/use-locale";
import { HOW_IT_WORKS_LONG, loc } from "@/lib/product-story";
import { pageHead } from "@/lib/seo";
import { trackTeaser } from "@/lib/teaser-track";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      title: "How Aura OS works — describe, mission, approve, proof",
      description:
        "The complete AI company lifecycle: you define the company, Aura builds the workforce, you give missions, approve spend, and proof is filed.",
      path: "/how-it-works",
    }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <MarketingPage shareText="How Aura OS works — own an AI company.">
      <ProductJourney />
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-10">
        <h2 className="font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
          {de ? "Der ganze Lebenszyklus" : "The complete company lifecycle"}
        </h2>
        <ol className="mt-8 space-y-3">
          {HOW_IT_WORKS_LONG.map((s) => (
            <li
              key={s.n}
              className="grid gap-2 rounded-[1.6rem] border border-border/40 px-5 py-4 sm:grid-cols-[4rem_1fr]"
            >
              <p className="font-display text-2xl text-gold">{s.n}</p>
              <div>
                <p className="font-semibold">{loc(locale, s.title)}</p>
                <p className="mt-1 text-[14px] text-muted-foreground">{loc(locale, s.body)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <OsPreview />
      <MissionCase />
      <section className="mx-auto flex max-w-6xl flex-wrap gap-3 px-6 pb-20">
        <Link
          to="/try"
          onClick={() => trackTeaser("cta_click", { placement: "how_try" })}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Try Aura <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/access"
          className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
        >
          {de ? "Seat — $99" : "Founding seat — $99"}
        </Link>
      </section>
    </MarketingPage>
  );
}
