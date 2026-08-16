import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { useCompany } from "@/hooks/use-aura";
import { supabase } from "@/integrations/supabase/client";
import {
  AURA_REPUTATION_EUR,
  AURA_REPUTATION_PLAN_ID,
  BOOST_PACKS,
  LOCAL_SEAT_BOOST_GRANT,
  LOCAL_SEAT_EUR,
  LOCAL_SEAT_PLAN_ID,
  type BoostPackId,
} from "@/lib/boost-packs";
import {
  getLokalHub,
  redeemLocalSeatCode,
  createLocalPeerInvite,
} from "@/lib/local-seat.functions";
import { compact } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/boost")({
  validateSearch: (search: Record<string, unknown>): { checkout?: "success" | "cancel" } => ({
    ...(search["checkout"] === "success" || search["checkout"] === "cancel"
      ? { checkout: search["checkout"] }
      : {}),
  }),
  head: () => ({
    meta: [{ title: "Aura Reputation — Aura Local" }],
  }),
  component: BoostPage,
});

async function startCheckout(plan: string, companyId: string) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan, company_id: companyId }),
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error || "Checkout failed.");
  window.location.assign(json.url);
}

function BoostPage() {
  const qc = useQueryClient();
  const { t } = useLocale();
  const { checkout } = Route.useSearch();
  const { data: company } = useCompany();
  const hub = useQuery({ queryKey: ["lokal-hub"], queryFn: () => getLokalHub() });
  const [code, setCode] = useState("");
  const seatPaid = Boolean(hub.data?.seatPaid ?? company?.local_seat_paid_at);

  useEffect(() => {
    if (!checkout) return;
    let cancelled = false;
    void (async () => {
      if (checkout === "success") {
        for (let i = 0; i < 10; i++) {
          await qc.invalidateQueries({ queryKey: ["lokal-hub"] });
          await qc.invalidateQueries({ queryKey: ["company"] });
          await qc.invalidateQueries({ queryKey: ["subscription"] });
          const fresh = await getLokalHub().catch(() => null);
          if (cancelled) return;
          if (fresh?.seatPaid) {
            toast.success(t("boost.checkoutSuccess"));
            window.history.replaceState({}, "", "/boost");
            return;
          }
          await new Promise((r) => setTimeout(r, 600));
        }
        if (!cancelled) {
          toast.message(t("boost.checkoutPending"));
          window.history.replaceState({}, "", "/boost");
        }
        return;
      }
      toast.message(t("boost.checkoutCancel"));
      window.history.replaceState({}, "", "/boost");
    })();
    return () => {
      cancelled = true;
    };
  }, [checkout, qc, t]);

  const redeem = useMutation({
    mutationFn: () => redeemLocalSeatCode({ data: { code } }),
    onSuccess: async (res) => {
      toast.success(
        res.already_paid
          ? t("boost.seatActive")
          : `${t("boost.seatActive")} · +${compact(res.boost_grant ?? LOCAL_SEAT_BOOST_GRANT)}`,
      );
      setCode("");
      await qc.invalidateQueries({ queryKey: ["lokal-hub"] });
      await qc.invalidateQueries({ queryKey: ["company"] });
      await qc.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payReputation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("No company.");
      await startCheckout(AURA_REPUTATION_PLAN_ID, company.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paySeatCash = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("No company.");
      await startCheckout(LOCAL_SEAT_PLAN_ID, company.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const buyPack = useMutation({
    mutationFn: async (packId: BoostPackId) => {
      if (!company?.id) throw new Error("No company.");
      if (!seatPaid) throw new Error(t("boost.seatRequired"));
      await startCheckout(packId, company.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const peerInvite = useMutation({
    mutationFn: () => createLocalPeerInvite(),
    onSuccess: (res) => {
      const url = `${SITE_URL}${res.path}`;
      void navigator.clipboard.writeText(url);
      toast.success(t("boost.peerCta"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {t("nav.boost")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {t("boost.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("boost.subtitle")}</p>
      </div>

      {seatPaid ? (
        <div className="rounded-3xl border border-border/40 bg-card/30 p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {t("boost.yourBoost")}
          </p>
          <p className="mt-2 flex items-center gap-2 font-display text-4xl font-semibold tabular-nums">
            <Sparkle className="h-6 w-6 text-gold" />
            {compact(hub.data?.boostBalance ?? 0)}
          </p>
          <p className="mt-2 text-sm font-semibold text-gold">{t("boost.seatActive")}</p>
        </div>
      ) : null}

      {!seatPaid ? (
        <Panel label={t("boost.unlockSeat")} glow>
          <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-muted-foreground">
            <li>{t("boost.pathCard")}</li>
            <li>{t("boost.pathCash")}</li>
            <li>{t("boost.pathOnce")}</li>
          </ol>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {t("boost.seatBlurb")}
          </p>
          <button
            type="button"
            disabled={payReputation.isPending}
            onClick={() => payReputation.mutate()}
            className="mt-5 w-full rounded-2xl bg-primary px-4 py-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {payReputation.isPending ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              t("boost.payCard", { eur: AURA_REPUTATION_EUR })
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("boost.recommended")}
          </p>

          <div className="mt-6 rounded-2xl border border-border/50 bg-foreground/[0.03] p-4">
            <p className="text-sm font-semibold">{t("boost.cashCode")}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">{t("boost.cashHint")}</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH"
              aria-label={t("boost.cashCode")}
              className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none"
            />
            <button
              type="button"
              disabled={redeem.isPending || code.trim().length < 6}
              onClick={() => redeem.mutate()}
              className="mt-3 w-full rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {redeem.isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                t("boost.redeem")
              )}
            </button>
          </div>

          <button
            type="button"
            disabled={paySeatCash.isPending}
            onClick={() => paySeatCash.mutate()}
            className="mt-4 w-full rounded-2xl border border-dashed border-border/40 px-4 py-3 text-sm font-medium text-muted-foreground disabled:opacity-60"
          >
            {paySeatCash.isPending ? "…" : t("boost.payCashAlt", { eur: LOCAL_SEAT_EUR })}
          </button>
        </Panel>
      ) : (
        <>
          <Panel label={t("boost.nextSteps")}>
            <p className="text-sm text-muted-foreground">{t("boost.nextStepsBlurb")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/bewertungen"
                className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                {t("boost.goReviews")}
              </Link>
              <Link
                to="/kunden"
                className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
              >
                {t("boost.goGuests")}
              </Link>
            </div>
          </Panel>

          <details className="rounded-3xl border border-border/40 px-4 py-3" open>
            <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
              {t("boost.packs")}
            </summary>
            <div className="mt-3 space-y-3">
              {BOOST_PACKS.map((pack) => (
                <div key={pack.id} className="rounded-3xl border border-border/50 bg-card/30 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-semibold">{pack.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{pack.blurb}</p>
                    </div>
                    <p className="font-display text-xl font-semibold tabular-nums">€{pack.eur}</p>
                  </div>
                  <button
                    type="button"
                    disabled={buyPack.isPending}
                    onClick={() => buyPack.mutate(pack.id)}
                    className="mt-4 w-full rounded-2xl bg-primary/90 px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {buyPack.isPending ? "…" : t("boost.buy")}
                  </button>
                </div>
              ))}
            </div>
          </details>

          <Panel label={t("boost.peerTitle")} glow>
            <p className="text-sm text-muted-foreground">{t("boost.peerBlurb")}</p>
            <button
              type="button"
              disabled={peerInvite.isPending}
              onClick={() => peerInvite.mutate()}
              className="mt-3 w-full rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {peerInvite.isPending ? "…" : t("boost.peerCta")}
            </button>
          </Panel>
        </>
      )}
    </div>
  );
}
