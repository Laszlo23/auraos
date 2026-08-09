import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Download, Link2, Linkedin, Pause, Play, Share2 } from "lucide-react";
import { toast } from "sonner";

import { ShareBar } from "@/components/aura/share";
import { SiteFooter } from "@/components/aura/site-footer";
import {
  downloadShareVideo,
  fetchShareVideoFile,
  getSharePost,
  sharePosterAbsoluteUrl,
  sharePosterSrc,
  shareVideoAbsoluteUrl,
  shareVideoDims,
  shareVideoSrc,
  shareWatchUrl,
} from "@/lib/share-posts";
import { SITE_URL } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/v/$postId")({
  params: {
    parse: (p) => ({ postId: String(p.postId || "") }),
    stringify: (p) => ({ postId: p.postId }),
  },
  beforeLoad: ({ params }) => {
    const post = getSharePost(params.postId);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params }) => {
    const post = getSharePost(params.postId);
    if (!post) {
      return { meta: [{ title: "Clip not found — Aura OS" }] };
    }
    const dims = shareVideoDims(post.aspect);
    const watch = shareWatchUrl(post.id);
    const poster = sharePosterAbsoluteUrl(post.file);
    const video = shareVideoAbsoluteUrl(post.file);
    const title = `${post.title} — Aura OS`;
    const description = `${post.hook} ${post.vibe}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "video.other" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: watch },
        { property: "og:image", content: poster },
        { property: "og:image:width", content: String(dims.width) },
        { property: "og:image:height", content: String(dims.height) },
        { property: "og:video", content: video },
        { property: "og:video:secure_url", content: video },
        { property: "og:video:type", content: "video/mp4" },
        { property: "og:video:width", content: String(dims.width) },
        { property: "og:video:height", content: String(dims.height) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: poster },
      ],
      links: [{ rel: "canonical", href: watch }],
    };
  },
  component: WatchPage,
});

function WatchPage() {
  const { post } = Route.useRouteContext();
  const watchUrl = shareWatchUrl(post.id);
  const caption = post.captions[0] ?? post.hook;
  const shareText = `${caption}\n\n${watchUrl}`;
  const vertical = post.aspect === "vertical";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<"dl" | "native" | null>(null);

  useEffect(() => {
    trackTeaser("share", { placement: `watch:${post.id}`.slice(0, 40) });
  }, [post.id]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => undefined);
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(watchUrl);
      trackTeaser("share", { placement: `watch_copy:${post.id}`.slice(0, 40) });
      toast.success("Watch link copied — paste it on X or LinkedIn");
    } catch {
      toast.error("Copy failed — select the URL from the address bar.");
    }
  };

  const copyCaptionAndLink = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Caption + watch link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const postToX = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      /* still open */
    }
    trackTeaser("share", { placement: `watch_x:${post.id}`.slice(0, 40) });
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const postToLinkedIn = () => {
    trackTeaser("share", { placement: `watch_li:${post.id}`.slice(0, 40) });
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(watchUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
    toast.message("For LinkedIn in-feed autoplay, download the MP4 and upload natively.");
  };

  const onDownload = async () => {
    setBusy("dl");
    try {
      await downloadShareVideo(post.file);
      trackTeaser("download", { placement: `watch_dl:${post.id}`.slice(0, 40) });
      toast.success("Download started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(null);
    }
  };

  const onNativeShare = async () => {
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
      share?: (d: ShareData) => Promise<void>;
    };
    setBusy("native");
    try {
      const file = await fetchShareVideoFile(post.file);
      const data: ShareData = {
        files: [file],
        title: post.title,
        text: shareText,
        url: watchUrl,
      };
      if (nav.share && (!nav.canShare || nav.canShare(data))) {
        await nav.share(data);
        trackTeaser("share", { placement: `watch_os:${post.id}`.slice(0, 40) });
        return;
      }
      await downloadShareVideo(post.file);
      toast.message("Saved the MP4 — attach it in your app");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "Share failed");
    } finally {
      setBusy(null);
    }
  };

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

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link
          to="/share"
          className="inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Share kit
        </Link>
        <Link
          to="/"
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
        >
          Aura OS
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid max-w-5xl gap-8 px-6 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-[#0b0d10] shadow-[0_0_60px_-28px_hsl(var(--primary)/0.45)]">
          <div
            className={cn(
              "relative mx-auto",
              vertical ? "aspect-[9/16] max-h-[min(72vh,640px)] w-full max-w-[22rem]" : "aspect-video w-full",
            )}
          >
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              poster={sharePosterSrc(post.file)}
              playsInline
              loop
              controls={false}
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            >
              <source src={shareVideoSrc(post.file)} type="video/mp4" />
            </video>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="absolute inset-0 grid place-items-center bg-gradient-to-t from-background/50 via-transparent to-transparent"
            >
              <span
                className={cn(
                  "grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
                  playing ? "opacity-0 hover:opacity-100" : "opacity-100",
                )}
              >
                {playing ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current pl-0.5" />
                )}
              </span>
            </button>
          </div>
          <div className="border-t border-white/8 px-4 py-3">
            <p className="text-[15px] font-semibold">{post.title}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{post.vibe}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/50 bg-white/[0.03] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Hosted clip · share the link
            </p>
            <p className="mt-2 text-[15px] font-medium leading-snug">{post.hook}</p>
            <pre className="mt-4 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-background/70 p-4 font-sans text-[13px] leading-relaxed text-muted-foreground">
              {shareText}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
              >
                <Link2 className="h-3.5 w-3.5" /> Copy watch link
              </button>
              <button
                type="button"
                onClick={() => void copyCaptionAndLink()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
              >
                <Copy className="h-3.5 w-3.5" /> Copy caption + link
              </button>
              <button
                type="button"
                onClick={() => void postToX()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
              >
                <Share2 className="h-3.5 w-3.5" /> Post to X
              </button>
              <button
                type="button"
                onClick={postToLinkedIn}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
              >
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn link
              </button>
              <button
                type="button"
                disabled={busy === "dl"}
                onClick={() => void onDownload()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {busy === "dl" ? "Saving…" : "Download MP4"}
              </button>
              <button
                type="button"
                disabled={busy === "native"}
                onClick={() => void onNativeShare()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                {busy === "native" ? "Sharing…" : "Share to apps"}
              </button>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
              Paste the watch link on X or LinkedIn for a card that opens this page (video stays
              hosted here). For LinkedIn / TikTok / Reels in-feed autoplay, download the MP4 and
              upload natively.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border/50 bg-white/[0.03] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              More ways
            </p>
            <ShareBar
              className="mt-4"
              url={watchUrl}
              text={shareText}
              placement={`watch_bar_${post.id}`.slice(0, 40)}
            />
            <Link
              to="/share"
              hash={post.id}
              className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
            >
              Open full share kit →
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter
        share={{
          url: watchUrl,
          text: shareText,
          placement: "watch_footer",
        }}
      />
      <span className="sr-only">{SITE_URL}</span>
    </main>
  );
}
