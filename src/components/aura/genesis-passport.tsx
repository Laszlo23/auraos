import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import {
  claimGenesisNft,
  createGenesisCheckout,
  getGenesisStatus,
  markGenesisPaidFromX402,
} from "@/lib/genesis.functions";
import { mediaPath } from "@/lib/site";

const GENESIS_ART = mediaPath("/genesis-passport.webp");
const GENESIS_ART_FALLBACK = mediaPath("/genesis-passport.jpg");

/** Genesis = Founding Company Passport — utility NFT, not an investment / not token launch. */
export function GenesisPassport({
  companyName,
  slug,
  seat,
}: {
  companyName?: string | undefined;
  slug?: string | null | undefined;
  seat?: number | null | undefined;
}) {
  const qc = useQueryClient();
  const { data: status, isLoading } = useQuery({
    queryKey: ["genesis-status"],
    queryFn: () => getGenesisStatus(),
    staleTime: 15_000,
  });

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("genesis") === "success") {
      toast.success("Payment received — claim your passport mint when ready.");
      void qc.invalidateQueries({ queryKey: ["genesis-status"] });
    }
    if (params.get("genesis") === "cancel") {
      toast.message("Genesis checkout canceled");
    }
  }, [qc]);

  const checkout = useMutation({
    mutationFn: () => createGenesisCheckout(),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmX402 = useMutation({
    mutationFn: () => markGenesisPaidFromX402({ data: {} }),
    onSuccess: async () => {
      toast.success("x402 payment confirmed");
      await qc.invalidateQueries({ queryKey: ["genesis-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const claim = useMutation({
    mutationFn: () => claimGenesisNft(),
    onSuccess: async (res) => {
      toast.success(res.already ? "Already minted onchain" : "Genesis Passport minted");
      await qc.invalidateQueries({ queryKey: ["genesis-status"] });
      await qc.invalidateQueries({ queryKey: ["holder-perks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onBuy = async () => {
    setBusy(true);
    try {
      await checkout.mutateAsync();
    } finally {
      setBusy(false);
    }
  };

  const st = status?.status ?? "none";
  const minted = st === "minted" || Boolean(status?.ownsOnchain);
  const tokenId = status?.tokenId ?? seat ?? null;
  const metaUrl =
    tokenId != null ? `/api/genesis/meta/${tokenId}` : "/api/genesis/meta/1";

  return (
    <Panel label="Genesis · Founding Company Passport" delay={0.06} glow={minted}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,220px)_1fr]">
        <div className="mx-auto w-full max-w-[220px]">
          <div className="overflow-hidden rounded-[1.35rem] border border-gold/25 bg-foreground/[0.04] shadow-[0_0_40px_-12px_oklch(0.75_0.12_85/0.45)]">
            <picture>
              <source srcSet={GENESIS_ART} type="image/webp" />
              <img
                src={GENESIS_ART_FALLBACK}
                alt="Aura Genesis Passport official seal — founding company membership art"
                title="Aura Genesis Passport seal"
                width={800}
                height={800}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
              />
            </picture>
          </div>
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Official seal art
          </p>
        </div>

        <div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Membership utility for founding companies — not an investment product and not part of the
            token launch. Pay first, then claim a server-gated mint to your smart wallet.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="glass-soft rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Company</p>
              <p className="mt-1 font-semibold">{companyName ?? "Your company"}</p>
              {slug && <p className="mt-1 font-mono text-[11px] text-primary">/company/{slug}</p>}
            </div>
            <div className="glass-soft rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {minted ? (
                  <Chip tone="gold">Minted</Chip>
                ) : st === "paid" ? (
                  <Chip tone="primary">Paid — claim mint</Chip>
                ) : st === "pending" ? (
                  <Chip>Checkout pending</Chip>
                ) : (
                  <Chip>Available</Chip>
                )}
                {seat != null && <Chip tone="primary">Seat #{seat}</Chip>}
                {tokenId != null && minted ? <Chip tone="gold">#{tokenId}</Chip> : null}
              </div>
              {isLoading ? (
                <p className="mt-2 text-[12px] text-muted-foreground">Loading…</p>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {status?.priceUsdc ?? 99} USDC · cap {status?.maxSupply ?? 1000}
                  {status?.contract
                    ? ` · ${status.contract.slice(0, 8)}…`
                    : " · contract pending deploy"}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {!minted && status?.canCheckout && status.stripeConfigured ? (
              <button
                type="button"
                disabled={busy || checkout.isPending}
                onClick={() => void onBuy()}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-40"
              >
                {(busy || checkout.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Buy with card (${status.priceUsdc}) — Stripe
              </button>
            ) : null}

            {!minted && status?.canCheckout && !status.stripeConfigured ? (
              <p className="text-[12px] text-muted-foreground">
                Fiat checkout needs <span className="font-mono">STRIPE_PRICE_GENESIS_NFT</span>. You
                can still pay via x402 (genesis-passport) then confirm below.
              </p>
            ) : null}

            {!minted && st !== "paid" ? (
              <button
                type="button"
                disabled={confirmX402.isPending}
                onClick={() => confirmX402.mutate()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 px-4 py-2.5 text-[12px] font-semibold disabled:opacity-40"
              >
                {confirmX402.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm x402 payment
              </button>
            ) : null}

            {status?.canClaim ? (
              <button
                type="button"
                disabled={claim.isPending}
                onClick={() => claim.mutate()}
                className="inline-flex items-center gap-2 rounded-2xl bg-gold/90 px-4 py-2.5 text-[12px] font-semibold text-background disabled:opacity-40"
              >
                {claim.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Claim mint to wallet
              </button>
            ) : null}

            {st === "paid" && !status?.mintConfigured ? (
              <p className="w-full text-[12px] text-muted-foreground">
                Payment recorded. Mint unlocks when{" "}
                <span className="font-mono">GENESIS_NFT_CONTRACT</span> +{" "}
                <span className="font-mono">GENESIS_MINTER_KEY</span> are set (Sepolia first).
              </p>
            ) : null}

            {status?.explorerTx ? (
              <a
                href={status.explorerTx}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary"
              >
                View mint tx <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}

            <a
              href={metaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary"
            >
              Token metadata <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {status?.error ? (
            <p className="mt-3 text-[12px] text-destructive">{status.error}</p>
          ) : null}
          {!status?.wallet && !isLoading ? (
            <p className="mt-3 text-[12px] text-muted-foreground">
              Create your smart wallet above before claiming the mint.
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
