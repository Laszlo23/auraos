import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { useRefreshKyc, useStartKyc, useKycStatus } from "@/hooks/use-kyc";
import { useLocale } from "@/hooks/use-locale";
import { kycStatusI18nKey, type KycStatus } from "@/lib/kyc-status";

async function openDiditVerification(url: string): Promise<"completed" | "cancelled" | "failed"> {
  const { DiditSdk } = await import("@didit-protocol/sdk-web");
  return new Promise((resolve) => {
    DiditSdk.shared.onComplete = (result) => {
      if (result.type === "completed") resolve("completed");
      else if (result.type === "cancelled") resolve("cancelled");
      else resolve("failed");
    };
    void DiditSdk.shared.startVerification({ url });
  });
}

export function KycPanel() {
  const { t } = useLocale();
  const { data, isLoading } = useKycStatus();
  const start = useStartKyc();
  const refresh = useRefreshKyc();
  const [consented, setConsented] = useState(false);

  const label = (status: KycStatus) => t(kycStatusI18nKey(status));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("kyc") !== "return") return;
    refresh.mutate(undefined, {
      onSuccess: (status) => {
        if (status.approved) toast.success(t("kyc.approvedToast"));
        else toast.message(t("kyc.savedToast", { status: label(status.status) }));
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : t("kyc.refreshFailed")),
    });
  }, []);

  if (!isLoading && data && !data.configured) return null;

  const status: KycStatus = data?.status ?? "none";
  const approved = Boolean(data?.approved);

  return (
    <Panel label={t("kyc.panel")} glow={approved}>
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/14 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{t("kyc.title")}</p>
            {isLoading ? (
              <Chip>…</Chip>
            ) : approved ? (
              <Chip tone="primary">
                <BadgeCheck className="h-3 w-3" /> {t("kyc.status.approved")}
              </Chip>
            ) : (
              <Chip tone={status === "declined" ? "gold" : undefined}>{label(status)}</Chip>
            )}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {t("kyc.body")}{" "}
            <a href="/privacy" className="text-primary underline-offset-2 hover:underline">
              {t("kyc.privacy")}
            </a>
          </p>
          {data?.verifiedAt ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("kyc.verifiedOn", { date: new Date(data.verifiedAt).toLocaleDateString() })}
            </p>
          ) : null}
          {!approved ? (
            <label className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-primary"
              />
              <span>{t("kyc.consent")}</span>
            </label>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {!approved ? (
              <button
                type="button"
                disabled={start.isPending || isLoading || !consented}
                onClick={() => {
                  start.mutate(undefined, {
                    onSuccess: async (res) => {
                      try {
                        const flow = await openDiditVerification(res.url);
                        if (flow === "cancelled") {
                          toast.message(t("kyc.closedToast"));
                          return;
                        }
                        if (flow === "failed") {
                          toast.error(t("kyc.windowFailed"));
                          return;
                        }
                        refresh.mutate(undefined, {
                          onSuccess: (next) => {
                            if (next.approved) toast.success(t("kyc.approvedToast"));
                            else toast.message(t("kyc.savedToast", { status: label(next.status) }));
                          },
                          onError: () => toast.message(t("kyc.webhookHint")),
                        });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : t("kyc.openFailed"));
                        window.location.href = res.url;
                      }
                    },
                    onError: (e) =>
                      toast.error(e instanceof Error ? e.message : t("kyc.startFailed")),
                  });
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-50"
              >
                {start.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {status === "none" ? t("kyc.start") : t("kyc.continue")}
              </button>
            ) : null}
            <button
              type="button"
              disabled={refresh.isPending}
              onClick={() => {
                refresh.mutate(undefined, {
                  onError: (e) =>
                    toast.error(e instanceof Error ? e.message : t("kyc.refreshFailed")),
                });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
            >
              {refresh.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {t("kyc.refresh")}
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
