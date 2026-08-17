import { Link } from "@tanstack/react-router";
import { Footprints, MapPin, Search, Store, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Chip, Shimmer } from "@/components/aura/primitives";
import { formatShopAddress } from "@/lib/lokal-shops";
import { safeHttpUrl } from "@/lib/nachbar-play";
import type { PublicLokalListing } from "@/lib/reviews.public.functions";
import { cn } from "@/lib/utils";

/** Same-origin shop/media paths or absolute http(s). */
export function safeShopImageUrl(raw: string | null | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  if (t.startsWith("/")) {
    if (!/^\/(shops|og|funnels|crew|brand|share)\/[\w./-]+$/i.test(t)) return null;
    if (/[)('"\\<>]/.test(t) || t.includes("..")) return null;
    return t;
  }
  return safeHttpUrl(t);
}

const OPS_SLUGS = new Set(["aura-os", "aura-lokal", "aura-nachbar", "aura-goods"]);

function nicheBucket(niche: string | null): string {
  const n = (niche || "").toLowerCase();
  if (/café|cafe|kaffee|lounge|frühstück/.test(n)) return "Kaffee & Lounge";
  if (/gasthaus|küche|beisl|gastro|restaurant|wirt/.test(n)) return "Gastro";
  if (/beauty|body|kosmetik|shape/.test(n)) return "Beauty";
  if (/friseur|haar|salon|pflege|barber|pion/.test(n)) return "Friseur & Pflege";
  if (/auto|fahrzeug|ankauf/.test(n)) return "Auto";
  if (/handwerk|studio|immobil/.test(n)) return "Handwerk & Studio";
  return "Weiteres";
}

function districtKey(b: PublicLokalListing): string {
  if (b.district?.trim()) return b.district.trim();
  if (b.postal_code?.trim()) return b.postal_code.trim();
  if (b.city?.trim()) return b.city.trim();
  return "Wien";
}

export function isPublicShopListing(b: PublicLokalListing): boolean {
  if (OPS_SLUGS.has(b.slug)) return false;
  if (b.slug.startsWith("aura-")) return false;
  return true;
}

type Props = {
  listings: PublicLokalListing[];
  isLoading: boolean;
  remaining: number;
};

export function WienDirectory({ listings, isLoading, remaining }: Props) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("all");
  const [bucket, setBucket] = useState<string>("all");
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  const shops = useMemo(() => listings.filter(isPublicShopListing), [listings]);

  const districts = useMemo(() => {
    const set = new Set(shops.map(districtKey));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [shops]);

  const buckets = useMemo(() => {
    const set = new Set(shops.map((s) => nicheBucket(s.niche)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [shops]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return shops
      .filter((b) => {
        if (onlyFeatured && !b.featured) return false;
        if (district !== "all" && districtKey(b) !== district) return false;
        if (bucket !== "all" && nicheBucket(b.niche) !== bucket) return false;
        if (!needle) return true;
        const hay = [b.name, b.tagline, b.niche, b.district, b.city, b.street]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        const an = a.local_cohort_number ?? 9999;
        const bn = b.local_cohort_number ?? 9999;
        if (an !== bn) return an - bn;
        return a.name.localeCompare(b.name, "de");
      });
  }, [shops, q, district, bucket, onlyFeatured]);

  const activeFilters =
    (district !== "all" ? 1 : 0) +
    (bucket !== "all" ? 1 : 0) +
    (onlyFeatured ? 1 : 0) +
    (q.trim() ? 1 : 0);

  const clear = () => {
    setQ("");
    setDistrict("all");
    setBucket("all");
    setOnlyFeatured(false);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[1.8rem] border border-border/40 bg-card/25 p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Betrieb, Straße, Niche…"
            className="w-full rounded-2xl border border-border/40 bg-background/60 py-3 pl-10 pr-10 text-sm outline-none focus:border-primary/40"
            aria-label="Betriebe suchen"
          />
          {q ? (
            <button
              type="button"
              aria-label="Suche leeren"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQ("")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOnlyFeatured((v) => !v)}
            className={cn(
              "rounded-2xl border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
              onlyFeatured
                ? "border-gold/50 bg-gold/15 text-gold"
                : "border-border/50 text-muted-foreground hover:text-foreground",
            )}
          >
            Wien zuerst
          </button>
          {buckets.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBucket((cur) => (cur === b ? "all" : b))}
              className={cn(
                "rounded-2xl border px-3 py-1.5 text-[11px] font-semibold",
                bucket === b
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {b}
            </button>
          ))}
        </div>

        {districts.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            <button
              type="button"
              onClick={() => setDistrict("all")}
              className={cn(
                "shrink-0 rounded-2xl border px-3 py-1.5 text-[11px] font-semibold",
                district === "all"
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/50 text-muted-foreground",
              )}
            >
              Alle Bezirke
            </button>
            {districts.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDistrict((cur) => (cur === d ? "all" : d))}
                className={cn(
                  "shrink-0 rounded-2xl border px-3 py-1.5 text-[11px] font-semibold",
                  district === d
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border/50 text-muted-foreground",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
          <p>
            {filtered.length} von {shops.length} Betrieben
            {activeFilters ? ` · ${activeFilters} Filter` : ""}
          </p>
          {activeFilters ? (
            <button type="button" onClick={clear} className="font-semibold text-primary">
              Filter zurücksetzen
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Shimmer className="h-64" />
          <Shimmer className="h-64" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/60 px-6 py-10 text-center">
          <p className="font-display text-xl font-semibold">Nichts in diesem Filter.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Filter lockern oder als Nachbar die Stadt-Karte öffnen.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={clear}
              className="rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold"
            >
              Zurücksetzen
            </button>
            <Link
              to="/nachbar/entdecken"
              className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Stadt-Karte
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((b) => (
            <WienShopCard key={b.slug} shop={b} />
          ))}
          {remaining > 0 ? (
            <li className="flex min-h-[16rem] flex-col justify-between rounded-[1.8rem] border border-dashed border-border/50 bg-foreground/[0.02] p-5">
              <div>
                <Store className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-display text-xl font-semibold">Dein Betrieb hier</h3>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {remaining.toLocaleString("de-AT")} Plätze in der ersten Wiener Kohorte.
                </p>
              </div>
              <Link to="/lokal" className="mt-4 inline-block text-sm font-semibold text-primary">
                Mitmachen →
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

function WienShopCard({ shop }: { shop: PublicLokalListing }) {
  const address = formatShopAddress(shop);
  const cover = safeShopImageUrl(shop.cover_url);

  return (
    <li>
      <article className="group overflow-hidden rounded-[1.8rem] border border-border/40 bg-card/30 transition-colors hover:border-primary/40">
        <Link to="/b/$slug" params={{ slug: shop.slug }} className="block">
          <div className="relative aspect-[16/10] overflow-hidden bg-foreground/[0.04]">
            {cover ? (
              <img
                src={cover}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at 30% 20%, oklch(0.55 0.08 195 / 0.35), transparent 55%), linear-gradient(160deg, oklch(0.22 0.02 240), oklch(0.16 0.02 240))",
                }}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 pt-12">
              <div className="flex flex-wrap gap-1.5">
                {shop.featured ? <Chip tone="gold">Wien zuerst</Chip> : null}
                {shop.local_cohort_number ? (
                  <Chip tone="gold">#{shop.local_cohort_number}</Chip>
                ) : null}
                <Chip>{nicheBucket(shop.niche)}</Chip>
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-white">
                {shop.name}
              </h3>
            </div>
          </div>
        </Link>
        <div className="space-y-3 p-4">
          <p className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
            {[districtKey(shop), shop.niche].filter(Boolean).join(" · ")}
          </p>
          {address ? (
            <p className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {address}
            </p>
          ) : null}
          {shop.tagline ? (
            <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {shop.tagline}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              to="/b/$slug"
              params={{ slug: shop.slug }}
              className="rounded-2xl bg-primary px-3.5 py-2 text-[12px] font-semibold text-primary-foreground"
            >
              Zur Karte
            </Link>
            <Link
              to="/nachbar/entdecken"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-border/50 px-3.5 py-2 text-[12px] font-semibold"
              onClick={() => {
                try {
                  sessionStorage.setItem("aura_wien_focus_slug", shop.slug);
                } catch {
                  /* ignore */
                }
              }}
            >
              <Footprints className="h-3.5 w-3.5" />
              Nachbar
            </Link>
            {shop.homepage_url && safeHttpUrl(shop.homepage_url) ? (
              <a
                href={safeHttpUrl(shop.homepage_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-border/50 px-3.5 py-2 text-[12px] font-semibold"
              >
                Web
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
}
