import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";

import {
  nicheLabel,
  TischProofMasonry,
  TischProofSwipe,
  TischShell,
  TischStartSteps,
  TischStickyCta,
} from "@/components/aura/tisch-proof";
import { useLocale } from "@/hooks/use-locale";
import { rememberFunnel, rememberLocale } from "@/lib/attribution";
import {
  getPublicLocalBusiness,
  getPublicTischNetwork,
  type PublicTischProof,
} from "@/lib/reviews.public.functions";
import { url } from "@/lib/site";

export const Route = createFileRoute("/tisch_/$slug")({
  loader: async ({ params }) => {
    const { withTimeout } = await import("@/lib/timeout-helper");
    const shop = await withTimeout(
      getPublicLocalBusiness({ data: { slug: params.slug } }),
      5000,
      null,
    );
    if (!shop) throw notFound();

    const ownProofs: PublicTischProof[] = (shop.proofs ?? []).map((item) => ({
      id: item.id,
      url: item.url,
      caption: item.caption,
      shopName: shop.name,
      shopSlug: shop.slug,
      niche: shop.niche,
      district: shop.district,
    }));

    const network =
      ownProofs.length === 0
        ? await withTimeout(
            getPublicTischNetwork({
              data: {
                niche: shop.niche ?? undefined,
                excludeSlug: shop.slug,
                limit: 12,
              },
            }),
            4000,
            [],
          )
        : [];

    return { shop, ownProofs, network };
  },
  head: ({ loaderData, params }) => {
    const shop = loaderData?.shop;
    const title = shop ? `${shop.name} — Am Tisch` : "Am Tisch — Aura Local";
    const description = shop
      ? `Echte Stimmen für ${shop.name}. Zum Zeigen an der Theke.`
      : "Echte Bewertungen unserer Community.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url(`/tisch/${shop?.slug ?? params.slug}`) },
        { property: "og:locale", content: "de_AT" },
      ],
    };
  },
  component: TischShopPage,
});

function TischShopPage() {
  const { setLocale } = useLocale();
  const { shop, ownProofs, network } = Route.useLoaderData();

  useEffect(() => {
    rememberFunnel("local");
    rememberLocale("de");
    setLocale("de");
  }, [setLocale]);

  const place = [shop.district, shop.city].filter(Boolean).join(" · ");
  const hasOwn = ownProofs.length > 0;

  return (
    <TischShell kicker="Am Tisch · Beweis">
      <div className="mx-auto w-full max-w-lg space-y-8 px-5 py-8">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            {[shop.niche, place].filter(Boolean).join(" · ") || "Aura Local"}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2rem,8vw,3.2rem)] font-semibold leading-[0.98] tracking-tight">
            {shop.name}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {hasOwn
              ? "Das haben echte Gäste geschrieben — Screenshots, keine gekauften Sterne."
              : `Noch leer — so arbeiten wir schon bei anderen ${nicheLabel(shop.niche)}.`}
          </p>
        </header>

        {hasOwn ? (
          <TischProofSwipe proofs={ownProofs} shopName={shop.name} />
        ) : (
          <TischProofMasonry proofs={network} linked />
        )}

        <TischStartSteps />
      </div>
      <TischStickyCta shopSlug={shop.slug} />
    </TischShell>
  );
}
