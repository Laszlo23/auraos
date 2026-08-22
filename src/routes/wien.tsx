import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, ExternalLink, HeartHandshake, Megaphone, Star, Store, Users } from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import { LanguageToggle } from "@/components/aura/language-toggle";
import { SiteFooter } from "@/components/aura/site-footer";
import { isPublicShopListing, WienDirectory } from "@/components/aura/wien-directory";
import { LOCAL_COHORT_CAP } from "@/lib/funnels";
import { FOUNDERS } from "@/lib/legal-entity";
import { getLocalCohortScarcity } from "@/lib/reviews.functions";
import { getPublicLokalDirectory } from "@/lib/reviews.public.functions";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { REVIEW_APP_URL, reviewAppUrl, SITE_URL, url } from "@/lib/site";
import { WIEN_ORIGIN, WIEN_STICKERS, WIEN_VERTICALS } from "@/lib/wien-story";

const TITLE = "AURA Wien — 1.000 Betriebe, Nachbarschaft, Missionen";
const DESCRIPTION =
  "Das lokale AURA-Netzwerk in Wien: Betriebe mit Cover & Filter, Nachbarn, echte Reviews. Keine bezahlten Google-Sterne.";

const MISSIONS = [
  {
    icon: Compass,
    title: "Entdecken",
    body: "Stadt-Karte: finde einen Wiener Betrieb, checke ein, hinterlasse einen echten Besuch.",
    href: "/nachbar/entdecken" as const,
    cta: "Stadt-Karte",
  },
  {
    icon: HeartHandshake,
    title: "Echtes Feedback",
    body: "Nachbar-Note und Besuchserfahrung. Google bleibt unabhängig — nur nach echtem Erlebnis.",
    href: "/review" as const,
    cta: "Review-Maschine",
  },
  {
    icon: Megaphone,
    title: "Heute mitmachen",
    body: "Check-in, Stempel, Missionen — Community-Spiel ohne Business-Account.",
    href: "/nachbar/heute" as const,
    cta: "Nachbar Heute",
  },
  {
    icon: Users,
    title: "Freunde einladen",
    body: "Referral zahlt erst, wenn die eingeladene Person echte Aktivität abschließt.",
    href: "/nachbar/freunde" as const,
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
  loader: async () => {
    const { withTimeout } = await import("@/lib/timeout-helper");
    try {
      const rows = await withTimeout(getPublicLokalDirectory(), 5000, []);
      return { listings: Array.isArray(rows) ? rows : [] };
    } catch {
      return { listings: [] as Awaited<ReturnType<typeof getPublicLokalDirectory>> };
    }
  },
  component: WienHubPage,
});

function WienHubPage() {
  const initial = Route.useLoaderData();
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
    initialData: initial.listings,
    staleTime: 60_000,
  });
  const listings = Array.isArray(data) ? data : [];
  const shops = listings.filter(isPublicShopListing);
  const live = shops.length;
  const scarcity = useQuery({
    queryKey: ["local-cohort-scarcity"],
    queryFn: () => getLocalCohortScarcity(),
    staleTime: 60_000,
  });
  const remaining = scarcity.data?.remaining ?? Math.max(0, LOCAL_COHORT_CAP - live);
  const seatsTaken = scarcity.data?.taken ?? live;

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
            <a href="#betriebe" className="text-muted-foreground hover:text-foreground">
              Betriebe
            </a>
            <Link to="/nachbar/entdecken" className="text-muted-foreground hover:text-foreground">
              Stadt-Karte
            </Link>
            <Link to="/lokal" className="text-muted-foreground hover:text-foreground">
              Für Betriebe
            </Link>
            <Link to="/nachbar" className="text-muted-foreground hover:text-foreground">
              Nachbar
            </Link>
            <Link to="/team" className="text-muted-foreground hover:text-foreground">
              Crew
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-6 pb-6 pt-14 sm:pt-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
          Erste AURA-Ökonomie · 23 Bezirke
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.6rem,8vw,4.4rem)] font-semibold leading-[0.96] tracking-tight">
          1.000 Betriebe.
          <span className="block text-gold">Wien zuerst. Ned früher.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          Finde echte Läden — Cover, Bezirk, Niche. Dann als Nachbar einchecken. Oida, ned
          Fake-Sterne.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#betriebe"
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Betriebe entdecken
          </a>
          <Link
            to="/nachbar/entdecken"
            className="rounded-2xl border border-border/50 px-6 py-3 text-sm font-semibold"
          >
            Community-Karte
          </Link>
          <Link
            to="/lokal/audit"
            className="rounded-2xl border border-gold/40 bg-gold/10 px-6 py-3 text-sm font-semibold"
          >
            Betrieb prüfen
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
              Echte Karten — keine Demo-Namen
            </p>
          </Panel>
          <Panel label="Founding Local Seats">
            <p className="num text-3xl font-semibold text-primary">
              {seatsTaken.toLocaleString("de-AT")} / {LOCAL_COHORT_CAP.toLocaleString("de-AT")}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {remaining.toLocaleString("de-AT")} Plätze frei · bezahlt, keine Demos
            </p>
          </Panel>
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 py-6">
        <div className="overflow-hidden rounded-[1.8rem] border border-primary/30 bg-gradient-to-br from-primary/12 via-card/40 to-transparent p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Community
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            Nachbarn machen die Stadt lebendig
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
            Verzeichnis = Orientierung. Stadt-Karte = Spiel: Check-in, Stempel, Nachbar-Note. Beides
            gehört zusammen.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/nachbar/entdecken"
              className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              Stadt-Karte öffnen
            </Link>
            <Link
              to="/nachbar/heute"
              className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
            >
              Heute
            </Link>
            <Link
              to="/nachbar/freunde"
              className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
            >
              Freunde
            </Link>
            <Link
              to="/sticker"
              className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
            >
              Stickers
            </Link>
          </div>
        </div>
      </section>

      <section id="betriebe" className="relative mx-auto max-w-5xl scroll-mt-20 px-6 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Verzeichnis
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              Lokale Betriebe
            </h2>
            <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
              Suche, Bezirk, Niche — dann rein auf die öffentliche Karte oder als Nachbar
              einchecken.
            </p>
          </div>
          <Link to="/lokal" className="text-sm font-semibold text-primary">
            Deinen Betrieb eintragen →
          </Link>
        </div>

        {listings.length === 0 && !isLoading ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-foreground/[0.02] px-6 py-10">
            <p className="font-display text-xl font-semibold">Die erste Karte ist noch frei.</p>
            <p className="mt-2 max-w-lg text-[14px] text-muted-foreground">
              Keine erfundenen Läden. Wenn du einen Wiener Betrieb führst, starte mit dem Check.
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
          <WienDirectory listings={listings} isLoading={isLoading} remaining={remaining} />
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
          Belohnt wird nachweisbare Beteiligung — nicht Google-Sterne gegen Geld.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {MISSIONS.map((m) => (
            <Panel key={m.title} label={m.title}>
              <m.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{m.body}</p>
              <Link to={m.href} className="mt-4 inline-block text-sm font-semibold text-primary">
                {m.cta} →
              </Link>
            </Panel>
          ))}
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
                  loading="lazy"
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

      <section id="reviews" className="relative mx-auto max-w-5xl px-6 py-12">
        <Panel glow label="Review-Software">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                review.aibusiness.fun
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                Review-Anfragen nach echten Besuchen. Aura OS bleibt das OS — die Review-App das
                Spezialwerkzeug.
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
            </div>
          </div>
        </Panel>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 pb-10">
        <div className="rounded-3xl border border-border/40 bg-foreground/[0.03] px-6 py-6 sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Share (optional)
          </p>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Wien-Wave Clips und Stickers — nach dem Verzeichnis, nicht davor.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/share"
              className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
            >
              Share-Kit
            </Link>
            <Link
              to="/sticker"
              className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
            >
              Stickers
            </Link>
          </div>
        </div>
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
