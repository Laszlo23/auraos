import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ExternalLink, Hexagon } from "lucide-react";

import { CreatorCollectionMint } from "@/components/aura/creator-collection-mint";
import {
  CreatorChainPill,
  CreatorDropTicker,
  CreatorMintFrame,
  CreatorPoweredStrip,
  CreatorWeb3Backdrop,
} from "@/components/aura/creator-visuals";
import { MarketingPage } from "@/components/aura/marketing-page";
import { getPublicCollection } from "@/lib/creator-collections.functions";
import {
  collectionCoverUrl,
  formatMintPriceFromWei,
  type NftCollectionRow,
} from "@/lib/creator-contracts";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ params }) => {
    try {
      const slug = String(params.slug || "");
      const result = await getPublicCollection({ data: { slug } });
      if (!result.collection) throw notFound();
      return result.collection as NftCollectionRow;
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const c = loaderData;
    if (!c) return {};
    const cover = c.cover_image_url ?? collectionCoverUrl(c.slug);
    const title = `${c.name} — Mint on Robinhood Chain`;
    return {
      meta: [
        { title },
        { name: "description", content: c.description ?? `Mint ${c.name} on Robinhood Chain` },
        { property: "og:title", content: title },
        { property: "og:description", content: c.description ?? "" },
        { property: "og:url", content: `${SITE_URL}/c/${c.slug}` },
        { property: "og:image", content: cover },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/c/${c.slug}` }],
    };
  },
  component: CollectionMintPage,
});

function CollectionMintPage() {
  const collection = Route.useLoaderData();
  const { data } = useSuspenseQuery({
    queryKey: ["public-collection", collection.slug],
    queryFn: () => getPublicCollection({ data: { slug: collection.slug } }),
    initialData: { collection },
  });

  const c = (data.collection ?? collection) as NftCollectionRow;
  const cover = c.cover_image_url ?? collectionCoverUrl(c.slug);
  const priceLabel = formatMintPriceFromWei(c.mint_price_wei, c.mint_asset);

  return (
    <MarketingPage shareText={`Mint ${c.name} on Robinhood Chain — Aura OS`}>
      <div className="relative min-h-svh overflow-hidden bg-[#07090e]">
        <CreatorWeb3Backdrop />
        <CreatorDropTicker
          name={c.name}
          symbol={c.symbol}
          maxSupply={c.max_supply}
          mintAsset={c.mint_asset}
        />

        <section className="stage-atmosphere relative">
          <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-14 lg:py-20">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55 }}
            >
              <CreatorChainPill />
              <p className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
                <Hexagon className="h-3.5 w-3.5" />
                Primary mint · Aura Creator
              </p>
              <h1 className="display-hero mt-3 text-[clamp(2.5rem,8vw,4rem)] leading-[0.95]">
                {c.name}
              </h1>
              <p className="mt-2 font-mono text-sm tracking-wide text-primary/80">{c.symbol}</p>
              {c.description ? (
                <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                  {c.description}
                </p>
              ) : null}

              <dl className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border/35 bg-foreground/[0.04] px-3 py-3 text-center backdrop-blur-sm">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Price
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-money">{priceLabel}</dd>
                </div>
                <div className="rounded-2xl border border-border/35 bg-foreground/[0.04] px-3 py-3 text-center backdrop-blur-sm">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Supply
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">{c.max_supply}</dd>
                </div>
                <div className="rounded-2xl border border-border/35 bg-foreground/[0.04] px-3 py-3 text-center backdrop-blur-sm">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Royalties
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">{c.royalty_bps / 100}%</dd>
                </div>
              </dl>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.06 }}
              className="mx-auto w-full max-w-md lg:max-w-none"
            >
              <CreatorMintFrame
                slug={c.slug}
                name={c.name}
                symbol={c.symbol}
                priceLabel={priceLabel}
              >
                <img src={cover} alt="" className="aspect-square w-full object-cover" />
              </CreatorMintFrame>
            </motion.div>
          </div>

          <div className="relative mx-auto max-w-md px-6 pb-16">
            <CreatorCollectionMint collection={c} />
            {c.contract_address ? (
              <p className="mt-6 text-center text-[11px] text-muted-foreground">
                Contract{" "}
                <a
                  href={`https://robinhoodchain.blockscout.com/address/${c.contract_address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-primary underline-offset-2 hover:underline"
                >
                  {c.contract_address.slice(0, 8)}…{c.contract_address.slice(-6)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            ) : null}
          </div>

          <CreatorPoweredStrip />
        </section>
      </div>
    </MarketingPage>
  );
}
