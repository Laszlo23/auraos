import { createFileRoute } from "@tanstack/react-router";

import { MarketingLayout } from "@/components/aura/marketing-layout";
import { TryAura } from "@/components/aura/try-aura";
import { FoundingSeatCard } from "@/components/aura/economics";
import { useLocale } from "@/hooks/use-locale";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/try")({
  head: () =>
    pageHead({
      title: "Try Aura — see the company before you pay",
      description:
        "Describe your business. Aura shows a simulated company, workforce, and first mission plan. Then start at $29 / month or take the year at $299.",
      path: "/try",
    }),
  component: TryPage,
});

function TryPage() {
  const { t } = useLocale();
  return (
    <MarketingLayout
      cta={{ to: "/access", label: t("landing.navStart") }}
      showSignIn={false}
      shareText="Try Aura — see the AI company before you buy the seat."
    >
      <TryAura standalone />
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <FoundingSeatCard />
      </div>
    </MarketingLayout>
  );
}
