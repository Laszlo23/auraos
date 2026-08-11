import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import {
  getStripeConnectStatus,
  refreshStripeConnectStatus,
  startStripeConnectOnboarding,
} from "@/lib/stripe-connect.functions";

type ConnectStatus = Awaited<ReturnType<typeof getStripeConnectStatus>>;

export function StripeConnectPanel({
  returnPath = "/billing?connect=return",
  refreshPath = "/billing?connect=refresh",
}: {
  returnPath?: string;
  refreshPath?: string;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["stripe-connect"],
    queryFn: () => getStripeConnectStatus() as Promise<ConnectStatus>,
  });

  const start = useMutation({
    mutationFn: () =>
      startStripeConnectOnboarding({
        data: { returnPath, refreshPath },
      }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refresh = useMutation({
    mutationFn: () => refreshStripeConnectStatus() as Promise<ConnectStatus>,
    onSuccess: async (status) => {
      await qc.setQueryData(["stripe-connect"], status);
      toast.success(
        status.chargesReady
          ? "Stripe is ready — you can sell on your landing page."
          : "Stripe status refreshed. Finish any remaining onboarding steps.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ready = Boolean(data?.chargesReady);

  return (
    <Panel label="Sell with Stripe" glow={ready}>
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/14 text-primary">
          <CreditCard className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">Your Stripe account</p>
            {isLoading ? (
              <Chip>…</Chip>
            ) : ready ? (
              <Chip tone="primary">Charges ready</Chip>
            ) : data?.connected ? (
              <Chip tone="gold">Onboarding</Chip>
            ) : (
              <Chip>Not connected</Chip>
            )}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Connect Stripe so customers pay you directly for subscriptions and products on your
            landing page. Aura founding seats stay on Aura&apos;s Stripe.
          </p>
          {!data?.connected && !isLoading ? (
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground/90">
              If Connect fails with a platform error, the Aura Stripe account still needs Connect
              activated under Dashboard → Settings → Connect → Get started.
            </p>
          ) : null}
          {data?.requirementsDue?.length ? (
            <p className="mt-2 text-[12px] text-gold">
              Still needed: {data.requirementsDue.slice(0, 3).join(" · ")}
              {data.requirementsDue.length > 3 ? "…" : ""}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={start.isPending}
              onClick={() => start.mutate()}
              className="rounded-2xl bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-50"
            >
              {data?.connected ? "Continue onboarding" : "Connect Stripe"}
            </button>
            {data?.connected ? (
              <button
                type="button"
                disabled={refresh.isPending}
                onClick={() => refresh.mutate()}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            ) : null}
            {data?.connected ? (
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Stripe Dashboard
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}
