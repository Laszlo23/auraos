import { useState } from "react";
import { toast } from "sonner";

import { CRYPTO_SEAT_ASSETS, type CryptoSeatAsset } from "@/lib/boost-packs";
import { FOUNDING_SEAT_DISPLAY } from "@/lib/founding-price";
import { startFoundingCryptoCheckout, startFoundingSeatCheckout } from "@/lib/founding-seat";

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
}: {
  invite?: string | null;
  busy?: boolean;
  onBusy?: (v: boolean) => void;
}) {
  const [rail, setRail] = useState<"pick" | "crypto">("pick");
  const [asset, setAsset] = useState<CryptoSeatAsset>("usdc");

  async function payCard() {
    onBusy?.(true);
    try {
      const url = await startFoundingSeatCheckout(invite);
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
      toast.error(err instanceof Error ? err.message : "Could not start crypto checkout");
      onBusy?.(false);
    }
  }

  if (rail === "crypto") {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
          Pay {FOUNDING_SEAT_DISPLAY} in crypto. Seat unlocks after the payment finishes — not while
          it is confirming.
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
          {busy ? "Opening invoice…" : `Pay ${FOUNDING_SEAT_DISPLAY} in ${ASSET_LABEL[asset]}`}
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
        You&apos;re signed in. Pay {FOUNDING_SEAT_DISPLAY} once — card or crypto. Invite is
        optional.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void payCard()}
        className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Opening Stripe…" : `Card — ${FOUNDING_SEAT_DISPLAY}`}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setRail("crypto")}
        className="w-full rounded-2xl border border-border bg-foreground/6 py-3 text-sm font-medium hover:bg-foreground/10 disabled:opacity-60"
      >
        Crypto — {FOUNDING_SEAT_DISPLAY}
      </button>
    </div>
  );
}
