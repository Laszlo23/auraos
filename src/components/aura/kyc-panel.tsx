import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { useRefreshKyc, useStartKyc, useKycStatus } from "@/hooks/use-kyc";
import { KYC_STATUS_LABEL, type KycStatus } from "@/lib/kyc-status";

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
  const { data, isLoading } = useKycStatus();
  const start = useStartKyc();
  const refresh = useRefreshKyc();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("kyc") !== "return") return;
    refresh.mutate(undefined, {
      onSuccess: (status) => {
        if (status.approved) toast.success("Identity approved.");
        else toast.message("Verification saved. Status: " + KYC_STATUS_LABEL[status.status]);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not refresh KYC."),
    });
  }, []);

  if (!isLoading && data && !data.configured) return null;

  const status: KycStatus = data?.status ?? "none";
  const approved = Boolean(data?.approved);

  return (
    <Panel label="Legal identity" glow={approved}>
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/14 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">KYC via Didit</p>
            {isLoading ? (
              <Chip>…</Chip>
            ) : approved ? (
              <Chip tone="primary">
                <BadgeCheck className="h-3 w-3" /> Approved
              </Chip>
            ) : (
              <Chip tone={status === "declined" ? "gold" : undefined}>{KYC_STATUS_LABEL[status]}</Chip>
            )}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Required before the token sale and live trading when this host has Didit on. The $29 OS
            seat does not need it. We store status only — ID photos stay with Didit.{" "}
            <a href="/privacy" className="text-primary underline-offset-2 hover:underline">
              Privacy
            </a>
          </p>
          {data?.verifiedAt ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Verified {new Date(data.verifiedAt).toLocaleDateString()}
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
              <span>
                I agree to verify my identity with Didit. Aura keeps the session status. Didit
                processes my ID and liveness check.
              </span>
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
                          toast.message("Verification closed. You can continue later.");
                          return;
                        }
                        if (flow === "failed") {
                          toast.error("Verification window failed. Try again.");
                          return;
                        }
                        refresh.mutate(undefined, {
                          onSuccess: (status) => {
                            if (status.approved) toast.success("Identity approved.");
                            else
                              toast.message(
                                "Didit finished. Status: " + KYC_STATUS_LABEL[status.status],
                              );
                          },
                          onError: () =>
                            toast.message(
                              "Flow finished. Status updates when Didit’s webhook lands.",
                            ),
                        });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not open Didit.");
                        window.location.href = res.url;
                      }
                    },
                    onError: (e) =>
                      toast.error(e instanceof Error ? e.message : "Could not start verification."),
                  });
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-50"
              >
                {start.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {status === "none" ? "Start verification" : "Continue verification"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={refresh.isPending}
              onClick={() => {
                refresh.mutate(undefined, {
                  onError: (e) =>
                    toast.error(e instanceof Error ? e.message : "Refresh failed."),
                });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
            >
              {refresh.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
