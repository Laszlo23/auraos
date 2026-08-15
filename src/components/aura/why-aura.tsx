import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { useLocale } from "@/hooks/use-locale";
import {
  CASE_STUDY,
  COMPARE_LADDER,
  COMPARE_ROWS,
  INTEGRATIONS,
  IS_FOR,
  NOT_FOR,
  TRUST_CONTROLS,
  WALKTHROUGH_NOTE,
  loc,
} from "@/lib/product-story";
import { trackTeaser } from "@/lib/teaser-track";

export function ChatbotVsCompany({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocale();
  const de = locale === "de";
  const row = COMPARE_ROWS[0];
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        {de ? "Warum nicht einfach ChatGPT?" : "Why Aura instead of ChatGPT?"}
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
        {de ? "Chatbot vs. KI-Firma" : "Chatbot vs AI company"}
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.8rem] border border-border/40 bg-foreground/[0.03] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            ChatGPT
          </p>
          <p className="mt-3 text-[15px] leading-relaxed">{loc(locale, row.you)}</p>
        </article>
        <article className="glass rounded-[1.8rem] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Aura</p>
          <p className="mt-3 text-[15px] leading-relaxed">{loc(locale, row.aura)}</p>
          <p className="mt-4 text-[14px] text-muted-foreground">
            {de
              ? "CEO plant. Mitarbeiter führen aus. Die Firma merkt sich. Aktionen erzeugen Proof. Du gibst Geld und Öffentliches frei."
              : "CEO plans. Employees execute. The company remembers. Actions produce proof. You approve money and public actions."}
          </p>
        </article>
      </div>
      {compact ? (
        <Link
          to="/compare"
          onClick={() => trackTeaser("cta_click", { placement: "home_compare" })}
          className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-primary"
        >
          {de ? "Warum Aura — ganzer Vergleich" : "Why Aura — full comparison"}{" "}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <ol className="mt-10 flex flex-wrap items-center gap-2 text-[13px]">
          {COMPARE_LADDER.map((r, i) => (
            <li key={r.en} className="flex items-center gap-2">
              <span
                className={
                  i === COMPARE_LADDER.length - 1
                    ? "rounded-full bg-primary px-3 py-1 font-semibold text-primary-foreground"
                    : "rounded-full border border-border/40 px-3 py-1 text-muted-foreground"
                }
              >
                {loc(locale, r)}
              </span>
              {i < COMPARE_LADDER.length - 1 ? (
                <span className="text-muted-foreground">→</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function CompareTable() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
      <div className="space-y-4">
        {COMPARE_ROWS.map((r) => (
          <article
            key={r.id}
            className="grid gap-3 rounded-[1.6rem] border border-border/40 p-5 md:grid-cols-3"
          >
            <p className="font-semibold">{loc(locale, r.name)}</p>
            <p className="text-[13px] text-muted-foreground">{loc(locale, r.you)}</p>
            <p className="text-[13px]">{loc(locale, r.aura)}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 text-[13px] text-muted-foreground">
        {de
          ? "Kein „wir schlagen alle“. Aura sitzt auf der letzten Stufe: KI-Firma."
          : "Not a “we beat everyone” page. Aura sits at the last stage: AI company."}
      </p>
    </section>
  );
}

export function WhoItsFor() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-[1.8rem] border border-border/40 p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {de ? "Aura ist nichts für dich, wenn…" : "Aura isn’t for you if…"}
          </p>
          <ul className="mt-4 space-y-2 text-[14px] text-muted-foreground">
            {NOT_FOR.map((n) => (
              <li key={n.en}>· {loc(locale, n)}</li>
            ))}
          </ul>
        </article>
        <article className="glass rounded-[1.8rem] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            {de ? "Aura ist für dich, wenn…" : "Aura is for you if…"}
          </p>
          <p className="mt-4 text-[17px] leading-relaxed">{loc(locale, IS_FOR)}</p>
        </article>
      </div>
    </section>
  );
}

export function TrustControls() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        {de ? "Sicherheit & Vertrauen" : "Security & trust"}
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
        {de ? "Du bleibst immer in Kontrolle." : "You're always in control."}
      </h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST_CONTROLS.map((c) => (
          <article key={c.title.en} className="glass rounded-3xl p-5">
            <p className="font-semibold">{loc(locale, c.title)}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{loc(locale, c.body)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function IntegrationsStrip() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        {de ? "Integrationen" : "Integrations"}
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
        {de ? "Deine Firma hat schon Tools." : "Your company already has tools."}
      </h2>
      <p className="mt-3 max-w-xl text-[14px] text-muted-foreground">
        {de
          ? "Verbinde Aura damit. Was noch nicht live ist, steht als bald."
          : "Connect Aura to them. Anything not live is labeled coming soon."}
      </p>
      <ul className="mt-8 flex flex-wrap gap-2">
        {INTEGRATIONS.map((i) => (
          <li
            key={i.name}
            className="rounded-full border border-border/40 px-3 py-1.5 text-[12px] font-semibold"
          >
            {i.name}
            {i.status === "soon" ? (
              <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {de ? "bald" : "soon"}
              </span>
            ) : (
              <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                {de ? "live" : "live"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MissionCase() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        {loc(locale, CASE_STUDY.title)}
      </p>
      <h2 className="mt-3 max-w-3xl font-display text-[clamp(1.6rem,4vw,2.6rem)] leading-[1.1] tracking-tight">
        {loc(locale, CASE_STUDY.mission)}
      </h2>
      <p className="mt-3 text-[13px] text-muted-foreground">{loc(locale, WALKTHROUGH_NOTE)}</p>
      <ol className="mt-8 space-y-2">
        {CASE_STUDY.steps.map((s) => (
          <li key={s.en} className="rounded-2xl border border-border/40 px-4 py-3 text-[14px]">
            {loc(locale, s)}
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-4 text-[14px]">
        <p>
          <span className="text-muted-foreground">{de ? "Kosten" : "Cost"} · </span>
          {loc(locale, CASE_STUDY.cost)}
        </p>
        <p className="font-semibold">{loc(locale, CASE_STUDY.result)}</p>
      </div>
    </section>
  );
}
