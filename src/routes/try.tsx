import { createFileRoute } from "@tanstack/react-router";

import { MarketingPage } from "@/components/aura/marketing-page";
import { TryAura } from "@/components/aura/try-aura";
import { FoundingSeatCard } from "@/components/aura/economics";
import { OsPreview } from "@/components/aura/os-preview";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/try")({
  head: () =>
    pageHead({
      title: "Try Aura — see the company before the $99 seat",
      description:
        "Describe your business. Aura shows a simulated company, workforce, and first mission plan. Then wake it with a $99 founding seat.",
      path: "/try",
    }),
  component: TryPage,
});

function TryPage() {
  return (
    <MarketingPage shareText="Try Aura — see the AI company before you buy the seat.">
      <TryAura standalone />
      <OsPreview />
      <div className="mx-auto max-w-6xl px-6 pb-20">
        <FoundingSeatCard />
      </div>
    </MarketingPage>
  );
}
