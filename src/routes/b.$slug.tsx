import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { ShopProfile } from "@/components/aura/shop-profile";
import { Chip } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { shopMediaUrl } from "@/lib/lokal-shops";
import { getPublicLocalBusiness, type PublicLocalBusiness } from "@/lib/reviews.public.functions";
import { absoluteAsset } from "@/lib/seo";
import { OG_IMAGE, SITE_NAME, SITE_URL, url } from "@/lib/site";

function shopShareImage(shop?: PublicLocalBusiness | null): string {
  const raw = shopMediaUrl(shop?.cover_url) || shop?.cover_url || "";
  if (!raw) return OG_IMAGE;
  return absoluteAsset(raw);
}

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
      ? `${shop.name} ${shop.niche ? `· ${shop.niche}` : ""} · ${shop.postal_code} ${shop.city || "Wien"}`
      : `${params.slug} — Aura`;
    const description =
      shop?.story?.slice(0, 155) ||
      shop?.tagline ||
      `${shop?.name} in ${shop?.city || "Wien"}${shop?.niche ? ` · ${shop?.niche}` : ""}. ${shop?.street || ""}${shop?.phone ? ` · Tel: ${shop.phone}` : ""}. Echte Bewertungen auf Aura.`;
    const path = `/b/${shop?.slug ?? params.slug}`;
    const image = shopShareImage(shop);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "keywords",
          content:
            `${shop?.name || ""}, ${shop?.niche || ""}, ${shop?.city || "Wien"}, ${shop?.district || ""}, lokales Geschäft, Nachbarschaft, Bewertungen`.trim(),
        },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "business.business" },
        { property: "og:url", content: url(path) },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:locale", content: "de_AT" },
        { property: "business:contact_data:street_address", content: shop?.street || "" },
        { property: "business:contact_data:locality", content: shop?.city || "Wien" },
        { property: "business:contact_data:postal_code", content: shop?.postal_code || "" },
        { property: "business:contact_data:country_name", content: "Austria" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
        { name: "geo.placename", content: `${shop?.city || "Wien"}, Austria` },
        { name: "geo.region", content: "AT-9" },
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
        addressLocality: shop.city || "Wien",
        addressRegion: shop.district || undefined,
        addressCountry: "AT",
      }
    : undefined;

  const aggregateRating =
    shop.nachbar_rating_count > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: shop.nachbar_rating_avg || 4.5,
          ratingCount: shop.nachbar_rating_count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: shop.name,
    description: shop.tagline || shop.story || `${shop.name} in ${shop.city || "Wien"}`,
    url: shop.homepage_url || `${SITE_URL}/b/${shop.slug}`,
    image: shopShareImage(shop),
    telephone: shop.phone || undefined,
    email: shop.public_email || undefined,
    address,
    priceRange: shop.niche === "Restaurant" || shop.niche === "Heuriger" ? "€€-€€€" : undefined,
    openingHours: shop.hours_note || undefined,
    aggregateRating,
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
