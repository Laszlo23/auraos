import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Panel, Shimmer } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { useCompany } from "@/hooks/use-aura";
import { celebrateLokalWin } from "@/hooks/use-lokal-engagement";
import {
  confirmNachbarCheckin,
  getOwnerNachbarCheckinCode,
  listOwnerNachbarPendingCheckins,
  rejectNachbarCheckin,
} from "@/lib/nachbar.functions";
import { NACHBAR_STAMP_GOAL } from "@/lib/nachbar";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/kunden")({
  head: () => ({
    meta: [{ title: "Gäste — Aura Local" }],
  }),
  component: KundenPage,
});

function KundenPage() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const seatPaid = Boolean(company?.local_seat_paid_at);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["owner-nachbar-checkin", company?.id],
    enabled: Boolean(company?.id),
    queryFn: () =>
      getOwnerNachbarCheckinCode(company?.id ? { data: { companyId: company.id } } : { data: {} }),
  });
  const pending = useQuery({
    queryKey: ["owner-nachbar-pending"],
    queryFn: () => listOwnerNachbarPendingCheckins(),
  });
  const confirm = useMutation({
    mutationFn: (checkinId: string) => confirmNachbarCheckin({ data: { checkinId } }),
    onSuccess: async () => {
      celebrateLokalWin("Gast bestätigt — stark für Stammkunden.");
      await qc.invalidateQueries({ queryKey: ["owner-nachbar-pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: (checkinId: string) => rejectNachbarCheckin({ data: { checkinId } }),
    onSuccess: async () => {
      toast.success("Check-in abgelehnt.");
      await qc.invalidateQueries({ queryKey: ["owner-nachbar-pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const code = data?.code || "";
  const deepLink = code ? `${SITE_URL}/nachbar/c/${code}` : "";
  const qrUrl = deepLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(deepLink)}`
    : "";
  const region = company?.city || undefined;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {t("kunden.eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {t("kunden.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("kunden.blurb")}</p>
      </div>

      <Panel label={t("kunden.qrTitle")} glow>
        {isLoading ? <Shimmer className="h-16" /> : null}
        {!isLoading && code ? (
          <>
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Check-in QR"
                width={220}
                height={220}
                className="mx-auto rounded-2xl bg-white p-3"
              />
            ) : null}
            <p className="mt-4 text-center font-mono text-4xl font-semibold tracking-[0.22em]">
              {code}
            </p>
            <p className="mt-3 text-center text-sm text-muted-foreground">{t("kunden.qrHint")}</p>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href={deepLink}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground"
              >
                <QrCode className="h-4 w-4" /> {t("kunden.openLink")}
              </a>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-semibold"
                onClick={async () => {
                  await navigator.clipboard.writeText(deepLink);
                  toast.success(t("kunden.copyLink"));
                }}
              >
                <Copy className="h-4 w-4" /> {t("kunden.copyLink")}
              </button>
            </div>
          </>
        ) : null}
        {!isLoading && !code ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {seatPaid ? t("kunden.qrMissing") : t("kunden.qrNeedSeat")}
            </p>
            {seatPaid ? (
              <button
                type="button"
                disabled={isFetching}
                onClick={() => void refetch()}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {isFetching ? "…" : t("kunden.qrCreate")}
              </button>
            ) : (
              <Link
                to="/boost"
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              >
                {t("heute.seatCta")}
              </Link>
            )}
            {isError ? (
              <p className="text-[12px] text-destructive">Code konnte nicht geladen werden.</p>
            ) : null}
          </div>
        ) : null}
      </Panel>

      <Panel label={t("kunden.openCheckins")}>
        <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
          {t("kunden.pendingHint")}
        </p>
        {(pending.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("kunden.nonePending")}</p>
        ) : (
          <ul className="space-y-2">
            {(pending.data ?? []).map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.display_name || "Gast"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.company_name ? `${row.company_name} · ` : ""}
                    {new Date(row.created_at).toLocaleString()}
                    {typeof row.stamp_count === "number"
                      ? ` · Stempel ${row.stamp_count}/${NACHBAR_STAMP_GOAL}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={confirm.isPending}
                    onClick={() => confirm.mutate(row.id)}
                    className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    {t("kunden.confirm")}
                  </button>
                  <button
                    type="button"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate(row.id)}
                    className="rounded-xl border border-border/50 px-3 py-2 text-xs font-semibold"
                  >
                    {t("kunden.reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <details className="rounded-3xl border border-border/40 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
          {t("kunden.leadHunter")}
        </summary>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("kunden.leadHunterBlurb", { region: region ? ` · ${region}` : "" })}
        </p>
        <Link
          to="/akquise"
          search={{ autostart: true, ...(region ? { region } : {}) }}
          className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t("kunden.huntNow")} →
        </Link>
      </details>
    </div>
  );
}
