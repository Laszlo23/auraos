import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter } from "@/components/aura/site-footer";
import { LanguageToggle } from "@/components/aura/language-toggle";
import { FOUNDERS } from "@/lib/legal-entity";
import { OG_IMAGE, SITE_URL, url } from "@/lib/site";
import { WIEN_ORIGIN } from "@/lib/wien-story";
import { useLocale } from "@/hooks/use-locale";

const TITLE = "Wie’s zsamkemma is — AURA Wien";
const DESCRIPTION =
  "Ned in einem WeWork. In Wien. Die G’schicht hinter AURA Lokal, echten Besuchen, und 777.777.777 AURA.";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: url("/story") },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:locale", content: "de_AT" },
    ],
    links: [{ rel: "canonical", href: url("/story") }],
  }),
  component: StoryPage,
});

function StoryPage() {
  const { locale } = useLocale();
  const de = locale === "de";

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div className="austria-bar" aria-hidden />
      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Aura
          </Link>
          <LanguageToggle className="ml-auto" />
          <Link
            to="/wien"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Wien
          </Link>
        </div>
      </header>

      <article className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          {de ? WIEN_ORIGIN.kicker : WIEN_ORIGIN.kickerEn}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,3.8rem)] font-semibold leading-[0.98] tracking-tight">
          {de ? "Ned in einem WeWork." : "Not in a WeWork."}
          <span className="block text-[color:var(--austria-red)]">
            {de ? "In Wien." : "In Vienna."}
          </span>
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">
          {de ? WIEN_ORIGIN.lead : WIEN_ORIGIN.leadEn}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          {FOUNDERS.map((f) => (
            <Link key={f.id} to="/team" className="flex items-center gap-2">
              <img
                src={f.avatar}
                alt={f.name}
                className="h-12 w-12 rounded-2xl object-cover ring-1 ring-border/40"
              />
              <span className="text-[12px] font-semibold">{f.name}</span>
            </Link>
          ))}
        </div>

        <ol className="mt-14 space-y-12">
          {WIEN_ORIGIN.beats.map((b) => (
            <li key={b.no} className="scroll-mt-24 border-t border-border/40 pt-8">
              <p className="num text-[12px] font-semibold text-[color:var(--austria-red)]">
                {b.no}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {de ? b.title : b.titleEn}
              </h2>
              <p className="mt-3 text-[16px] leading-[1.7] text-foreground/90">
                {de ? b.de : b.en}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-14 border-l-2 border-[color:var(--austria-red)] pl-4 text-[17px] font-medium leading-relaxed">
          {de ? WIEN_ORIGIN.close : WIEN_ORIGIN.closeEn}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/wien"
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            Wien-Hub
          </Link>
          <Link
            to="/whitepaper"
            className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Whitepaper
          </Link>
          <Link
            to="/sticker"
            className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            Stickers
          </Link>
        </div>
      </article>

      <SiteFooter
        share={{
          url: `${SITE_URL}/story`,
          text: de
            ? "Wie’s zsamkemma is — AURA in Wien. Ned Fake-Sterne."
            : "How AURA came together — Vienna first. No fake stars.",
          placement: "story",
        }}
      />
    </main>
  );
}
