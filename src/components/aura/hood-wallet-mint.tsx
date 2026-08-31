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
  HOOD_ESCROW_ABI,
  HOOD_PASSPORT_ABI,
  HOOD_PRICE_USDC_UNITS,
  genesisPassportAddress,
  hoodMintExplorer,
  launchEscrowAddress,
} from "@/lib/aura-launch";
import { FOUNDING_SEAT_DISPLAY } from "@/lib/founding-price";
import { hoodWalletMintAllowed } from "@/lib/hood-early";
import { hoodMintIsOpen } from "@/lib/hood-mint";
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

export function HoodWalletMint({
  locale = "en",
  compact = false,
  earlyUnlocked = false,
  onMinted,
}: {
  locale?: "en" | "de";
  compact?: boolean;
  /** Password-gated early supporter unlock (first 333). */
  earlyUnlocked?: boolean;
  onMinted?: (opts: { tokenId: number; txHash: string; wallet: string }) => void;
}) {
  return (
    <SaleWalletRoot
      wcName="The Hood"
      wcDescription="Mint The Hood on Base with USDC"
      wcUrl="https://aibusiness.fun/hood"
    >
      <HoodWalletMintInner
        locale={locale}
        compact={compact}
        earlyUnlocked={earlyUnlocked}
        onMinted={onMinted}
      />
    </SaleWalletRoot>
  );
}

function HoodWalletMintInner({
  locale,
  compact,
  earlyUnlocked,
  onMinted,
}: {
  locale: "en" | "de";
  compact: boolean;
  earlyUnlocked: boolean;
  onMinted?: (opts: { tokenId: number; txHash: string; wallet: string }) => void;
}) {
  const de = locale === "de";
  const escrow = launchEscrowAddress();
  const passport = genesisPassportAddress();
  const publicOpen = hoodMintIsOpen();

  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const primary = useMemo(() => preferConnector(connectors), [connectors]);

  const [pendingTokenId, setPendingTokenId] = useState<number | null>(null);
  const [done, setDone] = useState<{ tokenId: number; txHash: string } | null>(null);
  const [step, setStep] = useState<"idle" | "approve" | "mint">("idle");

  const totalMinted = useReadContract({
    address: passport ?? undefined,
    abi: HOOD_PASSPORT_ABI,
    functionName: "totalMinted",
    query: { enabled: Boolean(passport), refetchInterval: 12_000 },
  });
  const owned = useReadContract({
    address: passport ?? undefined,
    abi: HOOD_PASSPORT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(passport && address), refetchInterval: 8_000 },
  });
  const allowance = useReadContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && escrow ? [address, escrow] : undefined,
    query: {
      enabled: Boolean(address && escrow),
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

  const nextId = useMemo(() => {
    const minted = totalMinted.data;
    if (minted == null) return null;
    return Number(minted) + 1;
  }, [totalMinted.data]);

  const mintedCount = totalMinted.data == null ? null : Number(totalMinted.data);
  const mintAllowed = hoodWalletMintAllowed({
    publicOpen,
    earlyUnlocked,
    totalMinted: mintedCount,
  });
  const earlyOnly = earlyUnlocked && !publicOpen;

  const approve = useWriteContract();
  const mintTx = useWriteContract();
  const pendingHash = step === "mint" ? mintTx.data : approve.data;
  const wait = useWaitForTransactionReceipt({ hash: pendingHash });

  const onBase = chainId === base.id;
  const needsApprove = Boolean(
    escrow && (allowance.data == null || allowance.data < HOOD_PRICE_USDC_UNITS),
  );
  const hasUsdc = usdcBal.data != null && usdcBal.data >= HOOD_PRICE_USDC_UNITS;
  const alreadyOwns = Boolean(owned.data && owned.data > 0n);
  const busy = connecting || switching || approve.isPending || mintTx.isPending || wait.isLoading;

  // After approve confirms, refresh allowance then auto-mint.
  useEffect(() => {
    if (step !== "approve" || !wait.isSuccess || !approve.data) return;
    void allowance.refetch().then(async (res) => {
      const allowed = res.data ?? 0n;
      if (allowed < HOOD_PRICE_USDC_UNITS || !escrow || !address || pendingTokenId == null) {
        return;
      }
      setStep("mint");
      try {
        await mintTx.writeContractAsync({
          address: escrow,
          abi: HOOD_ESCROW_ABI,
          functionName: "mintPaid",
          args: [address, BigInt(pendingTokenId)],
        });
      } catch (err) {
        setStep("idle");
        toast.error(err instanceof Error ? err.message : "Mint failed");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per approve receipt
  }, [step, wait.isSuccess, approve.data]);

  // Mint receipt → done
  useEffect(() => {
    if (step !== "mint" || !wait.isSuccess || !mintTx.data || !address || pendingTokenId == null) {
      return;
    }
    if (done) return;
    const result = { tokenId: pendingTokenId, txHash: mintTx.data };
    setDone(result);
    setStep("idle");
    toast.success(de ? `Hood #${pendingTokenId} gemintet` : `Hood #${pendingTokenId} minted`);
    onMinted?.({ ...result, wallet: address });
    void totalMinted.refetch();
    void owned.refetch();
  }, [
    step,
    wait.isSuccess,
    mintTx.data,
    address,
    pendingTokenId,
    done,
    de,
    onMinted,
    totalMinted,
    owned,
  ]);

  const run = useMutation({
    mutationFn: async () => {
      if (!escrow || !passport)
        throw new Error(de ? "Contract fehlt." : "Contract not configured.");
      if (!mintAllowed) {
        throw new Error(
          earlyUnlocked
            ? de
              ? "Early-Welle voll (333)."
              : "Early wave full (333)."
            : de
              ? "Mint noch nicht offen — Early Pass nötig."
              : "Mint not open yet — early pass required.",
        );
      }
      if (!address) throw new Error(de ? "Wallet verbinden." : "Connect a wallet.");
      if (!onBase) {
        switchChain({ chainId: base.id });
        return;
      }
      if (alreadyOwns) {
        throw new Error(
          de ? "Diese Wallet hat schon ein Hood." : "This wallet already holds a Hood.",
        );
      }
      if (!hasUsdc) {
        throw new Error(
          de
            ? `Du brauchst ${FOUNDING_SEAT_DISPLAY} USDC auf Base.`
            : `You need ${FOUNDING_SEAT_DISPLAY} USDC on Base.`,
        );
      }
      const id = nextId;
      if (id == null || id < 1 || id > 1000) {
        throw new Error(de ? "Ausverkauft." : "Sold out.");
      }
      if (earlyOnly && id > 333) {
        throw new Error(de ? "Early-Welle voll (333)." : "Early wave full (333).");
      }
      setPendingTokenId(id);

      if (needsApprove) {
        setStep("approve");
        return approve.writeContractAsync({
          address: BASE_USDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [escrow, HOOD_PRICE_USDC_UNITS],
        });
      }
      setStep("mint");
      return mintTx.writeContractAsync({
        address: escrow,
        abi: HOOD_ESCROW_ABI,
        functionName: "mintPaid",
        args: [address, BigInt(id)],
      });
    },
    onError: (e: Error) => {
      setStep("idle");
      toast.error(e.message);
    },
  });

  if (!escrow || !passport) {
    return (
      <p className="text-[12px] text-muted-foreground">
        {de ? "Hood-Contract noch nicht verdrahtet." : "Hood contract not wired yet."}
      </p>
    );
  }

  if (done) {
    return (
      <div
        className={
          compact ? "space-y-2" : "space-y-3 rounded-2xl border border-gold/30 bg-gold/5 p-4"
        }
      >
        <p className="text-[13px] font-semibold text-gold">
          {de
            ? `Hood #${done.tokenId} ist in deiner Wallet`
            : `Hood #${done.tokenId} is in your wallet`}
        </p>
        <a
          href={hoodMintExplorer(done.txHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary"
        >
          Basescan <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  const ctaLabel = !mintAllowed
    ? earlyUnlocked
      ? de
        ? "Early voll"
        : "Early full"
      : de
        ? "Early Pass nötig"
        : "Need early pass"
    : needsApprove
      ? de
        ? `1/2 · USDC freigeben (${FOUNDING_SEAT_DISPLAY})`
        : `1/2 · Approve USDC (${FOUNDING_SEAT_DISPLAY})`
      : earlyOnly
        ? de
          ? `Early Mint · ${FOUNDING_SEAT_DISPLAY}`
          : `Early mint · ${FOUNDING_SEAT_DISPLAY}`
        : de
          ? `Mint Hood · ${FOUNDING_SEAT_DISPLAY}`
          : `Mint Hood · ${FOUNDING_SEAT_DISPLAY}`;

  return (
    <div
      className={
        compact
          ? "space-y-3"
          : "space-y-4 rounded-[1.4rem] border border-gold/30 bg-[#07090e]/70 p-4 sm:p-5"
      }
    >
      {!compact ? (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
            {de ? "Wallet-Mint" : "Wallet mint"}
          </p>
          <p className="text-[14px] leading-relaxed text-foreground/85">
            {earlyOnly
              ? de
                ? `Early Supporter (max 333): Wallet verbinden, ${FOUNDING_SEAT_DISPLAY} USDC freigeben, minten.`
                : `Early supporter (max 333): connect wallet, approve ${FOUNDING_SEAT_DISPLAY} USDC, mint.`
              : de
                ? `Ein Flow: Wallet verbinden, ${FOUNDING_SEAT_DISPLAY} USDC freigeben, minten. 70% landen on-chain im Launch-Escrow.`
                : `One flow: connect wallet, approve ${FOUNDING_SEAT_DISPLAY} USDC, mint. 70% lands on-chain in the launch escrow.`}
          </p>
        </>
      ) : null}

      {!isConnected ? (
        <button
          type="button"
          disabled={connecting || !primary || !mintAllowed}
          onClick={() => primary && connect({ connector: primary })}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-background disabled:opacity-50"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mintAllowed
            ? de
              ? "Wallet verbinden & minten"
              : "Connect wallet & mint"
            : de
              ? "Zuerst Early Pass oben"
              : "Unlock early pass above first"}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-muted-foreground">
            {truncateAddress(address ?? "")}
            {usdcBal.data != null ? ` · ${(Number(usdcBal.data) / 1e6).toFixed(2)} USDC` : ""}
            {nextId != null ? ` · #${nextId}` : ""}
            {earlyOnly ? (de ? " · early" : " · early") : ""}
          </p>
          {alreadyOwns ? (
            <p className="text-[13px] font-semibold text-gold">
              {de ? "Diese Wallet hält schon ein Hood." : "This wallet already holds a Hood."}
            </p>
          ) : !onBase ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => switchChain({ chainId: base.id })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-background"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {de ? "Zu Base wechseln" : "Switch to Base"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !mintAllowed || run.isPending}
              onClick={() => run.mutate()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-background disabled:opacity-50"
            >
              {busy || run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {ctaLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => disconnect()}
            className="w-full rounded-2xl border border-border/50 px-4 py-2 text-[11px] font-semibold text-muted-foreground"
          >
            {de ? "Trennen" : "Disconnect"}
          </button>
        </div>
      )}
    </div>
  );
}
