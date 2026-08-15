import { Link } from "@tanstack/react-router";

import { FOUNDERS } from "@/lib/legal-entity";
import { WIEN_ORIGIN } from "@/lib/wien-story";
import { useLocale } from "@/hooks/use-locale";

export function WienStoryStrip({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocale();
  const de = locale === "de";

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-14 sm:py-18">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
        {de ? WIEN_ORIGIN.kicker : WIEN_ORIGIN.kickerEn}
      </p>
      <h2 className="mt-3 max-w-3xl font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
        {de ? WIEN_ORIGIN.lead : WIEN_ORIGIN.leadEn}
      </h2>
      <ol className={`mt-8 grid gap-3 ${compact ? "sm:grid-cols-5" : "sm:grid-cols-5"}`}>
        {WIEN_ORIGIN.beats.map((b) => (
          <li key={b.no} className="rounded-3xl border border-border/40 bg-card/20 px-4 py-4">
            <p className="num text-[11px] font-semibold text-[color:var(--austria-red)]">{b.no}</p>
            <h3 className="mt-2 font-display text-[15px] font-semibold tracking-tight">
              {de ? b.title : b.titleEn}
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              {de ? b.de : b.en}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-6 max-w-2xl text-[15px] font-medium leading-relaxed">
        {de ? WIEN_ORIGIN.close : WIEN_ORIGIN.closeEn}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {FOUNDERS.slice(0, 5).map((f) => (
          <Link key={f.id} to="/team" className="flex items-center gap-2">
            <img
              src={f.avatar}
              alt=""
              className="h-9 w-9 rounded-xl object-cover ring-1 ring-border/40"
            />
            <span className="text-[12px] font-semibold">{f.name}</span>
          </Link>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/story"
          className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
        >
          {de ? "Die ganze G’schicht" : "The whole story"}
        </Link>
        <Link
          to="/wien"
          className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
        >
          Wien
        </Link>
        <Link
          to="/sticker"
          className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
        >
          Stickers
        </Link>
      </div>
    </section>
  );
}
