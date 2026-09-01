import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Hexagon,
  Loader2,
  Plus,
  Rocket,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  CreatorChainPill,
  CreatorFlowRail,
  CreatorMintFrame,
  CreatorStackShowcase,
  CreatorWeb3Backdrop,
} from "@/components/aura/creator-visuals";
import { Panel } from "@/components/aura/primitives";
import {
  collectionCoverUrl,
  collectionMintUrl,
  normalizeCollectionSlug,
  type CreatorMintAsset,
  type NftCollectionRow,
} from "@/lib/creator-contracts";
import {
  createCollectionDraft,
  listMyCollections,
  publishCreatorCollection,
} from "@/lib/creator-collections.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/creator")({
  head: () => ({
    meta: [
      { title: "Creator — NFT collections — Aura OS" },
      {
        name: "description",
        content: "Launch your NFT collection on Robinhood Chain with a branded mint page.",
      },
    ],
  }),
  component: CreatorHubPage,
});

function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function statusTone(status: NftCollectionRow["status"]): string {
  switch (status) {
    case "live":
      return "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30";
    case "draft":
      return "bg-foreground/8 text-muted-foreground ring-border/40";
    case "deploying":
      return "bg-primary/15 text-primary ring-primary/30";
    case "failed":
      return "bg-destructive/15 text-destructive ring-destructive/30";
    case "paused":
    case "sold_out":
      return "bg-gold/15 text-gold ring-gold/30";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function CreatorHubPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-collections"],
    queryFn: () => listMyCollections(),
  });

  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    slug: "",
    description: "",
    maxSupply: 100,
    mintPrice: 10,
    mintAsset: "usdg" as CreatorMintAsset,
    royaltyBps: 500,
    payoutWallet: "",
  });

  const previewSlug = useMemo(() => {
    try {
      return form.slug.trim() ? normalizeCollectionSlug(form.slug) : "your-drop";
    } catch {
      return "your-drop";
    }
  }, [form.slug]);

  const pricePreview = `${form.mintPrice} ${form.mintAsset === "eth" ? "ETH" : "USDG"}`;

  const createDraft = useMutation({
    mutationFn: createCollectionDraft,
    onSuccess: () => {
      toast.success("Collection draft saved");
      void qc.invalidateQueries({ queryKey: ["my-collections"] });
      setSlugTouched(false);
      setForm({
        name: "",
        symbol: "",
        slug: "",
        description: "",
        maxSupply: 100,
        mintPrice: 10,
        mintAsset: "usdg",
        royaltyBps: 500,
        payoutWallet: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: publishCreatorCollection,
    onSuccess: (res) => {
      toast.success("Collection live on Robinhood Chain");
      void qc.invalidateQueries({ queryKey: ["my-collections"] });
      if (res.mintUrl) window.open(res.mintUrl, "_blank");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const collections = data?.collections ?? [];
  const deployReady = Boolean(data?.deployReady);

  return (
    <div className="relative min-h-full overflow-hidden">
      <CreatorWeb3Backdrop />

      <div className="relative mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <header className="relative text-center lg:text-left">
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="label-luxury mx-auto lg:mx-0">Creator studio</p>
              <CreatorChainPill />
              <h1 className="display-hero mt-5 text-[clamp(2.4rem,7vw,3.75rem)] leading-[0.95]">
                Launch on <span className="text-money">Robinhood</span>
                <br />
                <span className="text-[0.72em] font-bold text-foreground/90">like a pro.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground lg:mx-0">
                Aura Creator is your full drop stack — smart contracts, branded mint storefront,
                USDG checkout, and AI agents that promote the release. One studio, zero duct tape.
              </p>
            </div>
            <div className="hidden w-full max-w-[220px] shrink-0 lg:block">
              <CreatorMintFrame
                slug={previewSlug}
                name={form.name || "Your collection"}
                symbol={form.symbol || "DROP"}
                priceLabel={pricePreview}
              />
            </div>
          </div>

          <div className="mt-10">
            <CreatorFlowRail />
          </div>

          {!deployReady ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-8 max-w-2xl rounded-2xl border border-gold/35 bg-gold/8 px-4 py-3 text-center text-[13px] leading-relaxed text-gold lg:mx-0 lg:text-left"
            >
              Factory wiring in progress — save drafts now. On-chain deploy unlocks when{" "}
              <code className="rounded bg-black/25 px-1 py-0.5 text-[11px]">
                CREATOR_FACTORY_RH
              </code>{" "}
              is live.
            </motion.div>
          ) : null}
        </header>

        {/* What Aura Creator is */}
        <section>
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground lg:text-left">
            The full stack
          </p>
          <h2 className="mt-2 text-center text-xl font-semibold tracking-tight lg:text-left">
            Everything a Web3 drop needs — built in
          </h2>
          <CreatorStackShowcase className="mt-6" />
        </section>

        {/* Form + preview */}
        <div className="relative grid gap-8 lg:grid-cols-[1fr_300px]">
          <Panel label="New collection" glow>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createDraft.mutate({ data: form });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px]">
                  <span className="text-muted-foreground">Collection name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({
                        ...f,
                        name,
                        slug: slugTouched ? f.slug : slugifyName(name),
                        symbol:
                          f.symbol ||
                          name
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .slice(0, 6)
                            .toUpperCase(),
                      }));
                    }}
                    placeholder="Neon Garden"
                    className="mt-1 w-full rounded-xl border border-border/30 bg-foreground/6 px-3 py-2.5 text-sm transition focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="block text-[12px]">
                  <span className="text-muted-foreground">Symbol</span>
                  <input
                    required
                    value={form.symbol}
                    onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border/30 bg-foreground/6 px-3 py-2.5 text-sm uppercase transition focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
              <label className="block text-[12px]">
                <span className="text-muted-foreground">Mint page URL</span>
                <div className="mt-1 flex overflow-hidden rounded-xl border border-border/30 bg-foreground/6 focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="flex items-center border-r border-border/25 bg-foreground/[0.04] px-3 font-mono text-[11px] text-primary/80">
                    aibusiness.fun/c/
                  </span>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((f) => ({ ...f, slug: e.target.value }));
                    }}
                    placeholder="neon-garden"
                    className="w-full bg-transparent py-2.5 pr-3 font-mono text-sm outline-none"
                  />
                </div>
              </label>
              <label className="block text-[12px]">
                <span className="text-muted-foreground">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Generative flora on Robinhood Chain — 100 unique pieces."
                  className="mt-1 w-full rounded-xl border border-border/30 bg-foreground/6 px-3 py-2.5 text-sm transition focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-[12px]">
                  <span className="text-muted-foreground">Max supply</span>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={form.maxSupply}
                    onChange={(e) => setForm((f) => ({ ...f, maxSupply: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-border/30 bg-foreground/6 px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-[12px]">
                  <span className="text-muted-foreground">Mint price</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.mintPrice}
                    onChange={(e) => setForm((f) => ({ ...f, mintPrice: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-border/30 bg-foreground/6 px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-[12px]">
                  <span className="text-muted-foreground">Settle in</span>
                  <select
                    value={form.mintAsset}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mintAsset: e.target.value as CreatorMintAsset }))
                    }
                    className="mt-1 w-full rounded-xl border border-border/30 bg-foreground/6 px-3 py-2.5 text-sm"
                  >
                    <option value="usdg">USDG</option>
                    <option value="eth">ETH</option>
                  </select>
                </label>
              </div>
              <label className="block text-[12px]">
                <span className="text-muted-foreground">Payout wallet · Robinhood Chain</span>
                <input
                  required
                  value={form.payoutWallet}
                  onChange={(e) => setForm((f) => ({ ...f, payoutWallet: e.target.value }))}
                  placeholder="0x…"
                  className="mt-1 w-full rounded-xl border border-border/30 bg-foreground/6 px-3 py-2.5 font-mono text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={createDraft.isPending}
                className="cta-liquid cta-magnetic flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground sm:w-auto"
              >
                {createDraft.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Save draft
              </button>
            </form>
          </Panel>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Drop preview
            </p>
            <CreatorMintFrame
              className="mt-3"
              slug={previewSlug}
              name={form.name || "Your collection"}
              symbol={form.symbol || "DROP"}
              priceLabel={pricePreview}
            />
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground lg:text-left">
              Procedural cover art generates from your slug — upload a custom image later.
            </p>
          </aside>
        </div>

        {/* Collections grid */}
        <section className="relative">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Your drops
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Collections</h2>
            </div>
            <Link
              to="/for/builders"
              className="inline-flex items-center gap-1 rounded-xl border border-border/40 px-3 py-1.5 text-[12px] font-medium text-primary transition hover:border-primary/40"
            >
              How it works <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : collections.length === 0 ? (
            <div className="mt-6 overflow-hidden rounded-[1.65rem] border border-dashed border-primary/25 bg-primary/[0.03] px-6 py-14 text-center">
              <Hexagon className="mx-auto h-12 w-12 text-primary/50" />
              <p className="mt-4 font-display text-lg font-semibold">No drops yet</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] text-muted-foreground">
                Configure your first collection above — when the factory is live, one click deploys
                to Robinhood Chain.
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {collections.map((c, i) => (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group overflow-hidden rounded-[1.35rem] border border-border/40 bg-foreground/[0.03] backdrop-blur-sm transition hover:border-primary/35 hover:shadow-[0_16px_48px_-24px_var(--glow)]"
                >
                  <div className="flex gap-4 p-4">
                    <div className="relative shrink-0">
                      <div className="creator-holo absolute -inset-px rounded-xl opacity-60" />
                      <img
                        src={c.cover_image_url ?? collectionCoverUrl(c.slug)}
                        alt=""
                        className="relative h-24 w-24 rounded-xl object-cover ring-1 ring-white/10"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{c.name}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                            statusTone(c.status),
                          )}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {c.symbol} · {c.max_supply} · {c.mint_asset.toUpperCase()}
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-primary/70">
                        /c/{c.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-border/30 px-4 py-3">
                    {c.status === "live" ? (
                      <>
                        <Link
                          to="/c/$slug"
                          params={{ slug: c.slug }}
                          className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                        >
                          Mint page <ExternalLink className="h-3 w-3" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(collectionMintUrl(c.slug));
                            toast.success("Link copied");
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-border/50 px-3 py-1.5 text-xs font-semibold"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Live on-chain
                        </span>
                      </>
                    ) : c.status === "draft" || c.status === "failed" ? (
                      <button
                        type="button"
                        disabled={publish.isPending || !deployReady}
                        onClick={() => publish.mutate({ data: { collectionId: c.id } })}
                        className="cta-liquid inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {publish.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Rocket className="h-3 w-3" />
                        )}
                        Deploy on Robinhood
                      </button>
                    ) : c.status === "deploying" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" /> Deploying…
                      </span>
                    ) : null}
                  </div>
                  {c.error ? (
                    <p className="px-4 pb-3 text-[12px] text-destructive">{c.error}</p>
                  ) : null}
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
