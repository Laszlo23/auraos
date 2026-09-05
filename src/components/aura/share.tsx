import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, ChevronDown, Copy, Link2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackTeaser } from "@/lib/teaser-track";

type Network = "x" | "linkedin" | "facebook" | "whatsapp" | "telegram" | "reddit";

/** Build a share body that reads well in X / LinkedIn / Facebook composers. */
export function buildShareText(opts: {
  headline: string;
  detail?: string | null;
  url?: string;
  /** Include URL inside the text body (best for X & LinkedIn text composers). */
  embedUrl?: boolean;
}): string {
  const parts = [opts.headline.trim()];
  if (opts.detail?.trim()) parts.push(opts.detail.trim());
  if (opts.embedUrl && opts.url) parts.push(opts.url);
  return parts.filter(Boolean).join("\n\n");
}

/**
 * Intent URLs that open the network share composer with content already filled.
 * Facebook only reliably takes a URL (+ optional quote). LinkedIn feed takes text.
 */
export function shareIntentHref(
  network: Network,
  opts: { url: string; text: string; title?: string },
): string {
  const url = opts.url.trim();
  const text = opts.text.trim();
  const title = (opts.title ?? text).trim();
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const titleEnc = encodeURIComponent(title);

  switch (network) {
    case "x":
      // Prefer a single text blob (URL included) so the composer opens filled.
      return `https://x.com/intent/tweet?text=${t}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`;
    case "linkedin":
      // share-offsite is URL-only; feed composer accepts prefilled text.
      return `https://www.linkedin.com/feed/?shareActive=true&text=${t}`;
    case "whatsapp":
      return `https://wa.me/?text=${t}`;
    case "telegram":
      return `https://t.me/share/url?url=${u}&text=${t}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${u}&title=${titleEnc}`;
    default: {
      const _exhaustive: never = network;
      return _exhaustive;
    }
  }
}

const NETWORKS: {
  id: Network;
  label: string;
  path: string;
}[] = [
  {
    id: "x",
    label: "X",
    path: "M18.9 2H22l-7.1 8.1L23.2 22h-6.5l-5.1-6.7L5.7 22H2.6l7.6-8.7L1.2 2h6.7l4.6 6.1L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95C21.6 8.75 22 11.1 22 14.2V21h-4v-6c0-1.43-.03-3.28-2-3.28-2 0-2.3 1.56-2.3 3.17V21h-4V9Z",
  },
  {
    id: "facebook",
    label: "Facebook",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    path: "M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-5.3-4.6c-.4-.6-.9-1.5-.9-2.4 0-.9.5-1.4.7-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.7 1.8c.1.2 0 .4-.1.5l-.4.5c-.1.1-.2.3-.1.5.2.4.8 1.3 1.6 2 .9.8 1.7 1.1 2 1.2.2.1.4 0 .5-.1l.6-.7c.2-.2.3-.2.5-.1l1.7.8c.2.1.4.2.4.3v.8Z",
  },
  {
    id: "telegram",
    label: "Telegram",
    path: "M21.9 4.3 18.9 20c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.2c-.3.3-.5.4-.9.4l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L7.2 12.8 2.7 11.4c-1-.3-1-1 .2-1.4l18-6.9c.8-.3 1.5.2 1 1.2Z",
  },
  {
    id: "reddit",
    label: "Reddit",
    path: "M22 12a2.1 2.1 0 0 0-3.6-1.5 10.3 10.3 0 0 0-5.4-1.7l.9-4.2 3 .6a1.8 1.8 0 1 0 .2-1.2l-3.6-.8c-.2 0-.4.1-.5.4l-1.1 5.2a10.4 10.4 0 0 0-5.4 1.7A2.1 2.1 0 1 0 4 15.4v.6c0 3.1 3.6 5.6 8 5.6s8-2.5 8-5.6v-.6c1.2-.5 2-1.6 2-3.4Zm-13.5 1.4a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm7.9 4.3c-1 1-3 1.1-3.4 1.1s-2.4 0-3.4-1.1c-.2-.2-.2-.4 0-.6.2-.2.4-.2.6 0 .6.6 2 .9 2.8.9s2.2-.3 2.8-.9c.2-.2.4-.2.6 0 .2.2.2.4 0 .6Zm-.4-2.8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z",
  },
];

const PRIMARY: Network[] = ["x", "facebook", "linkedin"];

function openShareWindow(href: string) {
  const w = 620;
  const h = 700;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2));
  window.open(
    href,
    "_blank",
    `noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`,
  );
}

function useShareActions({
  url,
  text,
  title,
  placement,
}: {
  url: string;
  text: string;
  title: string;
  placement: string;
}) {
  const [copied, setCopied] = useState(false);
  /** Prefer body that already embeds the URL for X / LinkedIn text fields. */
  const body = text.includes(url) ? text : buildShareText({ headline: text, url, embedUrl: true });

  const track = (network: string) => {
    const place = `${network}:${placement}`.slice(0, 40);
    trackTeaser("share", { placement: place });
    if (placement.includes("launch")) {
      trackTeaser("launch_share", { placement: place });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      track("copy");
      toast.success("Share text copied");
    } catch {
      toast.error("Copy failed — select the link manually.");
    }
  };

  const native = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (!nav.share) return void copy();
    try {
      await nav.share({ title, text: body, url });
      track("native");
    } catch {
      /* dismissed */
    }
  };

  const openNetwork = (id: Network) => {
    track(id);
    openShareWindow(shareIntentHref(id, { url, text: body, title }));
  };

  return { copied, copy, native, track, body, openNetwork };
}

/**
 * Primary share moment — X / Facebook / LinkedIn open filled composers immediately.
 */
export function ShareMoment({
  url,
  text,
  title = "Aura OS",
  placement = "page",
  className,
  statLine,
  label = "Share this",
  showKit = true,
}: {
  url: string;
  text: string;
  title?: string;
  placement?: string;
  className?: string;
  /** Honest numbers only — e.g. "Seat #12 · 14 actions · 24h" */
  statLine?: string | null;
  label?: string;
  showKit?: boolean;
}) {
  const [more, setMore] = useState(false);
  const { copied, copy, native, openNetwork, body } = useShareActions({
    url,
    text,
    title,
    placement,
  });

  return (
    <div className={cn("space-y-3", className)}>
      {statLine ? (
        <p className="text-[12px] leading-snug text-muted-foreground">
          <span className="num text-foreground/90">{statLine}</span>
          <span className="text-muted-foreground/50"> · </span>
          live numbers, not pitch theater
        </p>
      ) : null}
      <p className="rounded-2xl border border-border/50 bg-foreground/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
        {body}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {PRIMARY.map((id) => {
          const n = NETWORKS.find((x) => x.id === id)!;
          return (
            <button
              key={id}
              type="button"
              onClick={() => openNetwork(id)}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/[0.03] px-3.5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                <path d={n.path} />
              </svg>
              {n.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void native()}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 md:hidden"
        >
          <Share2 className="h-3.5 w-3.5" />
          {label}
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-foreground/[0.03] px-3.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          className="inline-flex items-center gap-1 rounded-2xl px-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          More
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", more && "rotate-180")} />
        </button>
      </div>
      {more ? (
        <ShareBar url={url} text={text} title={title} placement={`${placement}_more`} />
      ) : null}
      {showKit ? (
        <p className="text-[11px] text-muted-foreground">
          Or steal a clip from the{" "}
          <Link to="/share" className="font-semibold text-primary hover:underline">
            share kit
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

/**
 * Share bar with real network intents — opens composers with content filled.
 */
export function ShareBar({
  url,
  text,
  title = "Aura OS",
  placement = "page",
  className,
  compact = false,
}: {
  url: string;
  text: string;
  title?: string;
  placement?: string;
  className?: string;
  compact?: boolean;
}) {
  const { copied, copy, native, openNetwork } = useShareActions({
    url,
    text,
    title,
    placement,
  });

  const btn = cn(
    "group inline-flex items-center justify-center rounded-xl border border-border/60 bg-white/[0.03] text-muted-foreground transition-all",
    "hover:border-primary/40 hover:bg-primary/10 hover:text-foreground hover:-translate-y-0.5",
    compact ? "h-8 w-8" : "h-10 w-10",
  );
  const ico = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {NETWORKS.map((n) => (
        <button
          key={n.id}
          type="button"
          aria-label={`Share on ${n.label}`}
          title={`Share on ${n.label}`}
          onClick={() => openNetwork(n.id)}
          className={btn}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className={ico} aria-hidden="true">
            <path d={n.path} />
          </svg>
        </button>
      ))}
      <button
        type="button"
        onClick={() => void copy()}
        aria-label="Copy share text"
        title="Copy share text"
        className={btn}
      >
        {copied ? <Check className={ico} /> : <Copy className={ico} />}
      </button>
      <button
        type="button"
        onClick={() => void native()}
        aria-label="Share"
        title="Share"
        className={cn(btn, "md:hidden")}
      >
        <Share2 className={ico} />
      </button>
    </div>
  );
}

/** Read-only link chip with a copy affordance. */
export function ShareLink({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
          toast.success("Link copied");
        } catch {
          toast.error("Copy failed.");
        }
      }}
      className={cn(
        "flex w-full items-center gap-2 truncate rounded-xl border border-border/60 bg-white/[0.03] px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
        className,
      )}
    >
      <Link2 className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
      <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.2em]">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
