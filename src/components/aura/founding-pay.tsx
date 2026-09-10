import { useState } from "react";
import { toast } from "sonner";

import { CRYPTO_SEAT_ASSETS, type CryptoSeatAsset } from "@/lib/boost-packs";
import { startFoundingCryptoCheckout, startFoundingSeatCheckout } from "@/lib/founding-seat";
import { OS_MONTH_DISPLAY, OS_YEAR_DISPLAY, type OsCheckoutPlan } from "@/lib/os-pricing";

const ASSET_LABEL: Record<CryptoSeatAsset, string> = {
  usdc: "USDC",
  eth: "ETH",
  btc: "BTC",
  sol: "SOL",
};

export function FoundingPayPanel({
  invite,
  busy,
  onBusy,
  plan = "year",
}: {
  invite?: string | null;
  busy?: boolean;
  onBusy?: (v: boolean) => void;
  plan?: OsCheckoutPlan;
}) {
  const [rail, setRail] = useState<"pick" | "crypto">("pick");
  const [asset, setAsset] = useState<CryptoSeatAsset>("usdc");
  const [picked, setPicked] = useState<OsCheckoutPlan>(plan);

  async function payCard(next: OsCheckoutPlan) {
    setPicked(next);
    onBusy?.(true);
    try {
      const url = await startFoundingSeatCheckout(invite, next);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start card checkout");
      onBusy?.(false);
    }
  }

  async function payCrypto() {
    onBusy?.(true);
    try {
      const url = await startFoundingCryptoCheckout({ invite, asset });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start digital checkout");
      onBusy?.(false);
    }
  }

  if (rail === "crypto") {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
          Crypto prepays the first year — {OS_YEAR_DISPLAY}. Monthly is card only.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {CRYPTO_SEAT_ASSETS.map((a) => (
            <button
              key={a}
              type="button"
              disabled={busy}
              onClick={() => setAsset(a)}
              className={`rounded-2xl border py-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                asset === a
                  ? "border-primary/50 bg-primary/14 text-primary"
                  : "border-border bg-foreground/5 text-muted-foreground"
              }`}
            >
              {ASSET_LABEL[a]}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void payCrypto()}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Opening invoice…" : `Pay ${OS_YEAR_DISPLAY} in ${ASSET_LABEL[asset]}`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setRail("pick")}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
        You&apos;re signed in. Start monthly or take the year — same OS. Invite is optional. Extra
        compute only if you run hotter.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void payCard("year")}
        className={`w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-60 ${
          picked === "year"
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-foreground/6 hover:bg-foreground/10"
        }`}
      >
        {busy && picked === "year" ? "Opening Stripe…" : `Year — ${OS_YEAR_DISPLAY} · best value`}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void payCard("month")}
        className={`w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-60 ${
          picked === "month"
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-foreground/6 hover:bg-foreground/10"
        }`}
      >
        {busy && picked === "month"
          ? "Opening Stripe…"
          : `Monthly — ${OS_MONTH_DISPLAY} · cancel anytime`}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setRail("crypto")}
        className="w-full rounded-2xl border border-border bg-foreground/6 py-3 text-sm font-medium hover:bg-foreground/10 disabled:opacity-60"
      >
        Digital payment — first year {OS_YEAR_DISPLAY}
      </button>
    </div>
  );
}
