import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { SiteFooter } from "@/components/aura/site-footer";
import {
  BCC_TOKEN_DISCLAIMER,
  FOUNDERS,
  LEGAL_ADDRESS,
  LEGAL_EMAIL,
  LEGAL_ENTITY,
  OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  TOKEN_PRODUCT_SEPARATION,
  legalAddressDisplay,
  url,
} from "@/lib/site";
import { WIEN_ORIGIN, WIEN_STICKERS } from "@/lib/wien-story";

const TITLE = `Gründungsteam Wien — ${SITE_NAME}`;
const DESCRIPTION =
  "Laszlo Bihary, Martina Hammer, Darco, Evreen, Martin. Wie AURA in Wien zsamkemma is — und warum keine Fake-Sterne.";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url("/team") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url("/team") }],
  }),
  component: TeamPage,
});

function TeamPage() {
  const addressLines = legalAddressDisplay();

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% -10%, oklch(0.72 0.12 85 / 0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 0%, oklch(0.55 0.1 200 / 0.18), transparent 50%)",
        }}
      />

      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Home
          </Link>
          <nav className="ml-auto flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
            <Link to="/wien" className="text-muted-foreground hover:text-foreground">
              Wien
            </Link>
            <Link to="/sticker" className="text-muted-foreground hover:text-foreground">
              Stickers
            </Link>
            <Link to="/impressum" className="text-muted-foreground hover:text-foreground">
              Impressum
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Gründungsteam Wien · {LEGAL_ENTITY}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,3.6rem)] font-semibold leading-[0.98] tracking-tight">
          Fünf Gesichter.
          <span className="block text-gold">Eine Stadt.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {SITE_NAME} wird von {LEGAL_ENTITY} betrieben. Unten das Gründungsteam — echte Vornamen,
          Nachnamen wo schon da. Impressum bleibt bei Laszlo. Stickers sind Drop 0 der Collection,
          kein Token-Sale.
        </p>

        <section className="mt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Crew
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {FOUNDERS.map((f) => (
              <article
                key={f.id}
                className="rounded-3xl border border-border/50 bg-card/20 px-5 py-5"
              >
                <img
                  src={f.avatar}
                  alt=""
                  width={512}
                  height={512}
                  className="h-28 w-28 rounded-2xl object-cover ring-1 ring-border/40"
                />
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {f.title}
                </p>
                <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">{f.name}</h2>
                {f.lastNamePending ? (
                  <p className="mt-1 text-[11px] text-muted-foreground/80">Nachname folgt</p>
                ) : null}
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{f.blurb}</p>
                {f.linkedin ? (
                  <a
                    href={f.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
                  >
                    LinkedIn <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-4 text-[11px] text-muted-foreground/80">Profil folgt</p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section id="origin" className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {WIEN_ORIGIN.kicker}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {WIEN_ORIGIN.kickerEn}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {WIEN_ORIGIN.lead}
          </p>
          <ol className="mt-6 space-y-5">
            {WIEN_ORIGIN.beats.map((b) => (
              <li key={b.no} className="border-t border-border/40 pt-5">
                <p className="num text-[11px] font-semibold text-gold">{b.no}</p>
                <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
                  {b.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{b.de}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/70">{b.en}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-l-2 border-primary/50 pl-4 text-[15px] font-medium leading-relaxed">
            {WIEN_ORIGIN.close}
          </p>
        </section>

        <section className="mt-14 rounded-3xl border border-border/40 bg-foreground/[0.03] px-5 py-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {WIEN_STICKERS.drop}
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">
            {WIEN_STICKERS.name}
          </h2>
          <p className="mt-2 text-[13px] text-muted-foreground">{WIEN_STICKERS.blurb}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/sticker"
              className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              Sticker-Pack
            </Link>
            <Link
              to="/wien"
              className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
            >
              Wien-Hub
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Company
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {LEGAL_ADDRESS.entity}
          </h2>
          <div className="mt-5 rounded-3xl border border-border/50 bg-foreground/[0.03] px-5 py-5 text-[14px] leading-relaxed text-muted-foreground">
            {addressLines.map((line) => (
              <p key={line} className="mt-1 first:mt-0">
                {line.startsWith("Registered") || line.includes("@") ? (
                  line.includes("@") ? (
                    <a className="text-primary hover:underline" href={`mailto:${LEGAL_EMAIL}`}>
                      {line}
                    </a>
                  ) : (
                    line
                  )
                ) : (
                  <span className="text-foreground">{line}</span>
                )}
              </p>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Full Impressum:{" "}
            <Link to="/impressum" className="text-primary hover:underline">
              /impressum
            </Link>
            . Nur Laszlo ist inhaltlich verantwortlich.
          </p>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Token clarity
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Aura OS ≠ BCC</h2>
          <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
            {BCC_TOKEN_DISCLAIMER}
          </p>
          <ul className="mt-5 space-y-2 text-[13px] leading-relaxed text-muted-foreground">
            {TOKEN_PRODUCT_SEPARATION.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <SiteFooter
        share={{
          url: `${SITE_URL}/team`,
          text: "Gründungsteam Wien — Laszlo, Martina, Darco, Evreen, Martin. Wie’s zsamkemma is.",
          placement: "team",
        }}
      />
    </main>
  );
}
