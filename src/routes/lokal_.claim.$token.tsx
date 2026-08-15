import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { claimLokalShop, previewLokalShopClaim } from "@/lib/lokal-claim.functions";
import { formatShopAddress } from "@/lib/lokal-shops";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/lokal_/claim/$token")({
  loader: async ({ params }) => previewLokalShopClaim({ data: { token: params.token } }),
  head: ({ loaderData }) => {
    const name = loaderData?.name;
    const title = name ? `${name} übernehmen — ${SITE_NAME}` : `Betrieb übernehmen — ${SITE_NAME}`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: "Löse deinen Claim-Link ein und übernimm den öffentlichen Betriebseintrag.",
        },
        { property: "og:title", content: title },
        { property: "og:url", content: `${SITE_URL}/lokal/claim` },
      ],
    };
  },
  component: LokalClaimPage,
});

function LokalClaimPage() {
  const { token } = Route.useParams();
  const preloaded = Route.useLoaderData();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const preview = useQuery({
    queryKey: ["lokal-claim", token],
    queryFn: () => previewLokalShopClaim({ data: { token } }),
    initialData: preloaded ?? undefined,
  });

  const claim = useMutation({
    mutationFn: () => claimLokalShop({ data: { token } }),
    onSuccess: (res) => {
      toast.success(
        res.alreadyClaimed ? "Dieser Betrieb gehört dir schon." : `${res.name} ist jetzt deins.`,
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Übernahme fehlgeschlagen.");
    },
  });

  const shop = preview.data;
  const next = `/lokal/claim/${token}`;

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <div className="austria-bar" aria-hidden />
      <header className="relative border-b border-border/40">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            {SITE_NAME}
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-lg px-6 py-16">
        {preview.isLoading ? (
          <p className="text-sm text-muted-foreground">Claim-Link wird geprüft…</p>
        ) : !shop ? (
          <>
            <h1 className="font-display text-3xl font-semibold">Link ungültig</h1>
            <p className="mt-3 text-[15px] text-muted-foreground">
              Dieser Claim-Link gilt nicht. Frag das Team nach einem neuen.
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
              Betrieb übernehmen
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{shop.name}</h1>
            {shop.tagline ? (
              <p className="mt-3 text-[15px] text-muted-foreground">{shop.tagline}</p>
            ) : null}
            {formatShopAddress(shop) ? (
              <p className="mt-2 text-[13px] text-muted-foreground">{formatShopAddress(shop)}</p>
            ) : null}
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {shop.owner_display_name
                ? `${shop.owner_display_name} — öffentlicher Eintrag`
                : "Öffentlicher Eintrag"}
              {shop.city ? ` in ${shop.city}` : ""}. Kein erfundenes Login — du meldest dich mit
              deiner eigenen Mail an und holst den Laden.
            </p>
            {shop.slug ? (
              <Link
                to="/b/$slug"
                params={{ slug: shop.slug }}
                className="mt-4 inline-block text-sm font-semibold text-primary"
              >
                Profil ansehen →
              </Link>
            ) : null}

            {shop.claimed ? (
              <p className="mt-8 rounded-2xl border border-border/50 px-4 py-3 text-sm">
                Dieser Betrieb ist schon übernommen.
              </p>
            ) : userId ? (
              <button
                type="button"
                disabled={claim.isPending}
                onClick={() => claim.mutate()}
                className="mt-8 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {claim.isPending ? "Übernehme…" : "Betrieb übernehmen"}
              </button>
            ) : (
              <Link
                to="/auth"
                search={{ mode: "signup", next, lang: "de", funnel: "local" }}
                className="mt-8 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Anmelden und übernehmen
              </Link>
            )}

            {claim.isSuccess ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Fertig. Weiter zu{" "}
                <Link to="/boost" className="font-semibold text-primary">
                  /boost
                </Link>
                .
              </p>
            ) : null}
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
