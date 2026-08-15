import { createFileRoute, Link } from "@tanstack/react-router";

import { FoundingSeatCard, PricingTable, StackLayers } from "@/components/aura/economics";
import { MarketingPage } from "@/components/aura/marketing-page";
import { useLocale } from "@/hooks/use-locale";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Pricing — founding seat $99 + Aura OS subscriptions",
      description:
        "Founding seat is $99 one-time. Subscriptions start at €49 / month. AURA is an optional ecosystem layer — not required to run the company.",
      path: "/pricing",
    }),
  component: PricingPage,
});

function PricingPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <MarketingPage shareText="Aura OS pricing — $99 founding seat, subscriptions separate.">
      <section className="mx-auto max-w-6xl px-6 pt-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          {de ? "Preise" : "Pricing"}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.98] tracking-tight">
          {de ? "Was kostet meine KI-Firma?" : "How much does my AI company cost?"}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] text-muted-foreground">
          {de
            ? "Drei Schichten, klar getrennt: Seat einmal, Abo laufend, Token optional."
            : "Three layers, kept obvious: seat once, subscription ongoing, token optional."}
        </p>
      </section>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <FoundingSeatCard />
      </div>
      <PricingTable />
      <StackLayers />
      <p className="mx-auto max-w-6xl px-6 pb-20 text-[13px] text-muted-foreground">
        {de ? "Checkout bleibt auf" : "Checkout stays on"}{" "}
        <Link to="/access" className="font-semibold text-primary">
          /access
        </Link>
        .
      </p>
    </MarketingPage>
  );
}
