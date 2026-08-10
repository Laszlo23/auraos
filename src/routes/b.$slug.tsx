import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Star } from "lucide-react";

import { Chip, Pulse, Shimmer } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { getPublicLocalBusiness } from "@/lib/reviews.public.functions";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/b/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — local business | Aura` },
      {
        name: "description",
        content: "Local business card — homepage, Google reviews, and recent posts.",
      },
      { property: "og:title", content: `${params.slug} — Aura local business` },
      { property: "og:url", content: `${SITE_URL}/b/${params.slug}` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/b/${params.slug}` }],
  }),
  component: LocalBusinessCardPage,
});

function LocalBusinessCardPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["public-local-business", slug],
    queryFn: () => getPublicLocalBusiness({ data: { slug } }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Shimmer className="h-28" />
        <Shimmer className="h-40" />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-lg p-12 text-center">
        <h1 className="font-display text-2xl font-semibold">Business not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">No public card for this slug.</p>
        <Link to="/" className="mt-6 inline-block text-primary">
          Back to Aura OS
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 20% -10%, oklch(0.55 0.1 200 / 0.18), transparent 55%), radial-gradient(ellipse 45% 35% at 90% 10%, oklch(0.75 0.12 85 / 0.1), transparent 50%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link to="/" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {SITE_NAME}
          </Link>
          <Chip className="ml-auto">Local</Chip>
          {data.local_cohort_number ? (
            <Chip tone="gold">Boost #{data.local_cohort_number}</Chip>
          ) : null}
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          {[data.city, data.niche].filter(Boolean).join(" · ") || "Local business"}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.2rem,6vw,3.4rem)] font-semibold leading-[1.02] tracking-tight">
          {data.name}
        </h1>
        {data.tagline ? (
          <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">{data.tagline}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {data.homepage_url ? (
            <a
              href={data.homepage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Visit website <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          {data.google_review_url ? (
            <a
              href={data.google_review_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-3 text-sm font-semibold text-foreground"
            >
              <Star className="h-4 w-4 text-gold" /> Leave a Google review
            </a>
          ) : null}
        </div>

        {data.posts.length > 0 ? (
          <div className="mt-14 border-t border-border/40 pt-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Recent posts
            </p>
            <ul className="mt-5 space-y-4">
              {data.posts.map((p) => (
                <li key={p.id} className="rounded-3xl border border-border/40 bg-card/30 p-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    <Pulse /> {p.provider}
                    {p.published_at ? <span>· {timeAgo(p.published_at)}</span> : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}
