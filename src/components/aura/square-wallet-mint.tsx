import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base } from "viem/chains";
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

import { SaleWalletRoot } from "@/components/aura/sale-wallet";
import {
  AURA_SQUARE,
  AURA_SQUARE_ABI,
  AURA_SQUARE_COPY,
  auraSquareAddress,
  auraSquareExplorerUrl,
} from "@/lib/aura-square";
import { BASE_USDC, ERC20_ABI } from "@/lib/private-sale";
import { truncateAddress } from "@/lib/siwe-display";

function preferConnector(connectors: readonly Connector[]): Connector | undefined {
  const unique = connectors.filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  return (
    unique.find((c) => c.type === "injected" || /metaMask|injected|rabby|brave/i.test(c.id)) ??
    unique.find((c) => /walletConnect/i.test(c.id) || c.type === "walletConnect") ??
    unique[0]
  );
}

export function SquareWalletMint({ locale = "en" }: { locale?: "en" | "de" }) {
  return (
    <SaleWalletRoot
      wcName="Aura Square"
      wcDescription="Mint Aura Square on Base with USDC"
      wcUrl="https://aibusiness.fun/square"
    >
      <SquareWalletMintInner locale={locale} />
    </SaleWalletRoot>
  );
}

function SquareWalletMintInner({ locale }: { locale: "en" | "de" }) {
  const de = locale === "de";
  const ca = auraSquareAddress();
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const primary = useMemo(() => preferConnector(connectors), [connectors]);

  const [step, setStep] = useState<"idle" | "approve" | "mint">("idle");
  const [done, setDone] = useState<{ txHash: string } | null>(null);

  const onChainPrice = useReadContract({
    address: ca ?? undefined,
    abi: AURA_SQUARE_ABI,
    functionName: "mintPriceUsdc",
    query: { enabled: Boolean(ca) },
  });
  const price = onChainPrice.data && onChainPrice.data > 0n ? onChainPrice.data : AURA_SQUARE.mintUsdcUnits;

  const totalMinted = useReadContract({
    address: ca ?? undefined,
    abi: AURA_SQUARE_ABI,
    functionName: "totalMinted",
    query: { enabled: Boolean(ca), refetchInterval: 12_000 },
  });
  const allowance = useReadContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && ca ? [address, ca] : undefined,
    query: {
      enabled: Boolean(address && ca),
      refetchInterval: step === "approve" ? 3_000 : false,
    },
  });
  const usdcBal = useReadContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const approve = useWriteContract();
  const mintTx = useWriteContract();
  const pendingHash = step === "mint" ? mintTx.data : approve.data;
  const wait = useWaitForTransactionReceipt({ hash: pendingHash });

  const onBase = chainId === base.id;
  const needsApprove = Boolean(ca && (allowance.data == null || allowance.data < price));
  const hasUsdc = usdcBal.data != null && usdcBal.data >= price;
  const soldOut = totalMinted.data != null && Number(totalMinted.data) >= AURA_SQUARE.maxSupply;
  const busy = connecting || switching || approve.isPending || mintTx.isPending || wait.isLoading;
  const nextId = totalMinted.data == null ? null : Number(totalMinted.data) + 1;

  useEffect(() => {
    if (step !== "approve" || !wait.isSuccess || !approve.data || !ca) return;
    void allowance.refetch().then(async (res) => {
      const allowed = res.data ?? 0n;
      if (allowed < price) return;
      setStep("mint");
      try {
        await mintTx.writeContractAsync({
          address: ca,
          abi: AURA_SQUARE_ABI,
          functionName: "mint",
        });
      } catch (err) {
        setStep("idle");
        toast.error(err instanceof Error ? err.message : "Mint failed");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per approve receipt
  }, [step, wait.isSuccess, approve.data]);

  useEffect(() => {
    if (step !== "mint" || !wait.isSuccess || !mintTx.data || done) return;
    setDone({ txHash: mintTx.data });
    setStep("idle");
    toast.success(de ? "Square gemintet" : "Square minted");
    void totalMinted.refetch();
  }, [step, wait.isSuccess, mintTx.data, done, de, totalMinted]);

  const run = useMutation({
    mutationFn: async () => {
      if (!ca) throw new Error(de ? "CA noch nicht veröffentlicht." : "CA is not published yet.");
      if (!address) throw new Error(de ? "Wallet verbinden." : "Connect a wallet.");
      if (!onBase) {
        switchChain({ chainId: base.id });
        return;
      }
      if (soldOut) throw new Error(de ? "Ausverkauft." : "Sold out.");
      if (!hasUsdc) {
        throw new Error(
          de
            ? `Du brauchst $${AURA_SQUARE.mintUsd} USDC auf Base.`
            : `You need $${AURA_SQUARE.mintUsd} USDC on Base.`,
        );
      }
      if (needsApprove) {
        setStep("approve");
        return approve.writeContractAsync({
          address: BASE_USDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ca, price],
        });
      }
      setStep("mint");
      return mintTx.writeContractAsync({
        address: ca,
        abi: AURA_SQUARE_ABI,
        functionName: "mint",
      });
    },
    onError: (e: Error) => {
      setStep("idle");
      toast.error(e.message);
    },
  });

  if (!ca) {
    return (
      <p className="mt-2 text-[13px] text-muted-foreground">
        {de
          ? "CA noch nicht veröffentlicht. Wallet-Mint wartet auf den Contract."
          : "CA unpublished. Wallet mint waits for the contract."}
      </p>
    );
  }

  if (done) {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-[13px] font-semibold text-foreground">
          {de ? "Square ist in deiner Wallet." : "Square is in your wallet."}
        </p>
        <a
          href={`https://basescan.org/tx/${done.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary"
        >
          Basescan <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  const cta = soldOut
    ? de
      ? "Ausverkauft"
      : "Sold out"
    : needsApprove
      ? de
        ? `1/2 · USDC freigeben ($${AURA_SQUARE.mintUsd})`
        : `1/2 · Approve USDC ($${AURA_SQUARE.mintUsd})`
      : de
        ? `Square minten · $${AURA_SQUARE.mintUsd} USDC`
        : `Mint Square · $${AURA_SQUARE.mintUsd} USDC`;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {de ? AURA_SQUARE_COPY.walletMintDe : AURA_SQUARE_COPY.walletMint}
      </p>
      {ca ? (
        <p className="break-all font-mono text-[12px] text-foreground/90">{ca}</p>
      ) : null}
      {auraSquareExplorerUrl(ca) ? (
        <a
          href={auraSquareExplorerUrl(ca)!}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[13px] font-semibold text-primary hover:underline"
        >
          Basescan
        </a>
      ) : null}

      {!isConnected ? (
        <button
          type="button"
          disabled={connecting || !primary}
          onClick={() => primary && connect({ connector: primary })}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-40"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {de ? "Wallet verbinden & minten" : "Connect wallet & mint"}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-muted-foreground">
            {truncateAddress(address ?? "")}
            {usdcBal.data != null ? ` · ${(Number(usdcBal.data) / 1e6).toFixed(2)} USDC` : ""}
            {nextId != null ? ` · #${nextId}` : ""}
          </p>
          {!onBase ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => switchChain({ chainId: base.id })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {de ? "Zu Base wechseln" : "Switch to Base"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || soldOut || run.isPending}
              onClick={() => run.mutate()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy || run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {cta}
            </button>
          )}
          <button
            type="button"
            onClick={() => disconnect()}
            className="w-full rounded-xl border border-border/50 px-4 py-2 text-[11px] font-semibold text-muted-foreground"
          >
            {de ? "Trennen" : "Disconnect"}
          </button>
        </div>
      )}
    </div>
  );
}
