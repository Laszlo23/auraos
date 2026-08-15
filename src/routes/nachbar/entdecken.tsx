import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Panel, Shimmer } from "@/components/aura/primitives";
import { listNachbarPublicShops } from "@/lib/nachbar.functions";

export const Route = createFileRoute("/nachbar/entdecken")({
  head: () => ({ meta: [{ title: "Entdecken — Aura Nachbar" }] }),
  component: NachbarEntdeckenPage,
});

function NachbarEntdeckenPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["nachbar-shops"],
    queryFn: () => listNachbarPublicShops(),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Entdecken
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Läden in Wien
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Echte Betriebe im Netz. Check-in vor Ort — keine Fake-Sterne.
        </p>
      </div>

      {isLoading ? <Shimmer className="h-48" /> : null}

      <ul className="space-y-3">
        {(data ?? []).map((shop) => (
          <li key={shop.id}>
            <Panel>
              <p className="font-display text-lg font-semibold tracking-tight">{shop.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {[shop.city, shop.niche].filter(Boolean).join(" · ") || "Lokal"}
              </p>
              {shop.tagline ? (
                <p className="mt-2 text-sm text-muted-foreground">{shop.tagline}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                {shop.slug ? (
                  <Link to="/b/$slug" params={{ slug: shop.slug }} className="text-primary">
                    Karte →
                  </Link>
                ) : null}
                {shop.homepage_url ? (
                  <a
                    href={shop.homepage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground"
                  >
                    Website
                  </a>
                ) : null}
              </div>
            </Panel>
          </li>
        ))}
      </ul>

      {!isLoading && (data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch keine Läden hier.{" "}
          <Link to="/wien" className="font-semibold text-primary">
            Wien-Verzeichnis →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
