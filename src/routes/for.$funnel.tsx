import { createFileRoute, notFound } from "@tanstack/react-router";

import { FunnelLanding } from "@/components/aura/funnel-landing";
import { funnelFromSlug, isPublicFunnelSlug } from "@/lib/funnels";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/for/$funnel")({
  beforeLoad: ({ params }) => {
    const slug = String(params.funnel || "").toLowerCase();
    if (!isPublicFunnelSlug(slug)) throw notFound();
  },
  head: ({ params }) => {
    const slug = String(params.funnel || "").toLowerCase();
    const def = funnelFromSlug(slug);
    if (!def) return {};
    const title = `${def.headline} — Aura`;
    return {
      meta: [
        { title },
        { name: "description", content: def.subhead },
        { property: "og:title", content: title },
        { property: "og:description", content: def.subhead },
        { property: "og:url", content: `${SITE_URL}/for/${def.slug}` },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/for/${def.slug}` }],
    };
  },
  component: FunnelPage,
});

function FunnelPage() {
  const { funnel: raw } = Route.useParams();
  const slug = String(raw || "").toLowerCase();
  const def = funnelFromSlug(slug);
  if (!def) throw notFound();
  return <FunnelLanding funnel={def} />;
}
