import { SITE_URL } from "@/lib/site";

/**
 * Per-page open-graph stills — James Dean × Matrix × Wien.
 * Each card answers “why come on board” in one look.
 */
export const OG_CAMPAIGN = {
  home: {
    path: "/og/home.jpg",
    alt: "Own the company. AI works. You keep the upside.",
  },
  wien: {
    path: "/og/wien.jpg",
    alt: "Wien zuerst. 1.000 Betriebe. Real visits. No fake stars.",
  },
  share: {
    path: "/og/share.jpg",
    alt: "Steal the clip. Send a neighbor. Kein Urteil.",
  },
  story: {
    path: "/og/story.jpg",
    alt: "Ned in einem WeWork. How it came together. In Wien.",
  },
  access: {
    path: "/og/access.jpg",
    alt: "Take the seat. You're the owner. Founding $99.",
  },
  nachbar: {
    path: "/og/nachbar.jpg",
    alt: "Be the neighbor. Real visits. Real love. No judging.",
  },
  review: {
    path: "/og/review.jpg",
    alt: "Stars you earned. After the visit. Never for cash.",
  },
  token: {
    path: "/og/token.jpg",
    alt: "777.777.777. Fair launch. No CA until T-0.",
  },
  lokal: {
    path: "/og/lokal.jpg",
    alt: "Your shop. Honest. Homepage, visits, neighbors.",
  },
  team: {
    path: "/og/team.jpg",
    alt: "The crew. Faces. Schmäh. Built in Wien.",
  },
} as const;

export type OgCampaignPage = keyof typeof OG_CAMPAIGN;

export function ogCampaignUrl(page: OgCampaignPage) {
  return `${SITE_URL}${OG_CAMPAIGN[page].path}`;
}

/** Drop-in og:image + twitter:image tags for route `head()`. */
export function ogCampaignMeta(page: OgCampaignPage) {
  const spec = OG_CAMPAIGN[page];
  const src = ogCampaignUrl(page);
  return [
    { property: "og:image", content: src },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: spec.alt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: src },
    { name: "twitter:image:alt", content: spec.alt },
  ];
}
