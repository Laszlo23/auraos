import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { SiteFooter } from "@/components/aura/site-footer";
import { getPost } from "@/lib/blog";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Post"} — Aura OS` },
      { name: "description", content: loaderData?.description ?? "" },
      { property: "og:title", content: loaderData?.title ?? "Aura OS Blog" },
      { property: "og:description", content: loaderData?.description ?? "" },
      { property: "og:url", content: `${SITE_URL}/blog/${loaderData?.slug ?? ""}` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/blog/${loaderData?.slug ?? ""}` }],
  }),
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 80% -5%, oklch(0.72 0.1 85 / 0.14), transparent 50%), radial-gradient(ellipse 45% 30% at 0% 20%, oklch(0.55 0.08 220 / 0.12), transparent 55%)",
        }}
      />
      <header className="relative border-b border-border/40">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
          <Link
            to="/blog"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Blog
          </Link>
        </div>
      </header>
      <article className="relative mx-auto max-w-2xl px-6 py-14">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {post.date} · {post.readingMinutes} min read
        </p>
        <h1 className="mt-4 font-display text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.05] tracking-tight">
          {post.title}
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground">{post.description}</p>
        <div className="mt-10 space-y-5 text-[15px] leading-relaxed text-foreground/85">
          {post.body.map((block) => {
            if (block.startsWith("## ")) {
              return (
                <h2 key={block} className="pt-4 font-display text-xl font-semibold tracking-tight">
                  {block.slice(3)}
                </h2>
              );
            }
            return (
              <p
                key={block.slice(0, 48)}
                className="whitespace-pre-line"
                dangerouslySetInnerHTML={{
                  __html: block
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n/g, "<br/>"),
                }}
              />
            );
          })}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            to="/"
            hash="community"
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Join the waitlist
          </Link>
          <Link
            to="/pitch"
            className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Read the pitch
          </Link>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
