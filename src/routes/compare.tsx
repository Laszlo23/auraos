import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { MarketingPage } from "@/components/aura/marketing-page";
import { ChatbotVsCompany, CompareTable, WhoItsFor } from "@/components/aura/why-aura";
import { useLocale } from "@/hooks/use-locale";
import { CATEGORY_LINE, loc } from "@/lib/product-story";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/compare")({
  head: () =>
    pageHead({
      title: "Why Aura — chatbot vs AI company",
      description:
        "ChatGPT answers. Aura is a company: CEO plans, employees execute, memory compounds, and you approve money and publishing.",
      path: "/compare",
    }),
  component: ComparePage,
});

function ComparePage() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <MarketingPage shareText="Why Aura — don't hire AI tools. Own an AI company.">
      <section className="mx-auto max-w-6xl px-6 pt-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          {de ? "Warum Aura?" : "Why Aura?"}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.98] tracking-tight">
          {loc(locale, CATEGORY_LINE)}
        </h1>
      </section>
      <ChatbotVsCompany />
      <CompareTable />
      <WhoItsFor />
      <section className="mx-auto flex max-w-6xl flex-wrap gap-3 px-6 pb-20">
        <Link
          to="/try"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Try Aura <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/how-it-works" className="text-[13px] font-semibold text-primary">
          {de ? "So arbeitet die Firma →" : "See how the company works →"}
        </Link>
      </section>
    </MarketingPage>
  );
}
