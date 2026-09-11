import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import {
  PublicMobileMenu,
  publicNavMore,
  publicNavPrimary,
} from "@/components/aura/public-site-header";
import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import {
  createSquareCheckout,
  createSquareTbaFundCheckout,
} from "@/lib/aura-square.functions";
import {
  AURA_SQUARE,
  AURA_SQUARE_COPY,
  auraSquareAddress,
  auraSquareExplorerUrl,
} from "@/lib/aura-square";
import { pageHead } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const TITLE = "Aura Square — Base token binder";
const DESCRIPTION =
  "Utility NFT on Base with an ERC-6551 wallet that can hold AURA. Not Hood. Not pAURA. Not founding seats.";

export const Route = createFileRoute("/square")({
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/square",
      jsonLd: {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}/square`,
      },
    }),
  component: SquarePage,
});

function SquarePage() {
  const { locale, t } = useLocale();
  const de = locale === "de";
  const ca = auraSquareAddress();
  const explorer = auraSquareExplorerUrl();
  const [busy, setBusy] = useState<"mint" | "fund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fundUsd, setFundUsd] = useState(String(AURA_SQUARE.tbaFundMinUsd));
  const [tokenId, setTokenId] = useState("1");

  const startMint = async () => {
    setError(null);
    setBusy("mint");
    try {
      const out = await createSquareCheckout();
      if (out.url) window.location.href = out.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const startFund = async () => {
    setError(null);
    setBusy("fund");
    try {
      const out = await createSquareTbaFundCheckout({
        data: { tokenId: Number(tokenId), amountUsd: Number(fundUsd) },
      });
      if (out.url) window.location.href = out.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background text-foreground">
      <header className="relative border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Home
          </Link>
          <nav className="ml-auto hidden flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] md:flex">
            <Link to="/token" className="text-muted-foreground hover:text-foreground">
              AURA
            </Link>
            <Link to="/sale" className="text-muted-foreground hover:text-foreground">
              pAURA
            </Link>
            <Link to="/hood" className="text-gold hover:text-gold/90">
              Hood
            </Link>
            <Link to="/trust" className="text-muted-foreground hover:text-foreground">
              {de ? "Bund" : "Trust"}
            </Link>
          </nav>
          <LanguageToggle />
          <PublicMobileMenu
            className="md:hidden"
            hideFrom="md"
            primary={publicNavPrimary(t)}
            more={publicNavMore(t)}
          />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {de ? AURA_SQUARE_COPY.kickerDe : AURA_SQUARE_COPY.kicker}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {de ? AURA_SQUARE_COPY.titleDe : AURA_SQUARE_COPY.title}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {de ? AURA_SQUARE_COPY.leadDe : AURA_SQUARE_COPY.lead}
        </p>
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          {de ? AURA_SQUARE_COPY.notHoodDe : AURA_SQUARE_COPY.notHood}
        </p>

        <ul className="mt-6 grid gap-2 text-[13px] text-muted-foreground sm:grid-cols-3">
          <li className="rounded-xl border border-border/40 px-3 py-2">
            Cap {AURA_SQUARE.maxSupply.toLocaleString("en-US")}
          </li>
          <li className="rounded-xl border border-border/40 px-3 py-2">
            ${AURA_SQUARE.mintUsd} USDC
          </li>
          <li className="rounded-xl border border-border/40 px-3 py-2">Base · ERC-6551</li>
        </ul>

        <section className="mt-8 rounded-2xl border border-border/40 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {de ? "Mint" : "Mint"}
          </p>
          {ca ? (
            <p className="mt-2 break-all font-mono text-[12px]">{ca}</p>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              {de
                ? "CA noch nicht veröffentlicht. Wallet-Mint und Stripe warten auf den Contract."
                : "CA unpublished. Wallet mint and Stripe wait for the contract."}
            </p>
          )}
          {explorer ? (
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-[13px] font-semibold text-primary hover:underline"
            >
              Basescan
            </a>
          ) : null}
          {ca ? (
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              {de
                ? "Wallet-Mint: USDC freigeben und mint() auf dem Contract aufrufen. Stripe mintet über die Ops-Wallet."
                : "Wallet mint: approve USDC and call mint() on the contract. Stripe mints via the ops wallet."}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void startMint()}
            disabled={!ca || busy !== null}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-40"
          >
            {busy === "mint"
              ? de
                ? "Stripe…"
                : "Stripe…"
              : de
                ? `Square mit Stripe · $${AURA_SQUARE.mintUsd}`
                : `Mint Square with Stripe · $${AURA_SQUARE.mintUsd}`}
          </button>
        </section>

        <section className="mt-6 rounded-2xl border border-border/40 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {de ? "TBA füllen" : "Fund TBA"}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {de ? AURA_SQUARE_COPY.stripeHonestDe : AURA_SQUARE_COPY.stripeHonest}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px]">
              Token ID
              <input
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border/50 bg-background px-3 py-2"
              />
            </label>
            <label className="block text-[12px]">
              USDC
              <input
                value={fundUsd}
                onChange={(e) => setFundUsd(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-border/50 bg-background px-3 py-2"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void startFund()}
            disabled={!ca || busy !== null}
            className="mt-4 w-full rounded-xl border border-border/50 px-4 py-2.5 text-[13px] font-semibold disabled:opacity-40"
          >
            {busy === "fund"
              ? "Stripe…"
              : de
                ? "USDC per Stripe in die TBA"
                : "Send USDC via Stripe into the TBA"}
          </button>
        </section>

        {error ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px]">
            {error}
          </p>
        ) : null}

        <p className="mt-8 text-[13px] text-muted-foreground">
          <Link to="/token" className="font-semibold text-primary hover:underline">
            /token
          </Link>
          {" · "}
          <Link to="/sale" className="font-semibold text-primary hover:underline">
            pAURA
          </Link>
          {" · "}
          <Link to="/hood" className="font-semibold text-primary hover:underline">
            Hood
          </Link>
          {" · "}
          <Link to="/trust" className="font-semibold text-primary hover:underline">
            /trust
          </Link>
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
