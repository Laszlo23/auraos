import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Chip } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { interpretBusiness, ONBOARD_EXAMPLES } from "@/lib/onboard-brief";
import { WALKTHROUGH_NOTE, loc } from "@/lib/product-story";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

export function TryAura({ standalone = false }: { standalone?: boolean }) {
  const { locale } = useLocale();
  const de = locale === "de";
  const [prompt, setPrompt] = useState(ONBOARD_EXAMPLES[0]);
  const [step, setStep] = useState(0);
  const brief = useMemo(() => interpretBusiness(prompt), [prompt]);
  const companyName =
    brief.city && (brief.name === brief.industry || brief.name === "Hospitality")
      ? `${brief.city} ${brief.industry === "Hospitality" ? (de ? "Restaurant" : "Restaurant") : brief.industry}`
      : brief.name;
  const mission =
    brief.missions[0] ?? (de ? "Hol 20 neue Kunden." : "Get 20 new customers this month.");

  return (
    <section
      className={cn(
        "relative z-10 mx-auto max-w-6xl px-6",
        standalone ? "py-10" : "py-16 sm:py-20",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Try Aura</p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
        {de ? "Sag, was deine Firma macht." : "Tell us what your company does."}
      </h2>
      <p className="mt-3 max-w-xl text-[14px] text-muted-foreground">
        {loc(locale, WALKTHROUGH_NOTE)}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass rounded-[1.8rem] p-5 sm:p-6">
          {step === 0 ? (
            <>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {de ? "Dein Satz" : "Your sentence"}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="mt-3 w-full resize-none rounded-2xl bg-foreground/6 px-4 py-3 text-[15px] outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {ONBOARD_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="rounded-full border border-border/40 px-3 py-1 text-[11px] text-muted-foreground hover:border-primary/40"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  trackTeaser("cta_click", { placement: "try_generate" });
                  setStep(1);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                {de ? "Firma zeigen" : "Show my company"} <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                {de ? "Deine Firma" : "Your company"}
              </p>
              <h3 className="mt-2 font-display text-3xl font-semibold">{companyName}</h3>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {brief.industry}
                {brief.city ? ` · ${brief.city}` : ""}
              </p>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {de ? "Belegschaft" : "Employees"}
              </p>
              <ul className="mt-3 space-y-2">
                {brief.roles.map((r) => (
                  <li
                    key={r.key}
                    className="rounded-2xl border border-border/40 bg-background/40 px-4 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-primary">
                      {r.title}
                    </p>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-[13px] text-muted-foreground">{r.blurb}</p>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                {de ? "Mission geben" : "Give a mission"} <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                {de ? "Mission" : "Give your company a mission"}
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold">{mission}</h3>
              <ol className="mt-6 space-y-2">
                {brief.planSteps.map((s, i) => (
                  <li
                    key={s}
                    className="flex gap-3 rounded-2xl border border-border/40 bg-background/40 px-4 py-3"
                  >
                    <span className="font-display text-gold">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[14px]">{s}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip tone="gold">
                  {de ? "Geschätzt" : "Estimated"} · {brief.kpi}
                </Chip>
                <Chip>{de ? "Freigabe nötig" : "Approval required"}</Chip>
              </div>
              <p className="mt-6 text-[15px] font-semibold">
                {de ? "Das kaufst du." : "This is what you're buying."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/access"
                  onClick={() => trackTeaser("cta_click", { placement: "try_wake_seat" })}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  {de ? "Firma wecken — $99" : "Wake your company — $99"}{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
                >
                  {de ? "Anderen Satz" : "Try another sentence"}
                </button>
              </div>
            </>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-[1.8rem] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {de ? "Danach" : "Then"}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed">
              {de
                ? "Founding Seat $99 einmalig. Abo und Compute extra. Kein Fake-Umsatz in diesem Walkthrough."
                : "Founding seat $99 one-time. Subscription and compute stay separate. This walkthrough invents no revenue."}
            </p>
            {!standalone ? (
              <Link
                to="/try"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary"
              >
                {de ? "Volle Try-Aura-Seite" : "Open the full Try Aura page"}{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
