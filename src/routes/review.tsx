import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { SiteFooter } from "@/components/aura/site-footer";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { REVIEW_APP_URL, reviewAppUrl, SITE_URL, url } from "@/lib/site";

const TITLE = "Aura Lokal Reviews — echte Feedback-Maschine";
const DESCRIPTION =
  "Die Review-Software für lokale Betriebe: Anfragen tracken, Antworten vorschlagen, keine Fake-Google-Sterne. Live unter review.aibusiness.fun.";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: url("/review") },
      ...ogCampaignMeta("review"),
    ],
    links: [{ rel: "canonical", href: url("/review") }],
  }),
  component: ReviewBridgePage,
});

function ReviewBridgePage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4">
          <Link
            to="/wien"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Wien
          </Link>
          <Link
            to="/lokal"
            className="ml-auto text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Aura Lokal
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Review machine
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.2rem,6vw,3.4rem)] font-semibold leading-[1.02] tracking-tight">
          Echte Besuche. Trackbare Anfragen.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Die Review-Software läuft eigenständig unter{" "}
          <a href={REVIEW_APP_URL} className="text-primary hover:underline">
            review.aibusiness.fun
          </a>
          . Aura OS verlinkt sie — wir mergen die Codebases nicht. Keine bezahlten Google-Sterne.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={REVIEW_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Review-App öffnen <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={reviewAppUrl("/anleitung")}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
          >
            Anleitung
          </a>
          <Link to="/lokal/audit" className="rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold">
            Kostenloser Check
          </Link>
        </div>
      </section>

      <SiteFooter
        share={{
          url: `${SITE_URL}/review`,
          text: "Aura Lokal Reviews — echte Feedback-Maschine für Wiener Betriebe.",
          placement: "review",
        }}
      />
    </main>
  );
}
