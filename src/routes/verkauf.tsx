import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, MessageCircle, NotebookPen } from "lucide-react";

import { AuraLogo } from "@/components/aura/aura-logo";
import { useLocale } from "@/hooks/use-locale";
import { rememberFunnel, rememberLocale } from "@/lib/attribution";
import { LOKAL_SALES, LOKAL_SALES_SLIDES, LOKAL_SALES_WHATSAPP } from "@/lib/lokal-sales";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { SITE_URL, url } from "@/lib/site";
import { cn } from "@/lib/utils";

const TITLE = "Aura Lokal — Verkaufspräsentation";
const DESCRIPTION =
  "Sterne, Gäste, Nachbetreuung. 49 € im Monat. Keine Fake-Sterne. Für den Tisch im Betrieb.";

export const Route = createFileRoute("/verkauf")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: url("/verkauf") },
      { property: "og:locale", content: "de_AT" },
      ...ogCampaignMeta("lokal"),
    ],
    links: [{ rel: "canonical", href: url("/verkauf") }],
  }),
  component: VerkaufPage,
});

function VerkaufPage() {
  const { setLocale } = useLocale();
  const [i, setI] = useState(0);
  const [notes, setNotes] = useState(true);
  const slide = LOKAL_SALES_SLIDES[i] ?? LOKAL_SALES_SLIDES[0];
  const last = LOKAL_SALES_SLIDES.length - 1;
  const close = slide.id === "close";

  useEffect(() => {
    rememberFunnel("local");
    rememberLocale("de");
    setLocale("de");
  }, [setLocale]);

  const go = useCallback(
    (next: number) => {
      setI(Math.min(last, Math.max(0, next)));
    },
    [last],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(i + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === "n" || e.key === "N") {
        setNotes((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, i]);

  const wa = `https://wa.me/?text=${encodeURIComponent(LOKAL_SALES_WHATSAPP)}`;

  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <div className="austria-bar" aria-hidden />
      <header className="relative z-10 flex items-center gap-3 border-b border-border/40 px-4 py-3 sm:px-6">
        <AuraLogo size="xs" to="/" label="Aura Lokal" />
        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:block">
          Verkauf · am Tisch
        </p>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {i + 1} / {LOKAL_SALES_SLIDES.length}
        </span>
        <button
          type="button"
          onClick={() => setNotes((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
            notes
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/50 text-muted-foreground",
          )}
        >
          <NotebookPen className="h-3 w-3" />
          Was du sagst
        </button>
      </header>

      <article
        className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-12"
        onTouchStart={(e) => {
          const x = e.changedTouches[0]?.clientX ?? 0;
          (e.currentTarget as HTMLElement).dataset.touchX = String(x);
        }}
        onTouchEnd={(e) => {
          const start = Number((e.currentTarget as HTMLElement).dataset.touchX ?? 0);
          const end = e.changedTouches[0]?.clientX ?? start;
          const dx = end - start;
          if (dx < -48) go(i + 1);
          if (dx > 48) go(i - 1);
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          {slide.kicker}
        </p>
        <h1 className="mt-4 whitespace-pre-line font-display text-[clamp(2rem,8vw,3.6rem)] font-semibold leading-[0.98] tracking-tight">
          {slide.title}
        </h1>
        <ul className="mt-8 space-y-3">
          {slide.lines.map((line) => (
            <li key={line} className="flex gap-3 text-[16px] leading-relaxed text-muted-foreground sm:text-[18px]">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {notes ? (
          <aside className="mt-8 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              Was du sagst
            </p>
            <p className="mt-1.5">{slide.say}</p>
          </aside>
        ) : null}

        {close ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={LOKAL_SALES.auditUrl}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Check starten
            </a>
            <a
              href={LOKAL_SALES.url}
              className="rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
            >
              Freischalten
            </a>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-3 pt-10">
          <button
            type="button"
            onClick={() => go(i - 1)}
            disabled={i === 0}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 disabled:opacity-30"
            aria-label="Zurück"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(i + 1)}
            disabled={i === last}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 disabled:opacity-30"
            aria-label="Weiter"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <a
              href={LOKAL_SALES.deckHref}
              download
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              PowerPoint
            </a>
            <Link to="/lokal" className="hover:text-foreground">
              /lokal
            </Link>
          </div>
        </div>
      </article>

      <p className="sr-only">
        Präsentation für Aura Lokal. {SITE_URL}/verkauf
      </p>
    </main>
  );
}
