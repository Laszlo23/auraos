import { ogCampaignMeta } from "@/lib/og-campaign";
import { url } from "@/lib/site";

export function nachbarHead({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}) {
  const canonical = url(path);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: index ? "index, follow" : "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonical },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "de_AT" },
      { property: "og:site_name", content: "Aura Nachbar" },
      ...ogCampaignMeta("nachbar"),
    ],
    links: [{ rel: "canonical", href: canonical }],
  };
}
