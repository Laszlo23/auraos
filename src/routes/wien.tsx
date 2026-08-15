import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, ExternalLink, HeartHandshake, MapPin, Megaphone, Star, Store, Users } from "lucide-react";

import { Chip, Panel, Shimmer } from "@/components/aura/primitives";
import { LanguageToggle } from "@/components/aura/language-toggle";
import { SiteFooter } from "@/components/aura/site-footer";
import { LOCAL_COHORT_CAP } from "@/lib/funnels";
import { FOUNDERS } from "@/lib/legal-entity";
import { getPublicLokalDirectory } from "@/lib/reviews.public.functions";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { REVIEW_APP_URL, reviewAppUrl, SITE_URL, url } from "@/lib/site";
import { sharePosterSrc, wienWavePosts } from "@/lib/share-posts";
import { formatShopAddress } from "@/lib/lokal-shops";
import { WIEN_ORIGIN, WIEN_STICKERS, WIEN_VERTICALS } from "@/lib/wien-story";

const TITLE = "AURA Wien — 1.000 Betriebe, Nachbarschaft, Missionen";
const DESCRIPTION =
  "Das lokale AURA-Netzwerk in Wien: Betriebe, Contributor-Missionen, echte Reviews und Community. Keine bezahlten Google-Sterne.";

const MISSIONS = [
  {
    icon: Compass,
    title: "Entdecken",
    body: "Finde einen Wiener Betrieb, checke ein, hinterlasse einen echten Besuch. Belohnt wird verifizierte Discovery — nicht eine Sterne-Kampagne.",
    href: "/nachbar",
    cta: "Nachbar werden",
  },
  {
    icon: HeartHandshake,
    title: "Echtes Feedback",
    body: "Umfragen und Besuchserfahrung für den Betrieb. Google-Reviews bleiben unabhängig und nur nach echtem Erlebnis.",
    href: "/review",
    cta: "Review-Maschine",
  },
  {
    icon: Megaphone,
    title: "Content",
    body: "Foto, Kurzstory, Empfehlung — Content, den der Betrieb wirklich nutzen kann. Qualität vor Volumen.",
    href: "/nachbar",
    cta: "Mitmachen",
  },
  {
    icon: Users,
    title: "Freunde einladen",
    body: "Referral zahlt erst, wenn die eingeladene Person echte Aktivität abschließt. Kein Endlos-MLM.",
    href: "/nachbar",
    cta: "Einladen",
  },
] as const;

export const Route = createFileRoute("/wien")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: url("/wien") },
      ...ogCampaignMeta("wien"),
      { property: "og:locale", content: "de_AT" },
    ],
    links: [{ rel: "canonical", href: url("/wien") }],
  }),
  component: WienHubPage,
});

function WienHubPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-lokal-directory"],
    queryFn: async () => {
      try {
        const rows = await getPublicLokalDirectory();
        return Array.isArray(rows) ? rows : [];
      } catch {
        return [];
      }
    },
  });
  const listings = Array.isArray(data) ? data : [];
  const live = listings.length;
  const remaining = Math.max(0, LOCAL_COHORT_CAP - live);

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 8% -8%, oklch(0.58 0.09 195 / 0.28), transparent 58%), radial-gradient(ellipse 50% 40% at 92% 8%, oklch(0.78 0.11 82 / 0.16), transparent 52%)",
        }}
      />

      <div className="austria-bar" aria-hidden />
      <header className="relative z-10 border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight">
            Aura <span className="text-muted-foreground">Wien</span>
          </Link>
          <LanguageToggle className="ml-auto" />
          <nav className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
            <Link to="/lokal" className="text-muted-foreground hover:text-foreground">
              Für Betriebe
            </Link>
            <Link to="/nachbar" className="text-muted-foreground hover:text-foreground">
              Nachbar
            </Link>
            <Link to="/team" className="text-muted-foreground hover:text-foreground">
              Crew
            </Link>
            <Link to="/sticker" className="text-muted-foreground hover:text-foreground">
              Stickers
            </Link>
            <Link
              to="/whitepaper"
              search={{ lang: "de" }}
              className="text-muted-foreground hover:text-foreground"
            >
              Whitepaper
            </Link>
            <a
              href={REVIEW_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              Reviews
            </a>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-6 pb-8 pt-14 sm:pt-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Erste AURA-Ökonomie · 23 Bezirke
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.6rem,8vw,4.4rem)] font-semibold leading-[0.96] tracking-tight">
          1.000 Betriebe.
          <span className="block text-gold">Wien zuerst. Ned früher.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          Betriebe, Nachbarn, Missionen. Echte Besuche — oida, ned Fake-Sterne. Wenn’s zwischen
          Ottakring und dem 7. funktioniert, darf’s die Stadt verlassen.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/lokal/audit"
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Betrieb prüfen
          </Link>
          <Link
            to="/nachbar"
            className="rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
          >
            Contributor werden
          </Link>
          <a
            href={REVIEW_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-6 py-3 text-sm font-semibold"
          >
            Review-App <ExternalLink className="h-4 w-4" />
          </a>
          <Link
            to="/sticker"
            className="rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
          >
            Sticker-Pack
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {WIEN_VERTICALS.map((v) => (
            <Chip key={v} tone={v === "23 Bezirke" ? "gold" : "neutral"}>
              {v}
            </Chip>
          ))}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Panel label="Ziel">
            <p className="num text-3xl font-semibold text-gold">
              {LOCAL_COHORT_CAP.toLocaleString("de-AT")}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">Betriebe in Wien</p>
          </Panel>
          <Panel label="Live im Verzeichnis">
            <p className="num text-3xl font-semibold">{live}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Öffentliche Karten — keine Demo-Namen
            </p>
          </Panel>
          <Panel label="Offene Plätze">
            <p className="num text-3xl font-semibold text-primary">
              {remaining.toLocaleString("de-AT")}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">Erste Kohorte, Founder-Jahr</p>
          </Panel>
        </div>

        <div className="mt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Wien wave · Schmäh with love
          </p>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Kein Urteil. Nur jetzt. Schau, teil mit an Nachbarn, sie schauen weiter.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {wienWavePosts().map((p) => (
              <Link
                key={p.id}
                to="/v/$postId"
                params={{ postId: p.id }}
                className="group overflow-hidden rounded-2xl border border-border/40 bg-white/[0.03]"
              >
                <img
                  src={sharePosterSrc(p.file)}
                  alt={p.title}
                  width={360}
                  height={640}
                  className="aspect-[9/16] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="block px-2.5 py-2 text-[11px] font-semibold leading-snug">
                  {p.title}
                </span>
              </Link>
            ))}
          </div>
          <Link
            to="/share"
            className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
          >
            Share-Kit öffnen →
          </Link>
        </div>
      </section>

      <section id="origin" className="relative mx-auto max-w-5xl px-6 py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {WIEN_ORIGIN.kicker}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          {WIEN_ORIGIN.lead}
        </h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-5">
          {WIEN_ORIGIN.beats.map((b) => (
            <li key={b.no} className="rounded-3xl border border-border/40 bg-card/20 px-4 py-4">
              <p className="num text-[11px] font-semibold text-gold">{b.no}</p>
              <h3 className="mt-2 font-display text-[15px] font-semibold tracking-tight">
                {b.title}
              </h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{b.de}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 max-w-2xl text-[14px] font-medium leading-relaxed">
          {WIEN_ORIGIN.close}
        </p>
      </section>

      <section id="crew" className="relative mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Gründungsteam
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Die Crew</h2>
          </div>
          <Link to="/team" className="text-sm font-semibold text-primary">
            Ganze Story →
          </Link>
        </div>
        <ul className="mt-5 flex flex-wrap gap-4">
          {FOUNDERS.map((f) => (
            <li key={f.id} className="w-[7.5rem]">
              <Link
                {...(f.shopSlug
                  ? { to: "/b/$slug" as const, params: { slug: f.shopSlug } }
                  : { to: "/team" as const })}
                className="block"
              >
                <img
                  src={f.avatar}
                  alt={f.name}
                  width={512}
                  height={512}
                  className="h-[7.5rem] w-[7.5rem] rounded-2xl object-cover ring-1 ring-border/40"
                />
                <p className="mt-2 text-[13px] font-semibold">{f.name}</p>
                {f.lastNamePending ? (
                  <p className="text-[10px] text-muted-foreground">Nachname folgt</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">{f.title}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/sticker"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          {WIEN_STICKERS.drop} · {WIEN_STICKERS.name} →
        </Link>
      </section>

      <section id="betriebe" className="relative mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Verzeichnis
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              Lokale Betriebe
            </h2>
          </div>
          <Link to="/lokal" className="text-sm font-semibold text-primary">
            Deinen Betrieb eintragen →
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Shimmer className="h-36" />
            <Shimmer className="h-36" />
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-border/60 bg-foreground/[0.02] px-6 py-10">
            <p className="font-display text-xl font-semibold">Die erste Karte ist noch frei.</p>
            <p className="mt-2 max-w-lg text-[14px] text-muted-foreground">
              Keine erfundenen Läden. Wenn du einen Wiener Betrieb führst, starte mit dem Check —
              oder öffne die Review-Maschine und lade echte Gäste ein.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/lokal/audit"
                className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                Kostenloser Check
              </Link>
              <a
                href={reviewAppUrl("/anleitung")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
              >
                Review-Anleitung
              </a>
            </div>
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {listings.map((b) => {
              const address = formatShopAddress(b);
              return (
              <li key={b.slug} className={b.featured ? "sm:col-span-2" : undefined}>
                <Link
                  to="/b/$slug"
                  params={{ slug: b.slug }}
                  className={`block overflow-hidden rounded-3xl border bg-card/30 transition-colors hover:border-primary/40 ${
                    b.featured ? "border-gold/40" : "border-border/40"
                  }`}
                >
                  {b.cover_url ? (
                    <img src={b.cover_url} alt="" className="h-36 w-full object-cover" />
                  ) : null}
                  <div className="flex items-start gap-3 p-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-foreground/[0.04] text-lg">
                      {b.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold tracking-tight">
                          {b.name}
                        </h3>
                        {b.featured ? <Chip tone="gold">Wien zuerst</Chip> : null}
                        {b.local_cohort_number ? (
                          <Chip tone="gold">#{b.local_cohort_number}</Chip>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                        {[b.district || b.city, b.niche].filter(Boolean).join(" · ") || "Wien"}
                      </p>
                      {address ? (
                        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {address}
                        </p>
                      ) : null}
                      {b.tagline ? (
                        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                          {b.tagline}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
              );
            })}
            {remaining > 0 ? (
              <li className="rounded-3xl border border-dashed border-border/50 bg-foreground/[0.02] p-5">
                <Store className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-display text-lg font-semibold">Dein Betrieb hier</h3>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {remaining.toLocaleString("de-AT")} Plätze in der ersten Wiener Kohorte.
                </p>
                <Link to="/lokal" className="mt-4 inline-block text-sm font-semibold text-primary">
                  Mitmachen →
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <section id="missionen" className="relative mx-auto max-w-5xl px-6 py-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Contributor
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          Missionen, die der Stadt nützen
        </h2>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
          Belohnt wird nachweisbare Beteiligung: Discovery, Umfragen, Content, Referral nach echter
          Nutzung. Nicht: Google-Sterne gegen Geld.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {MISSIONS.map((m) => (
            <Panel key={m.title} label={m.title}>
              <m.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{m.body}</p>
              {m.href === "/review" ? (
                <Link to="/review" className="mt-4 inline-block text-sm font-semibold text-primary">
                  {m.cta} →
                </Link>
              ) : (
                <Link
                  to="/nachbar"
                  className="mt-4 inline-block text-sm font-semibold text-primary"
                >
                  {m.cta} →
                </Link>
              )}
            </Panel>
          ))}
        </div>
      </section>

      <section id="reviews" className="relative mx-auto max-w-5xl px-6 py-12">
        <Panel glow label="Review-Software">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                review.aibusiness.fun
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                Eigene Maschine auf dem Server: Review-Anfragen nach echten Besuchen,
                Antwortvorschläge, Anleitung. Öffentliche Karten unter{" "}
                <span className="text-foreground">/r/:businessId</span>. Aura OS bleibt das OS — die
                Review-App bleibt das Spezialwerkzeug.
              </p>
              <ul className="mt-4 space-y-1.5 text-[13px] text-muted-foreground">
                <li className="flex gap-2">
                  <Star className="mt-0.5 h-3.5 w-3.5 text-gold" />
                  Keine Fake-Reviews, keine bezahlten Google-Sterne
                </li>
                <li className="flex gap-2">
                  <Store className="mt-0.5 h-3.5 w-3.5 text-primary" />
                  Founder-Jahr für die ersten 1.000 Betriebe
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={REVIEW_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                App öffnen <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href={reviewAppUrl("/anleitung")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-border/50 px-5 py-2.5 text-center text-xs font-semibold"
              >
                Anleitung
              </a>
              <a
                href={reviewAppUrl("/blog")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-border/50 px-5 py-2.5 text-center text-xs font-semibold"
              >
                Blog
              </a>
            </div>
          </div>
        </Panel>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-3xl border border-border/40 bg-foreground/[0.03] px-6 py-8 sm:px-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Wirtschaftsschicht: AURA
          </h2>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            Fiat zuerst, dann Fiat + AURA, dann AURA-first. 777.777.777 Token, Community-Anteil 30%.
            Kein Contract vor dem Fair Launch.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/whitepaper"
              search={{ lang: "de" }}
              className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              Whitepaper
            </Link>
            <Link
              to="/tokenomics"
              className="rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
            >
              Tokenomics & Kaufplan
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter
        share={{
          url: `${SITE_URL}/wien`,
          text: "AURA Wien — 1.000 Betriebe, echte Missionen, keine Fake-Sterne.",
          placement: "wien",
        }}
      />
    </main>
  );
}
