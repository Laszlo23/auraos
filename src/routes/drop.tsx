import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import type { Connector } from "wagmi";

import { SiteFooter } from "@/components/aura/site-footer";
import { SaleWalletRoot } from "@/components/aura/sale-wallet";
import { useLocale } from "@/hooks/use-locale";
import { checkFollowerNotice } from "@/lib/follower-notice.functions";
import { normalizeFollowerWallet } from "@/lib/follower-notice";
import { OFFICIAL_X_URL, SITE_NAME, SITE_URL } from "@/lib/site";
import { TOKEN_LAUNCH_DISPLAY, TOKEN_LAUNCH_DISPLAY_DE } from "@/lib/aura-t0-clock";

export const Route = createFileRoute("/drop")({
  head: () => ({
    meta: [
      { title: `Official notice — ${SITE_NAME}` },
      {
        name: "description",
        content:
          "Official founder notice list. Not an AURA airdrop. CA only on aibusiness.fun and X @bihary41418.",
      },
      { property: "og:title", content: `Official notice — ${SITE_NAME}` },
      { property: "og:url", content: `${SITE_URL}/drop` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/drop` }],
  }),
  component: DropPage,
});

function preferConnector(connectors: readonly Connector[]): Connector | undefined {
  const unique = connectors.filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  return (
    unique.find((c) => c.type === "injected" || /metaMask|injected|rabby|brave/i.test(c.id)) ??
    unique.find((c) => /walletConnect/i.test(c.id) || c.type === "walletConnect") ??
    unique[0]
  );
}

function DropInner() {
  const { t, locale } = useLocale();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [pasted, setPasted] = useState("");
  const pasteRef = useRef<HTMLInputElement>(null);
  const primary = useMemo(() => preferConnector(connectors), [connectors]);
  const launch = locale === "de" ? TOKEN_LAUNCH_DISPLAY_DE : TOKEN_LAUNCH_DISPLAY;

  const check = useMutation({
    mutationFn: (wallet: string) => checkFollowerNotice({ data: { wallet } }),
  });

  function walletToCheck(wallet?: string): string | null {
    if (wallet) return wallet;
    if (isConnected && address) return address;
    return normalizeFollowerWallet(pasteRef.current?.value || pasted);
  }

  function runCheck(wallet?: string) {
    const next = walletToCheck(wallet);
    if (!next) return;
    check.mutate(next);
  }

  useEffect(() => {
    if (address) check.mutate(address);
  }, [address, check.mutate]);

  return (
    <main className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {SITE_NAME}
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {t("drop.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">{t("drop.title")}</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {t("drop.lead")}
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">{launch}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {isConnected && address ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold"
            >
              {t("drop.disconnect")} · {address.slice(0, 6)}…{address.slice(-4)}
            </button>
          ) : (
            <button
              type="button"
              disabled={!primary || connecting}
              onClick={() => primary && connect({ connector: primary })}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {connecting ? t("drop.checking") : t("drop.connect")}
            </button>
          )}
          <input
            ref={pasteRef}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={t("drop.paste")}
            className="w-full rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3 font-mono text-[13px] outline-none focus:border-primary/40"
          />
        </div>

        <button
          type="button"
          disabled={check.isPending}
          onClick={() => runCheck()}
          className="mt-4 rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {check.isPending ? t("drop.checking") : t("drop.check")}
        </button>

        {check.data ? (
          <p
            className="mt-6 rounded-2xl border border-border/40 px-4 py-3 text-[14px] leading-relaxed"
            role="status"
          >
            {check.data.listed ? t("drop.listed") : t("drop.notListed")}
          </p>
        ) : null}
        {check.error ? (
          <p className="mt-4 text-[13px] text-destructive" role="alert">
            {check.error instanceof Error ? check.error.message : t("drop.invalid")}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3 text-[13px] font-semibold">
          <Link to="/pitch" className="text-primary underline-offset-2 hover:underline">
            {t("drop.pitch")} →
          </Link>
          <Link to="/trust" className="text-primary underline-offset-2 hover:underline">
            {t("drop.trust")} →
          </Link>
          <Link to="/token" className="text-primary underline-offset-2 hover:underline">
            {t("drop.token")} →
          </Link>
          <a href={OFFICIAL_X_URL} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
            X @bihary41418 →
          </a>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function DropPage() {
  return (
    <SaleWalletRoot
      wcName="Aura OS notice"
      wcDescription="Official founder notice list — not an AURA airdrop"
      wcUrl="https://aibusiness.fun/drop"
    >
      <DropInner />
    </SaleWalletRoot>
  );
}
