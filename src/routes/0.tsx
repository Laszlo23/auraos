import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { base } from "viem/chains";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";

import { SaleWalletRoot } from "@/components/aura/sale-wallet";
import { RELIC_TEASERS } from "@/lib/relic-campaign";
import { claimRelic, getRelicVaultStatus, type RelicClaimResult } from "@/lib/relic.functions";

export const Route = createFileRoute("/0")({
  loader: async () => {
    const { withTimeout } = await import("@/lib/timeout-helper");
    return withTimeout(getRelicVaultStatus(), 8000, {
      remaining: 7,
      minted: 0,
      max: 7,
      sealed: false,
      configured: false,
      contract: null,
    });
  },
  head: () => ({
    meta: [
      { title: "0" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "—" },
    ],
  }),
  component: RelicVaultRoute,
});

function RelicVaultRoute() {
  return (
    <SaleWalletRoot wcName="Aura" wcDescription="Base" wcUrl="https://aibusiness.fun">
      <RelicVaultPage />
    </SaleWalletRoot>
  );
}

function RelicVaultPage() {
  const initial = Route.useLoaderData();
  const live = useQuery({
    queryKey: ["relic-vault"],
    queryFn: () => getRelicVaultStatus(),
    initialData: initial,
    refetchInterval: 30_000,
  });
  const status = live.data ?? initial;
  const sealed = status.sealed;
  const marks = Array.from({ length: status.max }, (_, i) => i < status.minted);

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#07090e] text-[#c8c2b4]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 0%, oklch(0.35 0.04 70 / 0.25), transparent 55%)",
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#8a8172]">
          {RELIC_TEASERS[0]}
        </p>
        <h1 className="mt-6 font-mono text-5xl font-light tracking-tight text-[#efe6d6]">0</h1>
        <p className="mt-6 font-mono text-[13px] leading-relaxed text-[#8a8172]">
          Collectible artifact. Not AURA. Not pAURA. Not an investment.
        </p>

        <div className="mt-10 flex gap-2" aria-label={`${status.remaining} remaining`}>
          {marks.map((filled, i) => (
            <span
              key={i}
              className={`h-8 w-3 rounded-[1px] ${filled ? "bg-[#c4a574]" : "bg-[#c4a574]/20"}`}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] tabular-nums tracking-[0.2em] text-[#8a8172]">
          {status.remaining} / {status.max}
        </p>

        {sealed ? (
          <p className="mt-12 border border-[#c4a574]/25 px-4 py-4 font-mono text-sm text-[#efe6d6]">
            The vault is closed.
          </p>
        ) : (
          <ClaimForm remaining={status.remaining} />
        )}
      </div>
    </main>
  );
}

function claimMessage(result: RelicClaimResult): string {
  switch (result.code) {
    case "ok":
      return result.tokenId != null ? `Relic #${result.tokenId} / 7` : "Minted.";
    case "wrong":
      return "No.";
    case "sealed":
      return "The vault is closed.";
    case "taken":
      return "This wallet already holds a Relic.";
    case "unarmed":
      return "The vault is dark.";
    case "rate":
      return "Wait.";
    case "bad_wallet":
      return "Wallet.";
    case "mint_failed":
      return "The chain refused.";
    default: {
      const _exhaustive: never = result.code;
      return _exhaustive;
    }
  }
}

function ClaimForm({ remaining }: { remaining: number }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<RelicClaimResult | null>(null);
  const onBase = chainId === base.id;
  const queryClient = useQueryClient();

  const claim = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("wallet");
      return claimRelic({ data: { wallet: address, phrase } });
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.ok) setPhrase("");
      void queryClient.invalidateQueries({ queryKey: ["relic-vault"] });
    },
  });

  return (
    <form
      className="mt-12 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isConnected || !onBase) return;
        claim.mutate();
      }}
    >
      {!isConnected ? (
        <div className="flex flex-col gap-2">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              disabled={connecting}
              onClick={() => connect({ connector })}
              className="border border-[#c4a574]/40 px-4 py-3 font-mono text-xs tracking-[0.16em] text-[#efe6d6] disabled:opacity-50"
            >
              {connector.name}
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="break-all font-mono text-[11px] text-[#8a8172]">{address}</p>
          {!onBase ? (
            <button
              type="button"
              disabled={switching}
              onClick={() => switchChain({ chainId: base.id })}
              className="w-full border border-[#c4a574]/40 px-4 py-3 font-mono text-xs tracking-[0.16em] text-[#efe6d6]"
            >
              Base
            </button>
          ) : (
            <>
              <label className="block font-mono text-[10px] uppercase tracking-[0.28em] text-[#8a8172]">
                Phrase
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  className="mt-2 w-full border border-[#c4a574]/25 bg-transparent px-3 py-3 font-mono text-sm text-[#efe6d6] outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={claim.isPending || !phrase.trim() || remaining <= 0}
                className="w-full bg-[#c4a574] px-4 py-3 font-mono text-xs font-semibold tracking-[0.2em] text-[#07090e] disabled:opacity-40"
              >
                {claim.isPending ? "…" : "Enter"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => disconnect()}
            className="w-full font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a8172]"
          >
            Disconnect
          </button>
        </>
      )}

      {result ? (
        <div className="border border-[#c4a574]/20 px-4 py-3 font-mono text-sm">
          <p>{claimMessage(result)}</p>
          {result.ok && result.explorerTx ? (
            <a
              href={result.explorerTx}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-[11px] text-[#c4a574] underline"
            >
              Explorer
            </a>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
