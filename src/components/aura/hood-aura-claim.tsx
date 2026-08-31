import { useMemo, useState } from "react";
import { formatEther } from "viem";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base } from "viem/chains";
import {
  useAccount,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import type { Connector } from "wagmi";

import { SaleWalletRoot } from "@/components/aura/sale-wallet";
import {
  HOOD_ESCROW_ABI,
  HOOD_GIFT_DROP_ABI,
  HOOD_PASSPORT_ABI,
  genesisPassportAddress,
  hoodMintExplorer,
  launchEscrowAddress,
  launchGiftDropAddress,
} from "@/lib/aura-launch";
import { truncateAddress } from "@/lib/siwe-display";

function preferConnector(connectors: readonly Connector[]): Connector | undefined {
  const unique = connectors.filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  return (
    unique.find((c) => c.type === "injected" || /metaMask|injected|rabby|brave/i.test(c.id)) ??
    unique.find((c) => /walletConnect/i.test(c.id) || c.type === "walletConnect") ??
    unique[0]
  );
}

export function HoodAuraClaim({
  locale = "en",
  tokenId: forcedTokenId,
}: {
  locale?: "en" | "de";
  /** When set, claim this Hood only. Otherwise scan balance for claimable ids. */
  tokenId?: number;
}) {
  return (
    <SaleWalletRoot
      wcName="The Hood"
      wcDescription="Claim unlocked AURA for your Hood"
      wcUrl="https://aibusiness.fun/hood"
    >
      <HoodAuraClaimInner locale={locale} forcedTokenId={forcedTokenId} />
    </SaleWalletRoot>
  );
}

function HoodAuraClaimInner({
  locale,
  forcedTokenId,
}: {
  locale: "en" | "de";
  forcedTokenId?: number;
}) {
  const de = locale === "de";
  const gifts = launchGiftDropAddress();
  const passport = genesisPassportAddress();
  const escrow = launchEscrowAddress();

  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const primary = useMemo(() => preferConnector(connectors), [connectors]);
  const { writeContractAsync, isPending: writing } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const receipt = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  const launched = useReadContract({
    address: escrow ?? undefined,
    abi: HOOD_ESCROW_ABI,
    functionName: "launched",
    query: { enabled: Boolean(escrow), refetchInterval: 15_000 },
  });

  const t0 = useReadContract({
    address: gifts ?? undefined,
    abi: HOOD_GIFT_DROP_ABI,
    functionName: "t0",
    query: { enabled: Boolean(gifts), refetchInterval: 15_000 },
  });

  const balance = useReadContract({
    address: passport ?? undefined,
    abi: HOOD_PASSPORT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(passport && address), refetchInterval: 12_000 },
  });

  const totalMinted = useReadContract({
    address: passport ?? undefined,
    abi: HOOD_PASSPORT_ABI,
    functionName: "totalMinted",
    query: { enabled: Boolean(passport), refetchInterval: 20_000 },
  });

  const marketLive = Boolean(launched.data) && Boolean(t0.data && t0.data > 0n);

  const candidateIds = useMemo(() => {
    if (forcedTokenId && forcedTokenId > 0) return [forcedTokenId];
    const minted = Number(totalMinted.data ?? 0n);
    if (!minted || !address) return [];
    // Scan minted range; cheap for early supply, capped for safety.
    const cap = Math.min(minted, 1000);
    const ids: number[] = [];
    for (let id = 1; id <= cap; id++) ids.push(id);
    return ids;
  }, [forcedTokenId, totalMinted.data, address]);

  // Read ownership + pending for a small window when connected (first N for UI).
  const scanIds = candidateIds.slice(0, forcedTokenId ? 1 : 64);

  if (!gifts || !passport) {
    return (
      <p className="text-[13px] text-muted-foreground">
        {de
          ? "Gift-Drop-CA noch nicht gesetzt — Claim nach Desk-v2-Deploy."
          : "Gift drop CA not set yet — claim after Desk v2 deploy."}
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background/40 p-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {de ? "AURA Claim" : "AURA claim"}
        </p>
        <h3 className="mt-1 font-display text-lg tracking-tight">
          {de ? "AURA in deine Wallet" : "AURA into your wallet"}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {de
            ? "Ab T-0: 7.777 AURA plus Buy-Bonus — sofort claimbar, kein 90-Tage-Lock."
            : "From T-0: 7,777 AURA plus buy bonus — claim now, no 90-day lock."}
        </p>
      </div>

      {!marketLive ? (
        <p className="text-[13px] text-amber-200/90">
          {de
            ? "Markt noch nicht ausgeführt. Nach executeMarket() kannst du claimen."
            : "Market not executed yet. Claim opens right after executeMarket()."}
        </p>
      ) : null}

      {!isConnected ? (
        <button
          type="button"
          disabled={!primary || connecting}
          onClick={() => primary && connect({ connector: primary, chainId: base.id })}
          className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-[13px] font-medium text-background disabled:opacity-50"
        >
          {connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : de ? (
            "Wallet verbinden"
          ) : (
            "Connect wallet"
          )}
        </button>
      ) : chainId !== base.id ? (
        <button
          type="button"
          disabled={switching}
          onClick={() => switchChain({ chainId: base.id })}
          className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-[13px] font-medium text-background"
        >
          {switching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : de ? (
            "Zu Base wechseln"
          ) : (
            "Switch to Base"
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-[12px] text-muted-foreground">
            {truncateAddress(address)} · {de ? "Hoods" : "Hoods"}: {String(balance.data ?? 0n)}
          </p>
          {scanIds.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              {de ? "Keine Hoods in dieser Wallet." : "No Hoods in this wallet."}
            </p>
          ) : (
            scanIds.map((id) => (
              <ClaimRow
                key={id}
                tokenId={id}
                ownerFilter={address!}
                gifts={gifts}
                passport={passport}
                de={de}
                marketLive={marketLive}
                busy={writing || (claimingId === id && !receipt.isSuccess)}
                onClaim={async () => {
                  try {
                    setClaimingId(id);
                    const hash = await writeContractAsync({
                      address: gifts,
                      abi: HOOD_GIFT_DROP_ABI,
                      functionName: "claim",
                      args: [BigInt(id)],
                      chainId: base.id,
                    });
                    setTxHash(hash);
                    toast.success(de ? `Hood #${id} Claim gesendet` : `Hood #${id} claim sent`);
                  } catch (err) {
                    setClaimingId(null);
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : de
                          ? "Claim fehlgeschlagen"
                          : "Claim failed",
                    );
                  }
                }}
              />
            ))
          )}
          {txHash ? (
            <a
              href={hoodMintExplorer(txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground underline-offset-2 hover:underline"
            >
              Basescan <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ClaimRow({
  tokenId,
  ownerFilter,
  gifts,
  passport,
  de,
  marketLive,
  busy,
  onClaim,
}: {
  tokenId: number;
  ownerFilter: `0x${string}`;
  gifts: `0x${string}`;
  passport: `0x${string}`;
  de: boolean;
  marketLive: boolean;
  busy: boolean;
  onClaim: () => void;
}) {
  const owner = useReadContract({
    address: passport,
    abi: HOOD_PASSPORT_ABI,
    functionName: "ownerOf",
    args: [BigInt(tokenId)],
    query: { refetchInterval: 20_000 },
  });
  const pending = useReadContract({
    address: gifts,
    abi: HOOD_GIFT_DROP_ABI,
    functionName: "pending",
    args: [BigInt(tokenId)],
    query: { refetchInterval: 12_000 },
  });
  const already = useReadContract({
    address: gifts,
    abi: HOOD_GIFT_DROP_ABI,
    functionName: "claimed",
    args: [BigInt(tokenId)],
    query: { refetchInterval: 12_000 },
  });

  const isOwner =
    typeof owner.data === "string" && owner.data.toLowerCase() === ownerFilter.toLowerCase();
  if (owner.isError || !isOwner) return null;

  const amount = pending.data ?? 0n;
  const claimed = Boolean(already.data);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 first:border-0 first:pt-0">
      <div className="text-[13px]">
        <span className="font-medium">Hood #{tokenId}</span>
        <span className="ml-2 text-muted-foreground">
          {claimed
            ? de
              ? "bereits geclaimt"
              : "already claimed"
            : amount > 0n
              ? `${Number(formatEther(amount)).toLocaleString(de ? "de-DE" : "en-US", { maximumFractionDigits: 0 })} AURA`
              : de
                ? "kein Pending"
                : "nothing pending"}
        </span>
      </div>
      <button
        type="button"
        disabled={!marketLive || claimed || amount === 0n || busy}
        onClick={onClaim}
        className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-3 text-[12px] font-medium text-background disabled:opacity-40"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : de ? (
          "AURA claimen"
        ) : (
          "Claim AURA"
        )}
      </button>
    </div>
  );
}
