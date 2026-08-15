import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Pulse } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { PREVIEW_ACTIVITY, WALKTHROUGH_NOTE, loc } from "@/lib/product-story";
import { trackTeaser } from "@/lib/teaser-track";

const ROSTER = [
  { name: "Atlas", role: "CEO", on: true },
  { name: "Vela", role: "Growth", on: true },
  { name: "Juno", role: "Customers", on: true },
  { name: "Orin", role: "Social", on: true },
  { name: "Ledger", role: "Finance", on: true },
];

export function OsPreview() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
        {de ? "Oberfläche" : "Operating interface"}
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[1.05] tracking-tight">
        {de ? "So sieht die Firma aus, wenn sie arbeitet." : "This is the company while it works."}
      </h2>
      <p className="mt-3 max-w-xl text-[13px] text-muted-foreground">
        {loc(locale, WALKTHROUGH_NOTE)}
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass rounded-[1.8rem] p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Aura OS</p>
          <p className="mt-2 text-lg font-semibold">{de ? "Deine Firma" : "Your company"}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: de ? "Umsatz" : "Revenue", v: "—" },
              { k: de ? "Ausgegeben" : "Spent", v: "—" },
              { k: de ? "Missionen" : "Missions", v: "—" },
              { k: de ? "Aufgaben" : "Tasks", v: "—" },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-2xl border border-border/40 bg-background/40 px-3 py-3"
              >
                <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {s.k}
                </dt>
                <dd className="mt-1 font-display text-2xl">{s.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] text-muted-foreground">
            {de
              ? "Zahlen bleiben leer, bis deine Firma echte Arbeit ablegt. Kein Demo-Theater."
              : "Figures stay empty until your company files real work. No demo theater."}
          </p>

          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {de ? "KI-Belegschaft" : "AI workforce"}
          </p>
          <ul className="mt-3 space-y-2">
            {ROSTER.map((a) => (
              <li
                key={a.name}
                className="flex items-center justify-between rounded-2xl border border-border/40 px-4 py-2.5"
              >
                <span className="flex items-center gap-2 text-[14px] font-semibold">
                  <Pulse /> {a.name}
                  <span className="text-[12px] font-normal text-muted-foreground">— {a.role}</span>
                </span>
                <span className="text-[11px] text-primary">{de ? "bereit" : "ready"}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-[1.8rem] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {de ? "Aktuelle Mission" : "Current mission"}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">
              {de ? "Hol 20 neue Kunden" : "Get 20 new customers"}
            </p>
            <p className="mt-3 text-[13px] text-muted-foreground">
              {de ? "0 / 20 — startet nach deiner Freigabe." : "0 / 20 — starts after you approve."}
            </p>
          </div>
          <div className="glass rounded-[1.8rem] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {de ? "So sieht Aktivität aus" : "What activity looks like"}
            </p>
            <ul className="mt-3 space-y-2 text-[14px] text-muted-foreground">
              {PREVIEW_ACTIVITY.map((line) => (
                <li key={line.en}>· {loc(locale, line)}</li>
              ))}
            </ul>
          </div>
          <Link
            to="/try"
            onClick={() => trackTeaser("cta_click", { placement: "home_os_preview_try" })}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-primary"
          >
            {de ? "Selber durchspielen" : "Walk it yourself"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
