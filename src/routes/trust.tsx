import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

import { PublicSiteHeader } from "@/components/aura/public-site-header";
import { SiteFooter } from "@/components/aura/site-footer";
import { VerifyStrip } from "@/components/aura/verify-strip";
import { useLocale } from "@/hooks/use-locale";
import { BUILDING_CULTURE_PRODUCTS } from "@/lib/building-culture";
import { COVENANT_LINKS, COVENANT_PATH, COVENANT_PROMISES } from "@/lib/community-covenant";
import { SITE_URL, SOCIAL_LINKS, url } from "@/lib/site";
import { HOOKR } from "@/lib/hookr";

const TITLE = "Community covenant — how we show up | Aura OS";
const DESCRIPTION =
  "After Culture Coin was rugged by a former partner, we rebuild trust the only honest way: verify on-chain, ship in public, NFTs as keys not lottery tickets.";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Aura OS community covenant" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url(COVENANT_PATH) },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${COVENANT_PATH}` }],
  }),
  component: TrustPage,
});

function TrustPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  const x = SOCIAL_LINKS.find((s) => s.id === "x");

  return (
    <div className="min-h-svh bg-background">
      <PublicSiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            {de ? "Community-Bund" : "Community covenant"}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {de ? "Wir machen es mit Arbeit gut." : "We make it up by building."}
          </h1>
          <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
            {de
              ? "Building Cultures Culture Coin wurde von einem ehemaligen Partner gerugged. Die Community hat Schaden genommen. Wir können die Vergangenheit nicht löschen — wir können zeigen, dass Aura OS und TICKPIX anders gebaut sind: prüfbar, öffentlich, ohne DM-Theater."
              : "Building Culture’s Culture Coin was rugged by a former partner. The community got hurt. We can’t erase that chapter — we can prove Aura OS and TICKPIX are built differently: verifiable, public, no DM theater."}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/85">
            {de
              ? "Kein Pitch. Sechs Versprechen, an denen ihr uns messen könnt."
              : "Not a pitch. Six promises you can hold us to."}
          </p>
        </motion.div>

        <ol className="mt-10 space-y-5">
          {COVENANT_PROMISES.map((p, i) => (
            <li
              key={p.id}
              className="rounded-2xl border border-border/50 bg-foreground/[0.02] px-5 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-1 text-[17px] font-semibold">{de ? p.titleDe : p.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {de ? p.bodyDe : p.body}
              </p>
            </li>
          ))}
        </ol>

        <section className="mt-12">
          <VerifyStrip de={de} />
        </section>

        <section className="mt-8 rounded-2xl border border-border/40 px-5 py-5">
          <h2 className="text-[15px] font-semibold">
            {de ? "Offizielle Links" : "Official links"}
          </h2>
          <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
            <li>
              {de ? "Offizielle X:" : "Official X:"}{" "}
              {x ? (
                <a
                  href={x.href}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @buildingcultu3
                </a>
              ) : null}
            </li>
            <li>
              Hookr:{" "}
              <a
                href={HOOKR.siteUrl}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                hookr.fun
              </a>{" "}
              ·{" "}
              <a
                href={HOOKR.xUrl}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                @hookrfun
              </a>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {COVENANT_LINKS.slice(0, 9).map((l) => (
              <a
                key={l.href}
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1 rounded-full border border-border/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/80 hover:border-primary/40 hover:text-primary"
              >
                {l.label}
                {l.href.startsWith("http") ? <ExternalLink className="h-3 w-3" /> : null}
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-[15px] font-semibold">
            {de
              ? "Building Culture — was wir weiterbauen"
              : "Building Culture — what we keep building"}
          </h2>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {de
              ? "Aura OS ist das Betriebssystem. Culture ID, Pepe, World Cup OS und TICKPIX bleiben Kultur-Schichten — transparent verlinkt."
              : "Aura OS is the operating system. Culture ID, Pepe, World Cup OS, and TICKPIX stay culture layers — linked in the open."}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {BUILDING_CULTURE_PRODUCTS.map((p) => (
              <li key={p.id}>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-border/40 px-4 py-3 hover:border-primary/35"
                >
                  <p className="text-[13px] font-semibold">{de ? p.titleDe : p.title}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {de ? p.blurbDe : p.blurb}
                  </p>
                </a>
              </li>
            ))}
            <li>
              <Link
                to="/pit"
                className="block rounded-xl border border-border/40 px-4 py-3 hover:border-primary/35"
              >
                <p className="text-[13px] font-semibold">TICKPIX</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {de
                    ? "Kultur-Seats auf Robinhood Chain — Mint auf nft.aibusiness.fun"
                    : "Culture seats on Robinhood Chain — mint at nft.aibusiness.fun"}
                </p>
              </Link>
            </li>
          </ul>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            to="/share"
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            {de ? "Share-Kit öffnen" : "Open share kit"}
          </Link>
          <Link
            to="/community"
            className="rounded-2xl border border-border/60 px-5 py-3 text-sm font-semibold"
          >
            {de ? "Community" : "Community"}
          </Link>
          <a
            href={x?.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-border/60 px-5 py-3 text-sm font-semibold"
          >
            {de ? "Auf X folgen" : "Follow on X"} <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
