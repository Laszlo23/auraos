import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { ShopProfile } from "@/components/aura/shop-profile";
import { Chip } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { getPublicLocalBusiness, type PublicLocalBusiness } from "@/lib/reviews.public.functions";
import { OG_IMAGE, SITE_NAME, SITE_URL, url } from "@/lib/site";

export const Route = createFileRoute("/b/$slug")({
  loader: async ({ params }) => {
    const { withTimeout } = await import("@/lib/timeout-helper");
    const data = await withTimeout(
      getPublicLocalBusiness({ data: { slug: params.slug } }),
      5000,
      null,
    );
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const shop = loaderData;
    const title = shop
      ? [shop.name, shop.postal_code, shop.city].filter(Boolean).join(" — ")
      : `${params.slug} — Aura`;
    const description =
      shop?.tagline ||
      shop?.story ||
      [shop?.name, shop?.niche, shop?.city].filter(Boolean).join(" · ") ||
      "Lokaler Betrieb auf Aura.";
    const path = `/b/${shop?.slug ?? params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url(path) },
        { property: "og:image", content: shop?.cover_url || OG_IMAGE },
        { property: "og:locale", content: "de_AT" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url(path) }],
    };
  },
  component: LocalBusinessPage,
});

function localBusinessJsonLd(shop: PublicLocalBusiness) {
  const address = shop.street
    ? {
        "@type": "PostalAddress",
        streetAddress: shop.street,
        postalCode: shop.postal_code || undefined,
        addressLocality: shop.city || undefined,
        addressCountry: "AT",
      }
    : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: shop.name,
    description: shop.tagline || shop.story || undefined,
    url: shop.homepage_url || `${SITE_URL}/b/${shop.slug}`,
    image: shop.cover_url || undefined,
    telephone: shop.phone || undefined,
    email: shop.public_email || undefined,
    address,
    sameAs: [shop.homepage_url, shop.google_review_url].filter(Boolean),
  };
}

function LocalBusinessPage() {
  const data = Route.useLoaderData();

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd(data)) }}
      />
      <div className="austria-bar" aria-hidden />
      <header className="absolute inset-x-0 top-[3px] z-20">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 lg:px-8">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70"
          >
            {SITE_NAME}
          </Link>
          <Link
            to="/wien"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold"
          >
            ← Wien
          </Link>
          <Chip className="ml-auto border-white/20 bg-white/10 text-white">Lokal</Chip>
        </div>
      </header>
      <ShopProfile shop={data} />
      <SiteFooter />
    </main>
  );
}
