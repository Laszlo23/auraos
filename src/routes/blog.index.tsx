import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter } from "@/components/aura/site-footer";
import { BLOG_POSTS } from "@/lib/blog";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — Aura OS" },
      {
        name: "description",
        content: "Short essays from Aura OS — product, keys, and community without the casino voice.",
      },
      { property: "og:title", content: "Blog — Aura OS" },
      { property: "og:url", content: `${SITE_URL}/blog` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/blog` }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 10% 0%, oklch(0.55 0.08 200 / 0.18), transparent 55%), radial-gradient(ellipse 50% 35% at 90% 10%, oklch(0.7 0.1 85 / 0.1), transparent 50%)",
        }}
      />
      <header className="relative border-b border-border/40">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link to="/" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            ← Aura OS
          </Link>
        </div>
      </header>
      <div className="relative mx-auto max-w-3xl px-6 py-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Field notes</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Blog</h1>
        <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
          Funny on purpose. Clear on security. Never investment advice.
        </p>
        <ul className="mt-12 space-y-6">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug}>
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="block rounded-3xl border border-border/50 bg-foreground/[0.03] p-6 transition-colors hover:border-primary/35"
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {post.date} · {post.readingMinutes} min
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">{post.title}</h2>
                <p className="mt-2 text-[14px] text-muted-foreground">{post.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <SiteFooter />
    </main>
  );
}
