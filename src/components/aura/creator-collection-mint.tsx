import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import type { Connector } from "wagmi";
import { type Address } from "viem";

import { CreatorWalletRoot } from "@/components/aura/creator-wallet";
import {
  CREATOR_COLLECTION_ABI,
  CREATOR_MINT_DESK_ABI,
  formatMintPriceFromWei,
  type CreatorMintAsset,
  type NftCollectionRow,
} from "@/lib/creator-contracts";
import { clientCreatorChainId, clientCreatorStableAddress } from "@/lib/creator-mint-chain";
import { recordCollectionMint } from "@/lib/creator-collections.functions";
import { ERC20_ABI } from "@/lib/private-sale";
import { truncateAddress } from "@/lib/siwe-display";

function preferConnector(connectors: readonly Connector[]): Connector | undefined {
  const unique = connectors.filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  return (
    unique.find((c) => c.type === "injected" || /metaMask|injected|rabby|brave/i.test(c.id)) ??
    unique.find((c) => /walletConnect/i.test(c.id) || c.type === "walletConnect") ??
    unique[0]
  );
}

export function CreatorCollectionMint({ collection }: { collection: NftCollectionRow }) {
  return (
    <CreatorWalletRoot slug={collection.slug}>
      <CreatorCollectionMintInner collection={collection} />
    </CreatorWalletRoot>
  );
}

function CreatorCollectionMintInner({ collection }: { collection: NftCollectionRow }) {
  const desk = collection.mint_desk_address as Address | null;
  const contract = collection.contract_address as Address | null;
  const asset = collection.mint_asset as CreatorMintAsset;
  const priceWei = BigInt(collection.mint_price_wei || "0");
  const targetChainId = clientCreatorChainId();
  const stable = clientCreatorStableAddress();

  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const primary = useMemo(() => preferConnector(connectors), [connectors]);

  const [step, setStep] = useState<"idle" | "approve" | "mint">("idle");
  const [doneTx, setDoneTx] = useState<string | null>(null);

  const totalMinted = useReadContract({
    address: contract ?? undefined,
    abi: CREATOR_COLLECTION_ABI,
    functionName: "totalMinted",
    query: { enabled: Boolean(contract), refetchInterval: 12_000 },
  });

  const allowance = useReadContract({
    address: stable,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && desk ? [address, desk] : undefined,
    query: {
      enabled: Boolean(address && desk && asset === "usdg"),
      refetchInterval: step === "approve" ? 3_000 : false,
    },
  });

  const { writeContract, data: txHash, isPending: writing, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  const recordMint = useMutation({ mutationFn: recordCollectionMint });

  useEffect(() => {
    if (receipt.isSuccess && txHash && address) {
      setDoneTx(txHash);
      setStep("idle");
      reset();
      void recordMint.mutateAsync({
        data: {
          slug: collection.slug,
          tokenId: Number(totalMinted.data ?? 0),
          minterWallet: address,
          txHash,
          pricePaidWei: collection.mint_price_wei,
        },
      });
      toast.success("Minted!");
    }
  }, [receipt.isSuccess, txHash, address, collection, totalMinted.data, recordMint, reset]);

  const soldOut =
    collection.status === "sold_out" ||
    (totalMinted.data !== undefined && totalMinted.data >= BigInt(collection.max_supply));

  const onWrongChain = isConnected && chainId !== targetChainId;
  const needsApprove =
    asset === "usdg" &&
    priceWei > 0n &&
    (allowance.data === undefined || allowance.data < priceWei);

  const mint = () => {
    if (!desk || !address) return;
    if (asset === "usdg" && needsApprove) {
      setStep("approve");
      writeContract({
        address: stable,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [desk, priceWei],
      });
      return;
    }
    setStep("mint");
    writeContract({
      address: desk,
      abi: CREATOR_MINT_DESK_ABI,
      functionName: "mintPaid",
      args: [address],
      value: asset === "eth" ? priceWei : undefined,
    });
  };

  useEffect(() => {
    if (step === "approve" && !needsApprove && address && desk) {
      setStep("mint");
      writeContract({
        address: desk,
        abi: CREATOR_MINT_DESK_ABI,
        functionName: "mintPaid",
        args: [address],
      });
    }
  }, [step, needsApprove, address, desk, writeContract]);

  const minted = Number(totalMinted.data ?? 0);
  const pct = Math.min(100, Math.round((minted / collection.max_supply) * 100));

  return (
    <div className="relative overflow-hidden rounded-[1.65rem] border border-primary/25 bg-[#07090e]/95 shadow-[0_24px_80px_-32px_var(--glow)] backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/12 to-transparent"
      />
      <div className="relative border-b border-white/8 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400/80" />
              <span className="h-2 w-2 rounded-full bg-gold/80" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Mint terminal
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {collection.symbol}
          </span>
        </div>
      </div>

      <div className="relative p-5 pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Mint progress
          </span>
          <span className="font-mono text-[12px] text-primary">
            {minted} / {collection.max_supply}
          </span>
        </div>
        <div className="mb-5 h-2.5 overflow-hidden rounded-full bg-foreground/10 ring-1 ring-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-gold transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Mint price
            </p>
            <p className="text-money mt-1 text-3xl font-bold tracking-tight">
              {formatMintPriceFromWei(collection.mint_price_wei, asset)}
            </p>
          </div>
          <p className="text-right text-[11px] text-muted-foreground">
            Primary sale
            <br />
            {collection.royalty_bps / 100}% creator royalty
          </p>
        </div>

        {!desk || !contract ? (
          <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Mint desk not configured.
          </p>
        ) : soldOut ? (
          <p className="mt-5 rounded-xl border border-gold/35 bg-gold/10 px-4 py-3 text-center text-sm font-semibold text-gold">
            Sold out
          </p>
        ) : !isConnected ? (
          <button
            type="button"
            disabled={!primary || connecting}
            onClick={() => primary && connect({ connector: primary })}
            className="cta-liquid cta-magnetic mt-6 w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground"
          >
            Connect wallet to mint
          </button>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-border/30 bg-foreground/[0.04] px-3 py-2 font-mono text-[11px] text-muted-foreground">
              {truncateAddress(address ?? "")}
              <button
                type="button"
                onClick={() => disconnect()}
                className="ml-2 text-primary underline-offset-2 hover:underline"
              >
                disconnect
              </button>
            </div>
            {onWrongChain ? (
              <button
                type="button"
                disabled={switching}
                onClick={() => switchChain({ chainId: targetChainId })}
                className="w-full rounded-2xl border border-primary/45 bg-primary/10 px-4 py-3.5 text-sm font-semibold text-primary"
              >
                Switch to Robinhood Chain
              </button>
            ) : (
              <button
                type="button"
                disabled={writing || receipt.isLoading}
                onClick={mint}
                className="cta-liquid cta-magnetic flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground"
              >
                {(writing || receipt.isLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                {step === "approve" ? "Approve USDG…" : "Mint now"}
              </button>
            )}
          </div>
        )}

        {doneTx ? (
          <a
            href={`https://robinhoodchain.blockscout.com/tx/${doneTx}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 py-2.5 text-[12px] font-medium text-primary"
          >
            View on Blockscout <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
