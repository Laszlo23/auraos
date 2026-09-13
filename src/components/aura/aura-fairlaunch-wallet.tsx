import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { base } from "wagmi/chains";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";

import {
  AURA_GET_COPY,
  auraGetOfficialCa,
  officialAuraBasescanUrl,
  officialAuraUniswapUrl,
} from "@/lib/aura-fairlaunch";
import { quoteAuraSwap } from "@/lib/aura-swap.functions";
import { visibleRefetchInterval } from "@/hooks/use-aura";
import { cn } from "@/lib/utils";
import { isWalletConnectConnector, listedWalletDoors } from "@/lib/wallet-doors";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function AuraFairlaunchWallet({ de = false, live }: { de?: boolean; live: boolean }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const doors = useMemo(() => listedWalletDoors(connectors), [connectors]);
  const [amount, setAmount] = useState("111");
  const [copied, setCopied] = useState(false);
  const ca = auraGetOfficialCa();
  const uni = officialAuraUniswapUrl(ca);
  const scan = officialAuraBasescanUrl(ca);
  const onBase = chainId === base.id;

  const quoteQ = useQuery({
    queryKey: ["aura-get-quote", amount],
    queryFn: () => quoteAuraSwap({ data: { from: "USDC", to: "AURA", amount } }),
    enabled: live && Number(amount) > 0,
    refetchInterval: visibleRefetchInterval(20_000),
  });

  const copyCa = async () => {
    if (!ca) return;
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(true);
      toast.success(de ? AURA_GET_COPY.copiedDe : AURA_GET_COPY.copied);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(de ? "Kopieren fehlgeschlagen." : "Could not copy.");
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        {de ? AURA_GET_COPY.walletBodyDe : AURA_GET_COPY.walletBody}
      </p>

      {!isConnected ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {doors.map((connector) => {
            const walletConnect = isWalletConnectConnector(connector);
            return (
              <button
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={() =>
                  connect(
                    { connector, chainId: base.id },
                    {
                      onError: (err) => {
                        const raw = err instanceof Error ? err.message : "Could not connect.";
                        toast.error(raw);
                      },
                    },
                  )
                }
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isPending
                  ? de
                    ? AURA_GET_COPY.connectingDe
                    : AURA_GET_COPY.connecting
                  : walletConnect
                    ? de
                      ? AURA_GET_COPY.connectWcDe
                      : AURA_GET_COPY.connectWc
                    : de
                      ? AURA_GET_COPY.connectInjectedDe
                      : AURA_GET_COPY.connectInjected}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-2xl bg-primary/12 px-3 py-2 font-mono text-[12px] text-primary">
            {de ? AURA_GET_COPY.connectedDe : AURA_GET_COPY.connected} · {shortAddr(address!)}
          </span>
          {!onBase ? (
            <button
              type="button"
              disabled={switching}
              onClick={() => switchChain({ chainId: base.id })}
              className="rounded-2xl border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-200"
            >
              {de ? AURA_GET_COPY.switchBaseDe : AURA_GET_COPY.switchBase}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => disconnect()}
            className="rounded-2xl border border-border/50 px-4 py-2 text-sm text-muted-foreground"
          >
            {de ? AURA_GET_COPY.disconnectDe : AURA_GET_COPY.disconnect}
          </button>
        </div>
      )}

      {live && ca ? (
        <>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              USDC
            </span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-2xl border border-border/50 bg-background px-4 py-3 text-[15px]"
            />
          </label>
          <div className="rounded-2xl border border-border/40 px-4 py-3 text-[13px] leading-relaxed">
            {quoteQ.isLoading ? (
              <p className="text-muted-foreground">{de ? "Quote…" : "Quoting…"}</p>
            ) : quoteQ.data?.amountOut ? (
              <p className="font-semibold">
                {quoteQ.data.amountIn} USDC → {quoteQ.data.amountOut} AURA
              </p>
            ) : (
              <p className="text-muted-foreground">
                {quoteQ.data?.reason ?? (de ? AURA_GET_COPY.quoteHintDe : AURA_GET_COPY.quoteHint)}
              </p>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {uni ? (
              <a
                href={uni}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground",
                  !onBase && isConnected && "opacity-80",
                )}
              >
                {de ? AURA_GET_COPY.buyUniDe : AURA_GET_COPY.buyUni}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void copyCa()}
              className="rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
            >
              {copied
                ? de
                  ? AURA_GET_COPY.copiedDe
                  : AURA_GET_COPY.copied
                : de
                  ? AURA_GET_COPY.copyCaDe
                  : AURA_GET_COPY.copyCa}
            </button>
          </div>
          <p className="break-all font-mono text-[12px] text-muted-foreground">{ca}</p>
          {scan ? (
            <a
              href={scan}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              {de ? AURA_GET_COPY.viewTokenDe : AURA_GET_COPY.viewToken}
            </a>
          ) : null}
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {de ? AURA_GET_COPY.notLiveDe : AURA_GET_COPY.notLive}
        </p>
      )}
    </div>
  );
}
