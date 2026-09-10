import { createFileRoute, Link } from "@tanstack/react-router";

import { FoundingSeatCard, PricingTable, StackLayers } from "@/components/aura/economics";
import { MarketingLayout } from "@/components/aura/marketing-layout";
import { useLocale } from "@/hooks/use-locale";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Pricing — $29 / month or $299 / year",
      description:
        "Try Aura free. Run Aura OS at $29 / month or $299 / year. Wien shops: Aura Local €49 / month. Hood NFT mint is a separate optional $299.",
      path: "/pricing",
    }),
  component: PricingPage,
});

function PricingPage() {
  const { locale, t } = useLocale();
  const de = locale === "de";
  return (
    <MarketingLayout
      cta={{ to: "/access", label: t("landing.navStart") }}
      showSignIn={false}
      shareText="Aura OS — try free, $29 / month, or $299 / year. Fair software."
    >
      <section className="mx-auto max-w-6xl px-6 pt-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          {de ? "Preise" : "Pricing"}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.98] tracking-tight">
          {de ? "Was kostet meine KI-Firma?" : "How much does my AI company cost?"}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] text-muted-foreground">
          {de
            ? "Eine klare Leiter: gratis testen, 29 $ / Monat, oder 299 $ / Jahr. Local extra für Wiener Betriebe. Token optional."
            : "One clear ladder: try free, $29 / month, or $299 / year. Local for Wien shops. Token optional."}
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
    </MarketingLayout>
  );
}
