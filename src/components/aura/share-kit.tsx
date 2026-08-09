import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Dice5,
  Download,
  Link2,
  Linkedin,
  Pause,
  Play,
  Share2,
  Sparkles,
} from "lucide-react";

import { ShareBar } from "@/components/aura/share";
import {
  downloadShareVideo,
  fetchShareVideoFile,
  SHARE_POSTS,
  shareKitUrl,
  sharePosterSrc,
  shareVideoSrc,
  shareWatchUrl,
  type SharePost,
} from "@/lib/share-posts";
import { SITE_URL } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

function pickCaption(post: SharePost, index: number) {
  return post.captions[index % post.captions.length] ?? post.captions[0] ?? post.hook;
}

/**
 * Public share kit — pick a clip, copy a caption, share the hosted watch link
 * (or download MP4 for native LinkedIn/TikTok upload). No login.
 */
export function ShareKit({
  className,
  placement = "share_page",
}: {
  className?: string;
  placement?: string;
}) {
  const [activeId, setActiveId] = useState(SHARE_POSTS[0]?.id ?? "meanwhile");
  const [captionIx, setCaptionIx] = useState(0);
  const [copied, setCopied] = useState<"caption" | "link" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mediaArmed, setMediaArmed] = useState(false);
  const [busy, setBusy] = useState<"dl" | "native" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const post = useMemo(
    () => SHARE_POSTS.find((p) => p.id === activeId) ?? SHARE_POSTS[0]!,
    [activeId],
  );
  const caption = pickCaption(post, captionIx);
  const watchUrl = shareWatchUrl(post.id);
  const kitUrl = shareKitUrl(post.id);
  const captionWithLink = `${caption}\n\n${watchUrl}`;

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (hash && SHARE_POSTS.some((p) => p.id === hash)) {
      setActiveId(hash);
    }
  }, []);

  useEffect(() => {
    setCaptionIx(0);
    setPlaying(false);
    setMediaArmed(false);
    setCopied(null);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
  }, [activeId]);

  const select = (id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
    trackTeaser("share", { placement: `${placement}:pick`.slice(0, 40) });
  };

  const remix = () => {
    const nextPost = SHARE_POSTS[Math.floor(Math.random() * SHARE_POSTS.length)]!;
    const nextCap = Math.floor(Math.random() * nextPost.captions.length);
    setActiveId(nextPost.id);
    setCaptionIx(nextCap);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${nextPost.id}`);
    }
    trackTeaser("share", { placement: `${placement}:remix`.slice(0, 40) });
    toast.success("Fresh combo unlocked");
  };

  const cycleCaption = () => {
    setCaptionIx((i) => (i + 1) % post.captions.length);
    trackTeaser("share", { placement: `${placement}:caption`.slice(0, 40) });
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(captionWithLink);
      setCopied("caption");
      window.setTimeout(() => setCopied(null), 1600);
      trackTeaser("share", { placement: `${placement}:copy`.slice(0, 40) });
      toast.success("Caption + watch link copied");
    } catch {
      toast.error("Copy failed — select the text manually.");
    }
  };

  const copyWatchLink = async () => {
    try {
      await navigator.clipboard.writeText(watchUrl);
      setCopied("link");
      window.setTimeout(() => setCopied(null), 1600);
      trackTeaser("share", { placement: `${placement}:link`.slice(0, 40) });
      toast.success("Watch link copied — paste on X or LinkedIn");
    } catch {
      toast.error("Copy failed");
    }
  };

  const downloadVideo = async () => {
    setBusy("dl");
    try {
      await downloadShareVideo(post.file);
      trackTeaser("download", { placement: `${placement}:${post.id}`.slice(0, 40) });
      toast.success("Download started — upload natively on LinkedIn / TikTok / Reels");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(null);
    }
  };

  const shareToApps = async () => {
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
        text: captionWithLink,
        url: watchUrl,
      };
      if (nav.share && (!nav.canShare || nav.canShare(data))) {
        await nav.share(data);
        trackTeaser("share", { placement: `${placement}:os`.slice(0, 40) });
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

  const postToX = async () => {
    try {
      await navigator.clipboard.writeText(captionWithLink);
    } catch {
      /* still open intent */
    }
    trackTeaser("share", { placement: `${placement}:x`.slice(0, 40) });
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(captionWithLink)}`,
      "_blank",
      "noopener,noreferrer",
    );
    toast.message("Caption includes the watch link — X will card the hosted page");
  };

  const postToLinkedIn = () => {
    trackTeaser("share", { placement: `${placement}:li`.slice(0, 40) });
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(watchUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
    toast.message("For LinkedIn in-feed autoplay, Download MP4 and upload natively.");
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (!mediaArmed) {
        setMediaArmed(true);
        v.src = shareVideoSrc(post.file);
        v.load();
        const onReady = () => {
          v.removeEventListener("canplay", onReady);
          void v.play().catch(() => undefined);
          setPlaying(true);
        };
        v.addEventListener("canplay", onReady);
        return;
      }
      void v.play().catch(() => undefined);
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const vertical = post.aspect === "vertical";

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Share kit · free for everyone
          </p>
          <h1 className="mt-2 font-display text-[clamp(1.75rem,5vw,2.75rem)] leading-[0.98] tracking-tight">
            Steal these posts.
            <span className="block text-muted-foreground">Share the hosted clip.</span>
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            Pick a clip, copy a caption, and share the watch link — the video stays hosted on Aura.
            Download the MP4 only when a platform needs a native upload (LinkedIn, TikTok, Reels).
          </p>
        </div>
        <button
          type="button"
          onClick={remix}
          className="inline-flex items-center gap-2 rounded-2xl border border-primary/35 bg-primary/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/16"
        >
          <Dice5 className="h-3.5 w-3.5" /> Surprise me
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SHARE_POSTS.map((p) => {
          const on = p.id === post.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => select(p.id)}
              className={cn(
                "shrink-0 rounded-2xl border px-3.5 py-2 text-left transition-all",
                on
                  ? "border-primary/50 bg-primary/12 text-foreground"
                  : "border-border/50 bg-white/[0.03] text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <span className="block text-[11px] font-semibold">{p.title}</span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-[0.16em] opacity-70">
                {p.aspect === "vertical" ? "9:16" : "16:9"} · {p.duration}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
        <div
          className={cn(
            "relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-[#0b0d10]",
            "shadow-[0_0_60px_-28px_hsl(var(--primary)/0.45)]",
          )}
        >
          <div
            className={cn(
              "relative mx-auto",
              vertical ? "aspect-[9/16] max-h-[min(72vh,640px)] w-full max-w-[22rem]" : "aspect-video w-full",
            )}
          >
            <video
              ref={videoRef}
              key={post.file}
              className="h-full w-full object-cover"
              poster={sharePosterSrc(post.file)}
              playsInline
              loop
              preload="none"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="absolute inset-0 grid place-items-center bg-gradient-to-t from-background/50 via-transparent to-transparent transition-opacity"
            >
              <span
                className={cn(
                  "grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition-transform",
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold">{post.title}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{post.vibe}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {post.bestFor.map((b) => (
                <span
                  key={b}
                  className="rounded-lg bg-white/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/50 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Caption pack · {captionIx + 1}/{post.captions.length}
              </p>
              <button
                type="button"
                onClick={cycleCaption}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary transition-opacity hover:opacity-80"
              >
                <Sparkles className="h-3.5 w-3.5" /> Next vibe
              </button>
            </div>
            <p className="mt-2 text-[15px] font-medium leading-snug text-foreground/95">{post.hook}</p>
            <pre className="mt-4 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-background/70 p-4 font-sans text-[13px] leading-relaxed text-muted-foreground">
              {captionWithLink}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyWatchLink()}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90"
              >
                {copied === "link" ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                {copied === "link" ? "Link copied" : "Copy watch link"}
              </button>
              <button
                type="button"
                onClick={() => void copyCaption()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
              >
                {copied === "caption" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "caption" ? "Copied" : "Copy caption + link"}
              </button>
              <button
                type="button"
                onClick={() => void postToX()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
              >
                <Share2 className="h-3.5 w-3.5" /> Post to X
              </button>
              <button
                type="button"
                onClick={postToLinkedIn}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
              >
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn link
              </button>
              <button
                type="button"
                disabled={busy === "dl"}
                onClick={() => void downloadVideo()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {busy === "dl" ? "Saving…" : "Download MP4"}
              </button>
              <button
                type="button"
                disabled={busy === "native"}
                onClick={() => void shareToApps()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                {busy === "native" ? "Sharing…" : "Share to apps"}
              </button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/50 bg-white/[0.03] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Share this kit
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Send the whole pack to a friend who still thinks AI companies are just chatbots with
              logos. Each clip also has a permanent watch page at{" "}
              <span className="text-foreground/80">{SITE_URL}/v/…</span>
            </p>
            <ShareBar
              className="mt-4"
              url={kitUrl}
              text={`Aura OS share kit — hosted clips + captions ready to post. ${SITE_URL}/share`}
              placement={`${placement}_bar`}
            />
            <Link
              to="/v/$postId"
              params={{ postId: post.id }}
              className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
            >
              Open this clip&apos;s watch page →
            </Link>
          </div>

          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground/80">
            Tip: share the watch link for a card that opens the hosted video. Vertical cuts love
            TikTok / Reels / Shorts (download → native upload). Landscape cuts slap as links on X
            and LinkedIn.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Compact teaser band for the landing page — links into the full kit. */
export function ShareKitTeaser({ className }: { className?: string }) {
  return (
    <section
      id="share-kit"
      className={cn(
        "relative z-10 border-y border-primary/10 bg-gradient-to-b from-primary/[0.05] to-transparent",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
              Free share kit
            </p>
            <h2 className="mt-2 font-display text-[clamp(2rem,6vw,3.1rem)] leading-[0.98] tracking-tight">
              Funny posts.
              <span className="block text-primary">Hosted clips.</span>
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              You own the company. The staff just happen to be AI — captions and watch links that
              sound like that, not a press release. Download for native upload when you need it.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <li className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-foreground/4 px-3 py-1.5">
                <Copy className="h-3 w-3 text-primary" /> Caption
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-foreground/4 px-3 py-1.5">
                <Link2 className="h-3 w-3 text-primary" /> Watch link
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-foreground/4 px-3 py-1.5">
                <Download className="h-3 w-3 text-primary" /> MP4
              </li>
            </ul>
            <Link
              to="/share"
              onClick={() => trackTeaser("share", { placement: "landing_kit_cta" })}
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open the share kit <Share2 className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {SHARE_POSTS.slice(0, 6).map((p, i) => (
              <Link
                key={p.id}
                to="/v/$postId"
                params={{ postId: p.id }}
                onClick={() =>
                  trackTeaser("share", { placement: `landing_kit_${p.id}`.slice(0, 40) })
                }
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/40 bg-white/[0.03]",
                  i === 0 || i === 5 ? "aspect-[4/5]" : "aspect-square",
                )}
              >
                <img
                  src={sharePosterSrc(p.file)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 right-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                  {p.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
