import { createFileRoute, Navigate } from "@tanstack/react-router";

import { pageHead } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const TITLE = "Get AURA — smart wallet or your wallet";
const DESCRIPTION =
  "Two ways to buy AURA on the official Base book: a free Aura smart wallet plus card, or the wallet you already have. Official CA only on this site. Never by DM.";

export const Route = createFileRoute("/buy")({
  validateSearch: (search: Record<string, unknown>): { checkout?: "success" | "cancel" } => ({
    ...(search["checkout"] === "success" || search["checkout"] === "cancel"
      ? { checkout: search["checkout"] as "success" | "cancel" }
      : {}),
  }),
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/get",
      jsonLd: {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/get`,
      },
    }),
  component: BuyRedirect,
});

function BuyRedirect() {
  const search = Route.useSearch();
  return <Navigate to="/get" search={search} replace />;
}
