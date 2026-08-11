/**
 * Shared SEO helpers for TanStack Router `head()` — keep titles, OG, Twitter,
 * and JSON-LD consistent across public surfaces.
 */

import { OG_IMAGE, SITE_NAME, SITE_URL, SOCIAL_LINKS, url } from "@/lib/site";

export type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  /** Absolute or site-relative image. Defaults to OG_IMAGE. */
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: "website" | "article" | "video.other";
  noIndex?: boolean;
  /** Extra meta tags merged after defaults. */
  extraMeta?: Array<Record<string, string>>;
  /** Extra JSON-LD nodes (FAQPage, VideoObject, etc.). */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function absoluteAsset(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return url(src.startsWith("/") ? src : `/${src}`);
}

/** Build TanStack `head()` meta + links (+ optional JSON-LD scripts). */
export function pageHead(input: PageSeoInput) {
  const canonical = url(input.path);
  const image = absoluteAsset(input.image ?? OG_IMAGE);
  const imageAlt =
    input.imageAlt ??
    `${SITE_NAME} — AI company operating system open-graph preview`;
  const w = String(input.imageWidth ?? 1200);
  const h = String(input.imageHeight ?? 630);
  const robots = input.noIndex
    ? "noindex,nofollow"
    : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

  const meta: Array<Record<string, string>> = [
    { title: input.title },
    { name: "description", content: input.description },
    { name: "robots", content: robots },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: canonical },
    { property: "og:image", content: image },
    { property: "og:image:width", content: w },
    { property: "og:image:height", content: h },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: imageAlt },
    ...(input.extraMeta ?? []),
  ];

  const scripts =
    input.jsonLd != null
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              ...(Array.isArray(input.jsonLd)
                ? { "@graph": input.jsonLd }
                : input.jsonLd),
            }),
          },
        ]
      : undefined;

  return {
    meta,
    links: [{ rel: "canonical", href: canonical }],
    ...(scripts ? { scripts } : {}),
  };
}

/** Organization + WebSite graph for the document root. */
export function rootOrganizationGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        image: OG_IMAGE,
        description:
          "Aura OS runs your company as a living organism of autonomous AI employees — strategy, growth, sales, and operations, awake around the clock.",
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: ["en", "de"],
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icons/icon-512.png`,
          width: 512,
          height: 512,
          caption: "Aura OS app icon",
        },
        sameAs: SOCIAL_LINKS.map((s) => s.href),
      },
    ],
  };
}

/** FAQPage JSON-LD from plain Q&A strings. */
export function faqPageJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
