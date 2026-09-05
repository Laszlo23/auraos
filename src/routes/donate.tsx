import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { SiteFooter } from "@/components/aura/site-footer";
import { useLocale } from "@/hooks/use-locale";
import { DONATE_AMOUNTS_USD, type DonateAmountUsd } from "@/lib/nowpayments-donate";
import { NOWPAYMENTS_DONATE_BUTTON, SITE_NAME, SITE_URL } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/donate")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Support Aura — ${SITE_NAME}` },
      {
        name: "description",
        content: `Chip in to keep ${SITE_NAME} shipping. Pick an amount and finish on a secure checkout.`,
      },
      { property: "og:title", content: `Support Aura — ${SITE_NAME}` },
      { property: "og:url", content: `${SITE_URL}/donate` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/donate` }],
  }),
  component: DonatePage,
});

function DonatePage() {
  const { t } = useLocale();
  const { status } = Route.useSearch();
  const [amount, setAmount] = useState<DonateAmountUsd>(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    trackTeaser("cta_click", { placement: "donate_checkout" });
    try {
      const res = await fetch("/api/billing/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_usd: amount }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Could not start donation");
      }
      window.location.assign(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Donation failed");
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, oklch(0.75 0.14 199 / 0.16), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 20%, oklch(0.75 0.12 78 / 0.1), transparent 50%)",
        }}
      />

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
          {t("donate.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">{t("donate.title")}</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {t("donate.lead")}
        </p>

        {status === "success" ? (
          <p
            className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-[14px] text-foreground"
            role="status"
          >
            {t("donate.success")}
          </p>
        ) : null}
        {status === "cancel" ? (
          <p
            className="mt-6 rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3 text-[14px] text-muted-foreground"
            role="status"
          >
            {t("donate.cancel")}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-2">
          {DONATE_AMOUNTS_USD.map((usd) => (
            <button
              key={usd}
              type="button"
              onClick={() => setAmount(usd)}
              className={cn(
                "rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
                amount === usd
                  ? "border-primary/45 bg-primary/12 text-foreground"
                  : "border-border/50 bg-foreground/[0.04] text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              ${usd}
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout()}
            className="inline-flex items-center gap-3 rounded-xl border border-border/50 bg-foreground/[0.04] px-3 py-2 transition-opacity hover:opacity-100 disabled:cursor-wait disabled:opacity-60"
            aria-label={t("donate.cta")}
          >
            <img
              src={NOWPAYMENTS_DONATE_BUTTON}
              alt=""
              width={200}
              height={40}
              className="h-9 w-auto"
            />
            <span className="pr-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {busy ? t("donate.starting") : `$${amount}`}
            </span>
          </button>
          {error ? (
            <p className="text-[13px] text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-[12px] text-muted-foreground">{t("donate.note")}</p>
      </div>

      <SiteFooter />
    </main>
  );
}
