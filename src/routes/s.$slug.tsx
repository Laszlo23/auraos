import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { LandingSiteView } from "@/components/aura/landing-site-view";
import { Shimmer } from "@/components/aura/primitives";
import { getPublicSite } from "@/lib/sites.public.functions";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/s/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({
    preview: search["preview"] === true || search["preview"] === "1" || search["preview"] === "true",
    checkout:
      search["checkout"] === "success" || search["checkout"] === "cancel"
        ? (search["checkout"] as "success" | "cancel")
        : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Aura OS` },
      { name: "description", content: "Company landing page on Aura OS." },
      { property: "og:title", content: `${params.slug} — Aura OS` },
      { property: "og:url", content: `${SITE_URL}/s/${params.slug}` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/s/${params.slug}` }],
  }),
  component: PublicSitePage,
});

function PublicSitePage() {
  const { slug } = Route.useParams();
  const { preview, checkout } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["public-site", slug, preview],
    queryFn: () => getPublicSite({ data: { slug, preview } }),
  });

  useEffect(() => {
    if (checkout === "success") toast.success("You're subscribed — check your email soon.");
    if (checkout === "cancel") toast.message("Checkout canceled");
  }, [checkout]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-10">
        <Shimmer className="h-40" />
        <Shimmer className="h-24" />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-lg p-12 text-center">
        <h1 className="font-display text-2xl font-semibold">Site not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This landing is not published yet, or the slug is wrong.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary">
          Back to Aura OS
        </Link>
      </main>
    );
  }

  return (
    <LandingSiteView
      slug={data.slug}
      templateId={data.template_id}
      content={data.content}
      product={data.product}
      interactive={!data.preview}
      preview={data.preview}
      networkPeers={data.networkPeers}
      showNetworkStrip={data.showNetworkStrip}
    />
  );
}
