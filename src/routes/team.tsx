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
  TOKEN_PRODUCT_SEPARATION,
  legalAddressDisplay,
  url,
} from "@/lib/site";

const TITLE = `Team & company — ${SITE_NAME}`;
const DESCRIPTION =
  "Founding team for Aura OS / Building Culture LLC, company address, and clear separation from any BCC token.";

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
            <Link to="/impressum" className="text-muted-foreground hover:text-foreground">
              Impressum
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link to="/tokenomics" className="text-muted-foreground hover:text-foreground">
              Tokenomics
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Trust · {LEGAL_ENTITY}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,3.6rem)] font-semibold leading-[0.98] tracking-tight">
          Founders.
          <span className="block text-gold">Real names. Clear rails.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {SITE_NAME} is operated by {LEGAL_ENTITY}. Below is the founding roster, company contact,
          and an explicit disclaimer that the product does not run on a BCC token.
        </p>

        <section className="mt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Founding team
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {FOUNDERS.map((f, i) => (
              <article
                key={f.id}
                className="rounded-3xl border border-border/50 bg-card/20 px-5 py-5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Founder {i + 1}
                </p>
                <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">
                  {f.name ?? "To be announced"}
                </h2>
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
                  <p className="mt-4 text-[11px] text-muted-foreground/80">Profile coming soon</p>
                )}
              </article>
            ))}
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
          </p>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Token clarity
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            Aura OS ≠ BCC
          </h2>
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

      <SiteFooter />
    </main>
  );
}
