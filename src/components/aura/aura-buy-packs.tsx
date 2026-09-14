import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/use-identity";
import {
  AURA_BUY_COPY,
  AURA_BUY_MAX_USD,
  AURA_BUY_MIN_USD,
  AURA_BUY_PRESETS_USD,
  auraBuyPackIdFromUsd,
  auraBuySignupHref,
  parseAuraBuyUsd,
} from "@/lib/aura-buy-guide";
import { ensureInvestorDesk, listMyAuraBuyOrders } from "@/lib/aura-buy.functions";

async function startAuraBuyCheckout(opts: {
  amountUsd: number;
  companyId: string;
  wallet: string;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sign in again to pay with a card.");
  const pack = auraBuyPackIdFromUsd(opts.amountUsd);
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      kind: "aura_buy",
      amount_usd: opts.amountUsd,
      pack,
      company_id: opts.companyId,
      wallet: opts.wallet,
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !payload.url) {
    throw new Error(payload.error || "Checkout failed");
  }
  window.location.assign(payload.url);
}

export function AuraBuyPacks({ de = false, compact = false }: { de?: boolean; compact?: boolean }) {
  const { data: userId } = useUserId();
  const qc = useQueryClient();
  const [amountInput, setAmountInput] = useState("111");
  const [busy, setBusy] = useState(false);

  const desk = useQuery({
    queryKey: ["investor-desk", userId],
    enabled: Boolean(userId),
    queryFn: () => ensureInvestorDesk(),
    retry: false,
  });

  const orders = useQuery({
    queryKey: ["aura-buy-orders", userId],
    enabled: Boolean(userId),
    queryFn: () => listMyAuraBuyOrders(),
  });

  const openDesk = useMutation({
    mutationFn: () => ensureInvestorDesk(),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["investor-desk"] });
      toast.success(de ? "Aura-Wallet bereit" : "Aura wallet ready");
      if (row.wallet) {
        void navigator.clipboard.writeText(row.wallet).catch(() => undefined);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pay = async (rawAmount?: string) => {
    const usd = parseAuraBuyUsd(rawAmount ?? amountInput);
    if (usd == null) {
      toast.error(
        de
          ? `Betrag: $${AURA_BUY_MIN_USD}–$${AURA_BUY_MAX_USD.toLocaleString("de-DE")} (ganze Dollar).`
          : `Enter $${AURA_BUY_MIN_USD}–$${AURA_BUY_MAX_USD.toLocaleString("en-US")} (whole dollars).`,
      );
      return;
    }
    setBusy(true);
    try {
      const row = desk.data ?? (await ensureInvestorDesk());
      if (!row.wallet) throw new Error(de ? "Wallet fehlt noch." : "Wallet is not ready yet.");
      await startAuraBuyCheckout({
        amountUsd: usd,
        companyId: row.companyId,
        wallet: row.wallet,
      });
    } catch (err) {
      toast.error((err as Error).message || (de ? "Checkout fehlgeschlagen." : "Checkout failed."));
    } finally {
      setBusy(false);
    }
  };

  const canPay = Boolean(userId && desk.data?.wallet && !busy);

  return (
    <div className="space-y-4">
      {compact ? null : (
        <>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {de ? AURA_BUY_COPY.path1BodyDe : AURA_BUY_COPY.path1Body}
          </p>
          <p className="text-[13px] font-semibold text-foreground">
            {de ? AURA_BUY_COPY.path1HonestDe : AURA_BUY_COPY.path1Honest}
          </p>
        </>
      )}

      {!userId ? (
        <Link
          to="/auth"
          search={{ mode: "signup", next: "/get" }}
          className="cta-liquid inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          {de ? AURA_BUY_COPY.path1CtaSignupDe : AURA_BUY_COPY.path1CtaSignup}
        </Link>
      ) : (
        <div className="space-y-3">
          {desk.data?.wallet ? (
            <p className="break-all font-mono text-[12px] text-foreground/90">{desk.data.wallet}</p>
          ) : (
            <button
              type="button"
              disabled={openDesk.isPending || desk.isFetching}
              onClick={() => openDesk.mutate()}
              className="rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {openDesk.isPending || desk.isFetching
                ? de
                  ? "Wallet wird geöffnet…"
                  : "Opening wallet…"
                : de
                  ? AURA_BUY_COPY.path1CtaWalletDe
                  : AURA_BUY_COPY.path1CtaWallet}
            </button>
          )}
          {desk.isError ? (
            <p className="text-[12px] text-destructive">
              {(desk.error as Error).message}{" "}
              <a href={auraBuySignupHref()} className="underline">
                {de ? "Erneut anmelden" : "Sign in again"}
              </a>
            </p>
          ) : null}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-[12px] font-medium text-muted-foreground" htmlFor="aura-buy-usd">
          {de ? AURA_BUY_COPY.amountLabelDe : AURA_BUY_COPY.amountLabel}
        </label>
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="relative min-w-[8rem] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <input
              id="aura-buy-usd"
              type="number"
              inputMode="numeric"
              min={AURA_BUY_MIN_USD}
              max={AURA_BUY_MAX_USD}
              step={1}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={!userId || busy}
              className="w-full rounded-2xl border border-border/50 bg-background py-3 pl-7 pr-4 text-sm font-semibold tabular-nums disabled:opacity-40"
            />
          </div>
          <button
            type="button"
            disabled={!canPay}
            onClick={() => void pay()}
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {busy
              ? de
                ? "Weiter…"
                : "Continue…"
              : de
                ? AURA_BUY_COPY.amountCtaDe
                : AURA_BUY_COPY.amountCta}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {de ? AURA_BUY_COPY.amountRangeDe : AURA_BUY_COPY.amountRange}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {AURA_BUY_PRESETS_USD.map((usd) => (
          <button
            key={usd}
            type="button"
            disabled={!canPay}
            onClick={() => {
              setAmountInput(String(usd));
              void pay(String(usd));
            }}
            className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-40"
          >
            ${usd}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-muted-foreground">
        {de ? AURA_BUY_COPY.packHintDe : AURA_BUY_COPY.packHint}
      </p>
      <p className="text-[12px] text-muted-foreground">
        {de ? AURA_BUY_COPY.packRefundDe : AURA_BUY_COPY.packRefund}
      </p>

      {orders.data?.orders.length ? (
        <ul className="space-y-2 text-[12px] text-muted-foreground">
          {orders.data.orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-border/40 px-3 py-2">
              ${order.net_usd ?? order.amount_usd} · {order.lp_status ?? order.status}
              {order.tx_hash ? (
                <span className="ml-2 font-mono text-[11px]">{order.tx_hash.slice(0, 10)}…</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
