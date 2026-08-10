import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/aura/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-aura";
import {
  BOOST_PACKS,
  LOCAL_SEAT_BOOST_GRANT,
  LOCAL_SEAT_EUR,
  LOCAL_SEAT_PLAN_ID,
  type BoostPackId,
} from "@/lib/boost-packs";
import { getLokalHub, redeemLocalSeatCode } from "@/lib/local-seat.functions";
import { compact } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/boost")({
  head: () => ({
    meta: [{ title: "Boost — Aura Lokal" }],
  }),
  component: BoostPage,
});

async function startCheckout(plan: string, companyId: string) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Bitte erneut anmelden.");
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan, company_id: companyId }),
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error || "Checkout fehlgeschlagen.");
  window.location.assign(json.url);
}

function BoostPage() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const hub = useQuery({ queryKey: ["lokal-hub"], queryFn: () => getLokalHub() });
  const [code, setCode] = useState("");
  const seatPaid = Boolean(hub.data?.seatPaid ?? company?.local_seat_paid_at);

  const redeem = useMutation({
    mutationFn: () => redeemLocalSeatCode({ data: { code } }),
    onSuccess: async (res) => {
      toast.success(
        res.already_paid
          ? "Seat war schon aktiv."
          : `Seat freigeschaltet · +${compact(res.boost_grant ?? LOCAL_SEAT_BOOST_GRANT)} Boost`,
      );
      setCode("");
      await qc.invalidateQueries({ queryKey: ["lokal-hub"] });
      await qc.invalidateQueries({ queryKey: ["company"] });
      await qc.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paySeat = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("Kein Unternehmen.");
      await startCheckout(LOCAL_SEAT_PLAN_ID, company.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const buyPack = useMutation({
    mutationFn: async (packId: BoostPackId) => {
      if (!company?.id) throw new Error("Kein Unternehmen.");
      if (!seatPaid) throw new Error("Zuerst Local Seat freischalten.");
      await startCheckout(packId, company.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Boost</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Guthaben & Pakete</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Boost treibt Social, Bewertungen und Akquise — ohne Krypto-Sprache.
        </p>
      </div>

      <div className="rounded-3xl border border-border/40 bg-card/30 p-5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Dein Boost</p>
        <p className="mt-2 flex items-center gap-2 font-display text-4xl font-semibold tabular-nums">
          <Sparkle className="h-6 w-6 text-gold" />
          {compact(hub.data?.boostBalance ?? 0)}
        </p>
      </div>

      {!seatPaid ? (
        <Panel label={`Local Seat · ${LOCAL_SEAT_EUR} €`} glow>
          <p className="text-sm text-muted-foreground">
            Einmalig freischalten. Bar an der Theke: Code einlösen. Oder mit Karte zahlen.
          </p>
          <label className="mt-4 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Barzahlungs-Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH"
              className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 font-mono text-sm outline-none"
            />
          </label>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              disabled={redeem.isPending || code.trim().length < 6}
              onClick={() => redeem.mutate()}
              className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {redeem.isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Code einlösen"
              )}
            </button>
            <button
              type="button"
              disabled={paySeat.isPending}
              onClick={() => paySeat.mutate()}
              className="rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {paySeat.isPending ? "…" : `Mit Karte · ${LOCAL_SEAT_EUR} €`}
            </button>
          </div>
        </Panel>
      ) : (
        <p className="text-sm font-semibold text-gold">Local Seat aktiv</p>
      )}

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Boost-Pakete
        </p>
        {BOOST_PACKS.map((pack) => (
          <div
            key={pack.id}
            className="rounded-3xl border border-border/50 bg-card/30 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-semibold">{pack.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{pack.blurb}</p>
              </div>
              <p className="font-display text-xl font-semibold tabular-nums">€{pack.eur}</p>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {pack.perks.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              +{compact(pack.boostGrant)} Boost
            </p>
            <button
              type="button"
              disabled={buyPack.isPending || !seatPaid}
              onClick={() => buyPack.mutate(pack.id)}
              className="mt-4 w-full rounded-2xl bg-primary/90 px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {!seatPaid ? "Zuerst Seat" : buyPack.isPending ? "…" : "Kaufen"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
