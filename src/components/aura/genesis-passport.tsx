import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { HoodEarlyPassGate } from "@/components/aura/hood-early-pass";
import { HoodMintCountdown } from "@/components/aura/hood-mint-countdown";
import { HoodPortrait } from "@/components/aura/hood-portrait";
import { HoodWalletMint } from "@/components/aura/hood-wallet-mint";
import { Chip, Panel } from "@/components/aura/primitives";
import {
  claimGenesisNft,
  createGenesisCheckout,
  getGenesisStatus,
  markGenesisPaidFromX402,
  recordHoodWalletMint,
} from "@/lib/genesis.functions";
import { resolveHoodTraits } from "@/lib/hood-traits";
import { hoodMintIsOpen } from "@/lib/hood-mint";

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
  const [autoClaimed, setAutoClaimed] = useState(false);
  const [earlyUnlocked, setEarlyUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("genesis") === "success") {
      toast.success("Payment received — claiming your Hood…");
      void qc.invalidateQueries({ queryKey: ["genesis-status"] });
    }
    if (params.get("genesis") === "cancel") {
      toast.message("Hood checkout canceled");
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
      toast.success(res.already ? "Already minted onchain" : "The Hood minted");
      await qc.invalidateQueries({ queryKey: ["genesis-status"] });
      await qc.invalidateQueries({ queryKey: ["holder-perks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Paid + wallet ready → claim without a second click.
  useEffect(() => {
    if (autoClaimed) return;
    if (!status?.canClaim) return;
    setAutoClaimed(true);
    claim.mutate();
    // Intentionally omit `claim` — mutate once when canClaim flips true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.canClaim, autoClaimed]);

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
  const tokenId = status?.tokenId ?? seat ?? 1;
  const traits = resolveHoodTraits(tokenId);
  const metaUrl = `/api/genesis/meta/${tokenId}`;
  const showWalletMint =
    !minted &&
    Boolean(status?.escrowConfigured) &&
    (Boolean(status?.mintOpen) || earlyUnlocked || hoodMintIsOpen());

  return (
    <Panel label="The Hood · founding circle" delay={0.06} glow={minted}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,220px)_1fr]">
        <div className="mx-auto w-full max-w-[220px]">
          <HoodPortrait tokenId={tokenId} size="passport" />
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.18em] text-gold/80">
            {traits.character.name} · {traits.seal.label}
            {minted ? ` · #${tokenId}` : " · preview"}
          </p>
        </div>

        <div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            The Hood is the founding-circle key — not an investment and not the AURA launch token.
            Mint with your wallet in one flow: connect → approve $299 USDC → mint. 70% goes on-chain
            into the launch escrow. Card / x402 still work if you prefer.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="glass-soft rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Company
              </p>
              <p className="mt-1 font-semibold">{companyName ?? "Your company"}</p>
              {slug && <p className="mt-1 font-mono text-[11px] text-primary">/company/{slug}</p>}
            </div>
            <div className="glass-soft rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {minted ? (
                  <Chip tone="gold">Minted</Chip>
                ) : st === "paid" ? (
                  <Chip tone="primary">Paid — minting…</Chip>
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
                  {status?.priceUsdc ?? 299} USDC · cap {status?.maxSupply ?? 1000}
                  {status?.contract
                    ? ` · ${status.contract.slice(0, 8)}…`
                    : " · contract pending deploy"}
                </p>
              )}
            </div>
          </div>

          {showWalletMint || (!minted && !status?.mintOpen) ? (
            <div className="mt-5 space-y-4">
              {!status?.mintOpen ? (
                <HoodEarlyPassGate locale="en" onUnlocked={setEarlyUnlocked} />
              ) : null}
              {showWalletMint ? (
                <HoodWalletMint
                  compact
                  earlyUnlocked={earlyUnlocked}
                  onMinted={(opts) => {
                    void recordHoodWalletMint({
                      data: {
                        wallet: opts.wallet,
                        tokenId: opts.tokenId,
                        txHash: opts.txHash,
                      },
                    })
                      .then(async () => {
                        await qc.invalidateQueries({ queryKey: ["genesis-status"] });
                        await qc.invalidateQueries({ queryKey: ["holder-perks"] });
                      })
                      .catch(() => {
                        /* on-chain mint already succeeded */
                      });
                  }}
                />
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {!minted && !status?.mintOpen && st !== "paid" ? (
              <div className="w-full">
                <HoodMintCountdown locale="en" showSocials={false} />
              </div>
            ) : null}
            {!minted && status?.canCheckout && status.stripeConfigured ? (
              <button
                type="button"
                disabled={busy || checkout.isPending}
                onClick={() => void onBuy()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/60 px-4 py-2.5 text-[12px] font-semibold disabled:opacity-40"
              >
                {(busy || checkout.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Or pay with card (${status.priceUsdc})
              </button>
            ) : null}

            {!minted && status?.canCheckout && !status.stripeConfigured && !showWalletMint ? (
              <p className="text-[12px] text-muted-foreground">
                Fiat checkout needs <span className="font-mono">STRIPE_PRICE_GENESIS_NFT</span>. You
                can still pay via x402 (genesis-passport) then confirm below.
              </p>
            ) : null}

            {!minted && status?.mintOpen && st !== "paid" ? (
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

            {status?.canClaim && claim.isPending ? (
              <p className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Claiming mint to your wallet…
              </p>
            ) : null}

            {status?.canClaim && !claim.isPending && claim.isError ? (
              <button
                type="button"
                onClick={() => claim.mutate()}
                className="inline-flex items-center gap-2 rounded-2xl bg-gold/90 px-4 py-2.5 text-[12px] font-semibold text-background"
              >
                Retry claim mint
              </button>
            ) : null}

            {st === "paid" && !status?.mintConfigured ? (
              <p className="w-full text-[12px] text-muted-foreground">
                Payment recorded. Use wallet mint above, or set{" "}
                <span className="font-mono">GENESIS_MINTER_KEY</span> for server claim.
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
          {!status?.wallet && !isLoading && !showWalletMint ? (
            <p className="mt-3 text-[12px] text-muted-foreground">
              Connect any Base wallet above to mint, or create your smart wallet first.
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
