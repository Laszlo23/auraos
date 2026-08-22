import { Link } from "@tanstack/react-router";
import { Heart, Sparkles } from "lucide-react";

import { nextLoopPost, sharePosterSrc, type SharePost } from "@/lib/share-posts";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: "01", de: "Schau", en: "Watch — full focus, no rush." },
  { n: "02", de: "Steal", en: "Copy the caption. Keep the love." },
  { n: "03", de: "Nachbar", en: "Send it to one person. No judging." },
  { n: "04", de: "Weiter", en: "They watch the next clip. Wien grows." },
] as const;

/**
 * Watch → caption → neighbor → next clip.
 * Reward follows a real share, not a recruitment ladder.
 */
export function WienWaveLoop({ current, className }: { current: SharePost; className?: string }) {
  const next = nextLoopPost(current.id);

  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-primary/25 bg-gradient-to-b from-primary/[0.08] to-white/[0.03] p-5",
        className,
      )}
    >
      <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
        <Heart className="h-3 w-3" /> Der Loop · Wien wave
      </p>
      <p className="mt-2 text-[15px] font-medium leading-snug">
        Kein Urteil. Nur jetzt. Die kleinen Dinge. Dankbar.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Schau den Clip. Teil ihn mit an Nachbarn. Sie schauen weiter. Wien wächst — weil jemand
        wirklich hingeschaut hat, ned weil wer Sterne kauft.
      </p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-border/40 bg-background/50 px-3 py-2.5"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {s.n} · {s.de}
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
              {s.en}
            </span>
          </li>
        ))}
      </ol>

      <Link
        to="/v/$postId"
        params={{ postId: next.id }}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-border/50 bg-foreground/4 p-2 pr-3 transition-colors hover:border-primary/40"
      >
        <img
          src={sharePosterSrc(next.file)}
          alt=""
          width={72}
          height={96}
          className="h-16 w-12 shrink-0 rounded-xl object-cover"
        />
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Nächster Clip
          </span>
          <span className="mt-0.5 block truncate text-[14px] font-semibold">{next.title}</span>
          <span className="block truncate text-[12px] text-muted-foreground">{next.hook}</span>
        </span>
      </Link>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
        <Link
          to="/wien"
          className="rounded-full border border-border/50 px-3 py-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          Wien
        </Link>
        <Link
          to="/story"
          className="rounded-full border border-border/50 px-3 py-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          G’schicht
        </Link>
        <Link
          to="/sticker"
          className="rounded-full border border-border/50 px-3 py-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          Stickers
        </Link>
        <Link
          to="/nachbar"
          className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-primary"
        >
          <Sparkles className="h-3 w-3" /> Nachbar
        </Link>
      </div>
    </div>
  );
}
