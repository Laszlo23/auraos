import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { NachbarNotePips } from "@/components/aura/nachbar-note";
import { Chip, Panel, Shimmer } from "@/components/aura/primitives";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { NACHBAR_STAMP_GOAL } from "@/lib/nachbar";
import { rememberNachbarVisit } from "@/lib/nachbar-play";
import { getNachbarCityBoard, getNachbarHub, type NachbarCityShop } from "@/lib/nachbar.functions";
import { nachbarHeatLabel, safeHttpUrl } from "@/lib/nachbar-play";
import { nachbarHead } from "@/lib/nachbar-seo";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const TITLE = "Entdecken — Aura Nachbar Wien";
const FALLBACK_DESCRIPTION =
  "Stadt-Karte Wien: echte Läden, Check-in vor Ort, Stempel und Nachbar-Note. Community-Spiel — kein Business nötig, keine Fake-Sterne.";

function boardDescription(shops: NachbarCityShop[]) {
  const names = shops
    .slice(0, 4)
    .map((s) => s.name)
    .filter(Boolean);
  if (shops.length === 0) return FALLBACK_DESCRIPTION;
  return `Stadt-Karte Wien: ${shops.length} echte Läden${
    names.length ? ` — ${names.join(", ")}` : ""
  }. Check-in, Stempel, Nachbar-Note. Keine Fake-Sterne.`;
}

export const Route = createFileRoute("/nachbar/entdecken")({
  loader: async () => {
    try {
      return await getNachbarCityBoard();
    } catch {
      return { shops: [] as NachbarCityShop[], missions: [] };
    }
  },
  head: ({ loaderData }) =>
    nachbarHead({
      title: TITLE,
      description: boardDescription(loaderData?.shops ?? []),
      path: "/nachbar/entdecken",
    }),
  component: NachbarEntdeckenPage,
});

function cityListJsonLd(shops: NachbarCityShop[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Aura Nachbar — Läden in Wien",
    description: FALLBACK_DESCRIPTION,
    url: `${SITE_URL}/nachbar/entdecken`,
    numberOfItems: shops.length,
    itemListElement: shops.slice(0, 24).map((shop, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: shop.name,
      url: shop.slug ? `${SITE_URL}/b/${shop.slug}` : `${SITE_URL}/nachbar/entdecken`,
      description: shop.tagline || [shop.city, shop.niche].filter(Boolean).join(" · ") || undefined,
    })),
  };
}

function NachbarEntdeckenPage() {
  const initial = Route.useLoaderData();
  const { data: user } = useSupabaseSession();
  const board = useQuery({
    queryKey: ["nachbar-city-board"],
    queryFn: () => getNachbarCityBoard(),
    initialData: initial,
    staleTime: 30_000,
  });
  const hub = useQuery({
    queryKey: ["nachbar-hub"],
    enabled: Boolean(user),
    queryFn: () => getNachbarHub(),
    retry: 1,
  });

  const shops = board.data?.shops ?? [];
  const missions = hub.data?.missions?.length
    ? hub.data.missions
    : (board.data?.missions ?? []).map((m) => ({ ...m, done: false }));
  const openMissions = missions.filter((m) => !m.done).slice(0, 4);
  const nextId = hub.data?.next_shop?.id;
  const stamps = new Map((hub.data?.stamps ?? []).map((s) => [s.company_id, s]));
  const visited = new Set(
    (hub.data?.checkins ?? [])
      .filter((c) => c.status === "confirmed")
      .map((c) => c.company_id)
      .filter(Boolean),
  );

  return (
    <div className="space-y-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cityListJsonLd(shops)) }}
      />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Stadt-Karte
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Wien entdecken</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Community-Spiel, kein Business nötig. Echte Läden, echte Besuche, Nachbar-Note — keine
          Fake-Sterne.
        </p>
      </div>

      {user && hub.data ? (
        <div className="grid grid-cols-3 gap-2">
          <Panel>
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Streak
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {hub.data.progress.streak_days}
              </p>
            </div>
          </Panel>
          <Panel>
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stadt</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {hub.data.progress.city_score}
              </p>
            </div>
          </Panel>
          <Panel>
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Offen</p>
              <p className="mt-1 font-display text-2xl font-semibold">{openMissions.length}</p>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="rounded-[1.65rem] border border-gold/35 bg-gold/8 p-5">
          <p className="text-sm font-semibold">Mitspielen ohne Laden</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Check-in, Stempel, Freunde, Nachbar-Note. Firma kannst du später machen — oder nie.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup", next: "/nachbar/heute", lang: "de" }}
            className="mt-3 inline-flex rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Konto · dann Stadt
          </Link>
        </div>
      )}

      {openMissions.length > 0 ? (
        <Panel label="Wochen-Missionen">
          <ul className="space-y-3">
            {openMissions.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{m.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {m.body}
                  </p>
                </div>
                <Chip tone="gold" className="shrink-0">
                  +{m.grant_amount}
                </Chip>
              </li>
            ))}
          </ul>
          {user ? (
            <Link
              to="/nachbar/heute"
              className="mt-3 inline-block text-sm font-semibold text-primary"
            >
              Heute einchecken →
            </Link>
          ) : null}
        </Panel>
      ) : null}

      {board.isLoading && shops.length === 0 ? <Shimmer className="h-48" /> : null}

      <ul className="space-y-3">
        {shops.map((shop) => {
          const stamp = stamps.get(shop.id);
          const isNext = shop.id === nextId;
          const been = visited.has(shop.id);
          const place = [shop.district, shop.city, shop.niche].filter(Boolean).join(" · ");
          const site = safeHttpUrl(shop.homepage_url);
          const cover = safeHttpUrl(shop.cover_url);
          return (
            <li key={shop.id}>
              <article
                className={cn(
                  "rounded-[1.65rem] border bg-card/40 p-4",
                  isNext
                    ? "border-gold/50 shadow-[0_0_32px_-16px_var(--glow)]"
                    : "border-border/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl",
                      shop.featured ? "bg-gold/15 ring-1 ring-gold/40" : "bg-foreground/6",
                    )}
                    style={
                      cover
                        ? {
                            backgroundImage: `url("${cover}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    {cover ? <span className="sr-only">{shop.name}</span> : shop.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-display text-[1.2rem] font-semibold leading-snug tracking-tight">
                      {shop.name}
                    </h2>
                    {place ? (
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {place}
                      </p>
                    ) : null}
                  </div>
                </div>

                {(shop.featured || isNext || been) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {shop.featured ? <Chip tone="gold">Tresen</Chip> : null}
                    {isNext ? <Chip>Nächster</Chip> : null}
                    {been ? <Chip>Da warst du</Chip> : null}
                  </div>
                )}

                {shop.tagline ? (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {shop.tagline}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-col gap-2">
                  <span className="text-[12px] font-semibold text-primary">
                    {nachbarHeatLabel(shop.visit_count)}
                    {shop.visit_count > 0 ? ` · ${shop.visit_count} Besuche` : ""}
                  </span>
                  <NachbarNotePips avg={shop.rating_avg} count={shop.rating_count} />
                </div>

                {stamp ? (
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: NACHBAR_STAMP_GOAL }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full",
                          i < stamp.stamp_count ? "bg-gold" : "bg-foreground/10",
                        )}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
                  {shop.slug ? (
                    <Link
                      to={user ? "/nachbar/heute" : "/auth"}
                      search={
                        user
                          ? { shop: shop.slug }
                          : { mode: "signup", next: "/nachbar/heute", lang: "de" }
                      }
                      onClick={() => rememberNachbarVisit({ shop: shop.slug!, auto: true })}
                      className="text-primary"
                    >
                      Jetzt einchecken
                    </Link>
                  ) : (
                    <Link to="/nachbar/heute" className="text-primary">
                      Check-in →
                    </Link>
                  )}
                  {shop.slug ? (
                    <Link
                      to="/b/$slug"
                      params={{ slug: shop.slug }}
                      className="text-muted-foreground"
                    >
                      Karte
                    </Link>
                  ) : null}
                  {site ? (
                    <a
                      href={site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground"
                    >
                      Website
                    </a>
                  ) : null}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {!board.isLoading && shops.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Karte lädt gerade nicht.{" "}
          <Link to="/wien" className="font-semibold text-primary">
            Wien-Verzeichnis →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
