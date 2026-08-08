import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Share2 } from "lucide-react";

import { SITE_URL } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

export type CardKind = "level" | "revenue" | "first-call" | "streak" | "rank" | "milestone";

const LABEL: Record<CardKind, string> = {
  level: "Founder level up",
  revenue: "Agent revenue",
  "first-call": "First paid API call",
  streak: "Streak",
  rank: "Leaderboard",
  milestone: "Milestone",
};

const W = 1200;
const H = 630;

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Paints the share card. Pure canvas so it works offline and needs no server render. */
function paint(
  ctx: CanvasRenderingContext2D,
  d: { kind: CardKind; headline: string; stat: string; sub?: string; handle?: string; url: string },
) {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(0, 0, W, H);

  const aurora = ctx.createRadialGradient(220, 120, 40, 320, 180, 760);
  aurora.addColorStop(0, "rgba(34,211,238,0.34)");
  aurora.addColorStop(0.45, "rgba(34,211,238,0.07)");
  aurora.addColorStop(1, "rgba(11,13,16,0)");
  ctx.fillStyle = aurora;
  ctx.fillRect(0, 0, W, H);

  const warm = ctx.createRadialGradient(1080, 560, 20, 1020, 540, 620);
  warm.addColorStop(0, "rgba(245,182,102,0.26)");
  warm.addColorStop(1, "rgba(11,13,16,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  rounded(ctx, 40, 40, W - 80, H - 80, 40);
  ctx.stroke();

  // eyebrow
  ctx.fillStyle = "rgba(34,211,238,0.95)";
  ctx.font = "600 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(LABEL[d.kind].toUpperCase().split("").join(" "), 92, 132);

  // stat
  ctx.fillStyle = "#f4f6f8";
  ctx.font = "700 108px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(d.stat.slice(0, 22), 90, 262);

  // headline (wrapped)
  ctx.fillStyle = "rgba(244,246,248,0.86)";
  ctx.font = "500 40px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  const words = d.headline.split(" ");
  let line = "";
  let y = 340;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > W - 200 && line) {
      ctx.fillText(line, 90, y);
      line = w;
      y += 52;
      if (y > 440) break;
    } else line = next;
  }
  if (line) ctx.fillText(line, 90, y);

  if (d.sub) {
    ctx.fillStyle = "rgba(244,246,248,0.5)";
    ctx.font = "400 26px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(d.sub.slice(0, 70), 90, y + 52);
  }

  // ring mark
  ctx.save();
  ctx.translate(1030, 150);
  ctx.strokeStyle = "rgba(34,211,238,0.85)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(245,182,102,0.95)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 54, -0.5, 1.1);
  ctx.stroke();
  ctx.fillStyle = "#f4f6f8";
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // footer
  ctx.fillStyle = "rgba(244,246,248,0.55)";
  ctx.font = "500 26px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(d.handle ? `@${d.handle}` : "aibusiness.fun", 90, H - 92);
  ctx.fillStyle = "rgba(244,246,248,0.35)";
  ctx.font = "400 22px ui-monospace, SFMono-Regular, Menlo, monospace";
  const link = d.url.replace(/^https?:\/\//, "");
  ctx.fillText(link, 90, H - 58);

  ctx.fillStyle = "rgba(244,246,248,0.4)";
  ctx.font = "600 22px ui-sans-serif, system-ui, sans-serif";
  const tag = "AURA · AI COMPANY OS";
  ctx.fillText(tag, W - 90 - ctx.measureText(tag).width, H - 58);
}

/**
 * One-tap share card. Renders a 1200x630 PNG in the browser and lets the
 * founder download it, copy it to the clipboard, or post it straight to X.
 * The link always carries the referral code.
 */
export function ShareCard({
  kind,
  headline,
  stat,
  sub,
  handle,
  refCode,
  path,
  className,
}: {
  kind: CardKind;
  headline: string;
  stat: string;
  sub?: string;
  handle?: string;
  refCode?: string;
  path?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `${SITE_URL}${path ?? (handle ? `/u/${handle}` : "/")}${refCode ? `?ref=${refCode}` : ""}`;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    paint(ctx, {
      kind,
      headline,
      stat,
      ...(sub ? { sub } : {}),
      ...(handle ? { handle } : {}),
      url,
    });
  }, [kind, headline, stat, sub, handle, url]);

  const blob = useCallback(
    async () =>
      new Promise<Blob | null>(
        (resolve) => ref.current?.toBlob((b) => resolve(b), "image/png") ?? resolve(null),
      ),
    [],
  );

  const download = async () => {
    setBusy(true);
    const b = await blob();
    setBusy(false);
    if (!b) return;
    const href = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = href;
    a.download = `aura-${kind}.png`;
    a.click();
    URL.revokeObjectURL(href);
    trackTeaser("share", { placement: `card-download:${kind}` });
    toast.success("Card saved");
  };

  const copy = async () => {
    setBusy(true);
    try {
      const b = await blob();
      if (!b) throw new Error("no blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
      trackTeaser("share", { placement: `card-copy:${kind}` });
      toast.success("Card copied — paste it into your post");
    } catch {
      toast.error("Clipboard blocked — use Save instead");
    } finally {
      setBusy(false);
    }
  };

  const post = async () => {
    await copy();
    const text = `${stat} — ${headline}`;
    trackTeaser("share", { placement: `card-x:${kind}` });
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition disabled:opacity-50";

  return (
    <div className={cn("space-y-3", className)}>
      <canvas
        ref={ref}
        width={W}
        height={H}
        className="w-full rounded-2xl border border-border/50"
        aria-label={`${LABEL[kind]} share card`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={post}
          disabled={busy}
          className={cn(btn, "bg-primary text-primary-foreground")}
        >
          <Share2 className="h-3.5 w-3.5" /> Post to X
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={busy}
          className={cn(btn, "bg-foreground/8 text-muted-foreground hover:text-foreground")}
        >
          <Copy className="h-3.5 w-3.5" /> Copy image
        </button>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className={cn(btn, "bg-foreground/8 text-muted-foreground hover:text-foreground")}
        >
          <Download className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </div>
  );
}
