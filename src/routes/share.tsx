import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ShareKit } from "@/components/aura/share-kit";
import { SiteFooter } from "@/components/aura/site-footer";
import { LAUNCH_SHARE_TEXT, OG_IMAGE, SITE_URL, TOKEN_LAUNCH_DISPLAY } from "@/lib/site";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Share kit — hosted Aura OS clips + captions | Aura OS" },
      {
        name: "description",
        content: `Share free Aura OS watch links and captions — or download MP4s for native upload. Fair launch ${TOKEN_LAUNCH_DISPLAY}. No login.`,
      },
      { property: "og:title", content: "Aura OS share kit — steal these posts" },
      {
        property: "og:description",
        content:
          "Funny captions + hosted watch pages. Share the link, or download for LinkedIn/TikTok native upload.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/share` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aura OS share kit — steal these posts" },
      {
        name: "twitter:description",
        content: "Hosted clips + captions. Share the watch link. Free for everyone.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/share` }],
  }),
  component: SharePage,
});

function SharePage() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, oklch(0.75 0.14 199 / 0.16), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 20%, oklch(0.75 0.12 78 / 0.1), transparent 50%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Aura OS
        </Link>
        <Link
          to="/access"
          className="rounded-xl border border-border/50 bg-foreground/4 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Earn invite
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-4">
        <ShareKit placement="share_page" />
      </div>

      <SiteFooter
        share={{
          url: `${SITE_URL}/share`,
          text: LAUNCH_SHARE_TEXT,
          placement: "share_footer",
        }}
      />
    </main>
  );
}
