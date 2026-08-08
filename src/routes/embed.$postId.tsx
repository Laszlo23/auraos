import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  getSharePost,
  sharePosterSrc,
  shareVideoDims,
  shareVideoSrc,
} from "@/lib/share-posts";
import { cn } from "@/lib/utils";

/**
 * Minimal iframe player for twitter:player (and any future embed).
 * No chrome — X embeds this URL when the domain is player-card approved.
 */
export const Route = createFileRoute("/embed/$postId")({
  params: {
    parse: (p) => ({ postId: String(p.postId || "") }),
    stringify: (p) => ({ postId: p.postId }),
  },
  beforeLoad: ({ params }) => {
    const post = getSharePost(params.postId);
    if (!post) throw notFound();
    return { post };
  },
  headers: () => ({
    // Prefer CSP frame-ancestors over X-Frame-Options (ALLOWALL is invalid).
    "Content-Security-Policy":
      "frame-ancestors 'self' https://twitter.com https://x.com https://platform.twitter.com https://*.twitter.com https://www.linkedin.com https://*.linkedin.com",
  }),
  head: ({ params }) => {
    const post = getSharePost(params.postId);
    if (!post) return { meta: [{ title: "Embed" }] };
    const dims = shareVideoDims(post.aspect);
    return {
      meta: [
        { title: `${post.title} — embed` },
        { name: "robots", content: "noindex" },
        { name: "twitter:player:width", content: String(dims.width) },
        { name: "twitter:player:height", content: String(dims.height) },
      ],
    };
  },
  component: EmbedPlayer,
});

function EmbedPlayer() {
  const { post } = Route.useRouteContext();
  const vertical = post.aspect === "vertical";

  return (
    <div className="m-0 flex h-dvh w-full items-center justify-center overflow-hidden bg-black p-0">
      <video
        className={cn("h-full w-full object-contain", vertical && "max-w-[100vw]")}
        src={shareVideoSrc(post.file)}
        poster={sharePosterSrc(post.file)}
        controls
        playsInline
        autoPlay
        muted
        loop
        preload="metadata"
      />
    </div>
  );
}
