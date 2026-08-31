import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";

import { SaleWalletRoot } from "@/components/aura/sale-wallet";
import { SiteFooter } from "@/components/aura/site-footer";
import { HOOD } from "@/lib/hood";
import {
  getHoodGiveawayStatus,
  issueHoodRedeemChallenge,
  redeemHoodGiveaway,
  type HoodRedeemResult,
} from "@/lib/hood-giveaway.functions";
import { truncateAddress } from "@/lib/siwe-display";

import { SITE_URL } from "@/lib/site";

const HOOD_CODE_RE = /^HOOD-[A-Z0-9]{8}$/;

export const Route = createFileRoute("/hood_/claim/$code")({
  validateSearch: () => ({}),
  head: ({ params }) => ({
    meta: [
      { title: "Claim a Hood — Aura OS" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Redeem a Hood giveaway code to your wallet." },
      { property: "og:title", content: "Claim a Hood" },
      { property: "og:url", content: `${SITE_URL}/hood/claim/${params.code}` },
    ],
  }),
  component: HoodClaimRoute,
});

function HoodClaimRoute() {
  return (
    <SaleWalletRoot
      wcName="Aura Hood"
      wcDescription="Claim a Hood giveaway"
      wcUrl="https://aibusiness.fun/hood"
    >
      <HoodClaimPage />
    </SaleWalletRoot>
  );
}

function redeemCopy(result: HoodRedeemResult): string {
  switch (result.code) {
    case "ok":
      return result.tokenId != null ? `Hood #${result.tokenId} is yours.` : "Minted.";
    case "invalid":
      return "That code is not valid.";
    case "redeemed":
      return "This Hood was already claimed.";
    case "void":
      return "This code was voided.";
    case "unarmed":
      return "Mint is not configured yet. The code is reserved — try again when the contract is live.";
    case "sold_out":
      return "The Hood collection is sold out.";
    case "rate":
      return "Too many attempts. Wait a few minutes.";
    case "bad_wallet":
      return "Connect a valid wallet.";
    case "bad_sig":
      return "Signature did not match. Request a new one.";
    case "mint_failed":
      return "The chain refused the mint. Try once more.";
    default: {
      const _exhaustive: never = result.code;
      return _exhaustive;
    }
  }
}

function HoodClaimPage() {
  const { code: rawCode } = Route.useParams();
  const code = rawCode.trim().toUpperCase();
  const validFormat = HOOD_CODE_RE.test(code);
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [result, setResult] = useState<HoodRedeemResult | null>(null);

  const status = useQuery({
    queryKey: ["hood-giveaway", code],
    enabled: validFormat,
    queryFn: () => getHoodGiveawayStatus({ data: { code } }),
  });

  const redeem = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Connect a wallet first.");
      const { message } = await issueHoodRedeemChallenge({ data: { code, address } });
      const signature = await signMessageAsync({ message });
      return redeemHoodGiveaway({ data: { code, address, signature } });
    },
    onSuccess: (data) => setResult(data),
  });

  const row = status.data;
  const primaryConnector =
    connectors.find((c) => c.type === "injected" || /injected|metaMask/i.test(c.id)) ??
    connectors.find((c) => /walletConnect/i.test(c.id) || c.type === "walletConnect") ??
    connectors[0];

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-[#07090e] text-foreground">
      <div className="mx-auto flex min-h-svh max-w-md flex-col px-6 py-12">
        <Link to="/hood" className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          The Hood
        </Link>
        <img
          src={HOOD.art}
          alt="The Hood"
          className="mt-8 h-40 w-40 rounded-3xl object-cover shadow-[var(--shadow-glow)]"
        />
        <h1 className="mt-8 font-display text-4xl tracking-tight">Claim your Hood.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Giveaway mint. Connect a wallet, sign, receive the NFT. This does not unlock a founding
          seat.
        </p>
        <p className="mt-4 font-mono text-[12px] text-foreground/80">
          {validFormat ? code : "Invalid code"}
        </p>

        {!validFormat ? (
          <p className="mt-8 rounded-2xl border border-border/50 px-4 py-3 text-sm text-muted-foreground">
            That link is not a Hood giveaway code.
          </p>
        ) : status.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Checking…</p>
        ) : row?.status === "invalid" ? (
          <p className="mt-8 rounded-2xl border border-border/50 px-4 py-3 text-sm text-muted-foreground">
            This code is not in the book.
          </p>
        ) : row?.status === "redeemed" ? (
          <div className="mt-8 space-y-2 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 text-sm">
            <p>Already claimed{row.tokenId != null ? ` · Hood #${row.tokenId}` : ""}.</p>
            {row.explorerTx ? (
              <a href={row.explorerTx} target="_blank" rel="noreferrer" className="text-primary">
                Explorer
              </a>
            ) : null}
          </div>
        ) : row?.status === "void" ? (
          <p className="mt-8 text-sm text-muted-foreground">This code was voided.</p>
        ) : (
          <div className="mt-8 space-y-3">
            {!row?.mintConfigured ? (
              <p className="rounded-2xl border border-border/50 px-4 py-3 text-[13px] text-muted-foreground">
                Mint is not configured on this environment yet. The code stays reserved.
              </p>
            ) : null}
            {!isConnected ? (
              <button
                type="button"
                disabled={connecting || !primaryConnector}
                onClick={() => {
                  if (primaryConnector) connect({ connector: primaryConnector });
                }}
                className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {connecting ? "Opening…" : "Connect wallet"}
              </button>
            ) : (
              <>
                <p className="font-mono text-[12px] text-muted-foreground">
                  {truncateAddress(address ?? "")}
                </p>
                <button
                  type="button"
                  disabled={redeem.isPending || !row?.mintConfigured}
                  onClick={() => redeem.mutate()}
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {redeem.isPending ? "Check your wallet…" : "Sign and claim"}
                </button>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="w-full text-center text-xs text-muted-foreground"
                >
                  Use a different wallet
                </button>
              </>
            )}
          </div>
        )}

        {result ? (
          <p className="mt-6 rounded-2xl border border-border/50 px-4 py-3 text-sm">
            {redeemCopy(result)}
            {result.ok && result.explorerTx ? (
              <a
                href={result.explorerTx}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-primary"
              >
                Explorer
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
      <SiteFooter />
    </main>
  );
}
