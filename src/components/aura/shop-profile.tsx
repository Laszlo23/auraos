import { Link } from "@tanstack/react-router";
import {
  Calendar,
  ExternalLink,
  Footprints,
  MapPin,
  Phone,
  Share2,
  Star,
  Store,
  X,
} from "lucide-react";
import { useState } from "react";

import { NachbarNotePips } from "@/components/aura/nachbar-note";
import { Chip, Pulse } from "@/components/aura/primitives";
import { ShopCatalogAndBook } from "@/components/aura/shop-book";
import { ShareBar } from "@/components/aura/share";
import { timeAgoDe } from "@/lib/format";
import {
  checkinQrUrl,
  editorialForSlug,
  formatShopAddress,
  mapsEmbedUrl,
  mapsSearchUrl,
  telHref,
} from "@/lib/lokal-shops";
import type {
  PublicLocalBusiness,
  PublicShopGalleryItem,
} from "@/lib/reviews.public.functions";
import { REVIEW_APP_URL, SITE_URL, url } from "@/lib/site";

const ATMOSPHERE = "/funnels/lokal-hero.jpg";

export function ShopProfile({ shop }: { shop: PublicLocalBusiness }) {
  const address = formatShopAddress(shop);
  const place = [shop.district, shop.postal_code, shop.city].filter(Boolean).join(" · ");
  const shareUrl = url(`/b/${shop.slug}`);
  const shareText = [shop.name, shop.tagline || place].filter(Boolean).join(" — ");
  const mapQuery = address || [shop.name, shop.city].filter(Boolean).join(" ");
  const checkinHref = shop.nachbar_checkin_code
    ? `${SITE_URL}/nachbar/c/${shop.nachbar_checkin_code}`
    : null;

  return (
    <div className="relative pb-24 lg:pb-0">
      <Hero shop={shop} address={address} place={place} />

      <div className="relative mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:px-8">
        <div className="min-w-0 space-y-5">
          <HowItWorks slug={shop.slug} />
          <ShopGallery items={shop.gallery} shopName={shop.name} />
          <ShopCatalogAndBook shop={shop} />
          <NachbarProof shop={shop} checkinHref={checkinHref} />
          <Feed shop={shop} />
          <VisitStrip shop={shop} address={address} mapQuery={mapQuery} />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <ActionRail shop={shop} shareUrl={shareUrl} shareText={shareText} stacked />
            <ShareBar
              url={shareUrl}
              text={shareText}
              title={shop.name}
              placement="shop-profile"
              compact
            />
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/90 px-3 py-2 backdrop-blur-xl lg:hidden">
        <ActionRail shop={shop} shareUrl={shareUrl} shareText={shareText} />
      </div>
    </div>
  );
}

function Hero({
  shop,
  address,
  place,
}: {
  shop: PublicLocalBusiness;
  address: string | null;
  place: string;
}) {
  const atmosphere = shop.cover_url || ATMOSPHERE;
  const usingCover = Boolean(shop.cover_url);

  return (
    <section className="relative isolate min-h-[72svh] overflow-hidden">
      <img
        src={atmosphere}
        alt={usingCover ? shop.name : ""}
        aria-hidden={!usingCover}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: usingCover
            ? "linear-gradient(180deg, oklch(0.16 0.02 240 / 0.18) 0%, oklch(0.14 0.02 240 / 0.45) 48%, oklch(0.12 0.02 240 / 0.88) 100%)"
            : "linear-gradient(180deg, oklch(0.16 0.02 240 / 0.35) 0%, oklch(0.14 0.02 240 / 0.72) 42%, oklch(0.13 0.02 240 / 0.96) 100%)",
        }}
      />
      <div className="relative mx-auto flex min-h-[72svh] max-w-6xl flex-col justify-end px-5 pb-12 pt-28 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-gold">
          {[place || shop.city, shop.niche].filter(Boolean).join(" · ") || "Lokaler Betrieb"}
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.8rem,9vw,6.2rem)] font-semibold leading-[0.9] tracking-tight text-white">
          {shop.name}
        </h1>
        {shop.tagline ? (
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/80">{shop.tagline}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          {shop.owner_display_name ? (
            <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-2 py-1.5 pr-4">
              {shop.owner_avatar ? (
                <img
                  src={shop.owner_avatar}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sm">
                  {shop.emoji}
                </span>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  {editorialForSlug(shop.slug)?.ownerLabel ?? "Vor Ort"}
                </p>
                <p className="text-sm font-medium text-white">{shop.owner_display_name}</p>
              </div>
            </div>
          ) : null}
          {address ? (
            <p className="flex items-center gap-2 text-sm text-white/75">
              <MapPin className="h-4 w-4 text-gold" />
              {address}
            </p>
          ) : null}
          {shop.local_cohort_number ? (
            <Chip tone="gold">Wien #{shop.local_cohort_number}</Chip>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ActionRail({
  shop,
  shareUrl,
  shareText,
  stacked = false,
}: {
  shop: PublicLocalBusiness;
  shareUrl: string;
  shareText: string;
  stacked?: boolean;
}) {
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: shop.name, text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* cancelled */
    }
  };

  const editorial = editorialForSlug(shop.slug);
  const items = [
    shop.booking_url
      ? {
          key: "book",
          href: shop.booking_url,
          external: true,
          label: "Termin",
          icon: Calendar,
        }
      : shop.homepage_url
        ? {
            key: "web",
            href: shop.homepage_url,
            external: true,
            label: editorial?.webLabel ?? "Web",
            icon: ExternalLink,
          }
        : null,
    ...(editorial?.socials ?? []).map((s, i) => ({
      key: `social-${i}`,
      href: s.href,
      external: true as const,
      label: s.label,
      icon: ExternalLink,
    })),
    shop.phone
      ? { key: "tel", href: telHref(shop.phone), external: true, label: "Anrufen", icon: Phone }
      : null,
    shop.nachbar_checkin_code
      ? {
          key: "in",
          to: "/nachbar/c/$code" as const,
          params: { code: shop.nachbar_checkin_code },
          label: "Check-in",
          icon: Footprints,
        }
      : {
          key: "nb",
          to: "/auth" as const,
          search: { mode: "signup" as const, next: "/nachbar/heute", lang: "de" as const },
          label: "Nachbar",
          icon: Footprints,
        },
    shop.google_review_url
      ? {
          key: "g",
          href: shop.google_review_url,
          external: true,
          label: "Google",
          icon: Star,
        }
      : null,
    { key: "share", onClick: share, label: "Teilen", icon: Share2 },
  ].filter(Boolean) as {
    key: string;
    href?: string;
    external?: boolean;
    to?: "/nachbar/c/$code" | "/auth";
    params?: { code: string };
    search?: { mode: "signup"; next: string; lang: "de" };
    onClick?: () => void;
    label: string;
    icon: typeof Phone;
  }[];

  const btn = stacked
    ? "flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-card/50 px-4 py-3 text-sm font-semibold hover:border-primary/40"
    : "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]";

  return (
    <nav className={stacked ? "space-y-2" : "flex items-stretch gap-1"} aria-label="Handlungen">
      {items.map((item) => {
        const Icon = item.icon;
        const inner = (
          <>
            <Icon className={stacked ? "h-4 w-4 text-primary" : "h-5 w-5 text-primary"} />
            {item.label}
          </>
        );
        if (item.onClick) {
          return (
            <button key={item.key} type="button" onClick={item.onClick} className={btn}>
              {inner}
            </button>
          );
        }
        if (item.href) {
          return (
            <a
              key={item.key}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className={btn}
            >
              {inner}
            </a>
          );
        }
        if (item.to === "/nachbar/c/$code" && item.params) {
          return (
            <Link key={item.key} to="/nachbar/c/$code" params={item.params} className={btn}>
              {inner}
            </Link>
          );
        }
        return (
          <Link
            key={item.key}
            to="/auth"
            search={item.search ?? { mode: "signup", next: "/nachbar/heute", lang: "de" }}
            className={btn}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

function ShopGallery({
  items,
  shopName,
}: {
  items: PublicShopGalleryItem[];
  shopName: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!items.length) return null;
  const open = openIdx != null ? items[openIdx] : null;

  return (
    <section className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        So sieht&apos;s aus
      </p>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="group relative h-44 w-64 shrink-0 overflow-hidden rounded-[1.4rem] border border-border/40 bg-card/30 text-left"
          >
            <img
              src={item.url}
              alt={item.caption || `${shopName} Foto ${i + 1}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
            {item.caption ? (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-[12px] font-medium text-white">
                {item.caption}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {open ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpenIdx(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpenIdx(null);
          }}
        >
          <button
            type="button"
            aria-label="Schließen"
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-2 text-white"
            onClick={() => setOpenIdx(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={open.url}
            alt={open.caption || shopName}
            className="max-h-[88vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {open.caption ? (
            <p className="absolute bottom-6 left-1/2 max-w-lg -translate-x-1/2 text-center text-sm text-white/85">
              {open.caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function NachbarProof({
  shop,
  checkinHref,
}: {
  shop: PublicLocalBusiness;
  checkinHref: string | null;
}) {
  if (!checkinHref || !shop.nachbar_checkin_code) return null;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-primary/30 bg-card/40">
      <div className="grid gap-5 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <img
          src={checkinQrUrl(checkinHref)}
          alt="Check-in QR"
          width={180}
          height={180}
          className="mx-auto rounded-2xl bg-white p-2"
        />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            Echte Nachbarn
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {shop.checkin_count === 0
              ? "Sei der erste Nachbar"
              : `${shop.checkin_count} echte Check-ins`}
          </h2>
          <NachbarNotePips
            className="mt-2"
            avg={shop.nachbar_rating_avg}
            count={shop.nachbar_rating_count}
          />
          <p className="mt-2 text-[14px] text-muted-foreground">
            Code {shop.nachbar_checkin_code} — scannen oder tippen. Kein Theater, nur der Besuch.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/nachbar/c/$code"
              params={{ code: shop.nachbar_checkin_code }}
              className="inline-flex rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Jetzt einchecken
            </Link>
            <a
              href={checkinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-2xl border border-border/50 px-4 py-2.5 text-sm font-semibold"
            >
              QR öffnen
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ slug }: { slug: string }) {
  const custom = editorialForSlug(slug)?.howSteps;
  const steps = (custom ?? [
    { title: "Besuch", body: "Komm vorbei. Echter Laden, echte Zeit." },
    { title: "Check-in", body: "QR scannen — du wirst Nachbar." },
    { title: "Google", body: "Optional, ohne Belohnung für Sterne." },
  ]).map((s, i) => ({
    n: String(i + 1).padStart(2, "0"),
    t: s.title,
    d: s.body,
  }));
  return (
    <section className="rounded-[2rem] border border-border/40 bg-card/25 p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        So läuft’s hier
      </p>
      <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
        Diese Seite ist die öffentliche Heimat. Socials und Reviews laufen darüber — oida, ned
        Fake-Sterne.{" "}
        <a href={REVIEW_APP_URL} className="font-semibold text-primary" target="_blank" rel="noreferrer">
          Review-Maschine
        </a>
      </p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="rounded-2xl border border-border/40 bg-background/40 p-4">
            <p className="font-display text-2xl text-gold">{s.n}</p>
            <p className="mt-1 font-semibold">{s.t}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ol>
      {editorialForSlug(slug)?.socials?.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {editorialForSlug(slug)!.socials!.map((s) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-border/50 bg-background/50 px-4 py-2 text-xs font-semibold hover:border-primary/40"
            >
              {s.label}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Feed({ shop }: { shop: PublicLocalBusiness }) {
  return (
    <section className="space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        Im Laden
      </p>

      <article className="rounded-[2rem] border border-gold/25 bg-gradient-to-br from-gold/10 via-card/30 to-transparent p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Geschichte</p>
        <p className="mt-3 font-display text-[1.35rem] leading-snug tracking-tight sm:text-[1.6rem]">
          {shop.story}
        </p>
      </article>

      {shop.recent_checkins.map((c) => (
        <article
          key={c.id}
          className="flex items-center gap-3 rounded-[1.6rem] border border-border/40 bg-card/30 px-5 py-4"
        >
          <Pulse />
          <div>
            <p className="text-sm font-semibold">Ein Nachbar hat eingecheckt</p>
            <p className="text-[12px] text-muted-foreground">{timeAgoDe(c.at)}</p>
          </div>
        </article>
      ))}

      {shop.posts.map((p) => (
        <article key={p.id} className="rounded-[1.6rem] border border-border/40 bg-card/30 p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {p.provider}
            {p.published_at ? ` · ${timeAgoDe(p.published_at)}` : ""}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed">{p.body}</p>
        </article>
      ))}

      {shop.invite_count > 0 ? (
        <article className="rounded-[1.6rem] border border-primary/30 bg-primary/8 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Einladungen
          </p>
          <p className="mt-2 font-display text-3xl font-semibold">{shop.invite_count}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">echte Gäste gebeten — nicht Sterne gekauft.</p>
        </article>
      ) : null}

      {shop.google_review_url ? (
        <a
          href={shop.google_review_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-[1.6rem] border border-gold/35 bg-gold/8 p-6 transition-colors hover:border-gold/60"
        >
          <Star className="h-5 w-5 text-gold" />
          <h2 className="mt-3 font-display text-xl font-semibold">
            {shop.google_find_copy || "Gäste finden uns auf Google"}
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Wir zeigen keine Sterne als Produktzahl. Der Link führt zu Google — fertig.
          </p>
        </a>
      ) : null}

      {shop.catalog.length === 0 && shop.service_details.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {shop.service_details.slice(0, 6).map((s, i) => (
            <article
              key={s.title}
              className="rounded-[1.6rem] border border-border/40 bg-card/30 p-5"
            >
              <p className="font-display text-2xl text-muted-foreground/50">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">{s.title}</h3>
              {s.blurb ? (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.blurb}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {shop.neighbors.length > 0 ? (
        <article className="rounded-[2rem] border border-border/40 bg-card/20 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Wien-Netz
          </p>
          <ul className="mt-4 space-y-2">
            {shop.neighbors.map((n) => (
              <li key={n.slug}>
                <Link
                  to="/b/$slug"
                  params={{ slug: n.slug }}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-foreground/[0.04]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/[0.05]">
                    {n.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{n.name}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {[n.district || n.city, n.niche].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/wien" className="mt-3 inline-block text-sm font-semibold text-primary">
            Ganzes Verzeichnis →
          </Link>
        </article>
      ) : (
        <article className="rounded-[2rem] border border-dashed border-border/50 p-5">
          <Store className="h-5 w-5 text-primary" />
          <p className="mt-3 font-semibold">Noch Platz im Wien-Netz</p>
          <Link to="/lokal" className="mt-2 inline-block text-sm font-semibold text-primary">
            Betrieb eintragen →
          </Link>
        </article>
      )}
    </section>
  );
}

function VisitStrip({
  shop,
  address,
  mapQuery,
}: {
  shop: PublicLocalBusiness;
  address: string | null;
  mapQuery: string;
}) {
  return (
    <section className="rounded-[2rem] border border-border/40 bg-card/25 p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        Vor Ort
      </p>
      <dl className="mt-4 grid gap-4 text-[14px] sm:grid-cols-2">
        {address ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Adresse
            </dt>
            <dd className="mt-1">
              <a
                href={mapsSearchUrl(mapQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                {address}
              </a>
            </dd>
          </div>
        ) : null}
        {shop.phone ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Telefon
            </dt>
            <dd className="mt-1">
              <a href={telHref(shop.phone)} className="hover:text-primary">
                {shop.phone}
              </a>
            </dd>
          </div>
        ) : null}
        {shop.public_email ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Mail
            </dt>
            <dd className="mt-1">
              <a href={`mailto:${shop.public_email}`} className="hover:text-primary">
                {shop.public_email}
              </a>
            </dd>
          </div>
        ) : null}
        {shop.hours_note ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Öffnungszeiten
            </dt>
            <dd className="mt-1 flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-primary" />
              {shop.hours_note}
            </dd>
          </div>
        ) : null}
      </dl>
      {shop.second_studio_note ? (
        <p className="mt-4 text-[13px] text-muted-foreground">{shop.second_studio_note}</p>
      ) : null}
      {mapQuery ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/40">
          <iframe
            title={`Karte ${shop.name}`}
            src={mapsEmbedUrl(mapQuery)}
            className="h-56 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}
    </section>
  );
}
