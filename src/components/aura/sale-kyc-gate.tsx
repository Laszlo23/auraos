import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { useKycPublicConfig, useKycStatus } from "@/hooks/use-kyc";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { KYC_STATUS_LABEL, type KycStatus } from "@/lib/kyc-status";

export function SaleKycGate({ children }: { children: ReactNode }) {
  const config = useKycPublicConfig();
  const session = useSupabaseSession();
  const gated = Boolean(config.data?.configured && config.data.gates.includes("sale"));
  const kyc = useKycStatus(gated && Boolean(session.data));

  if (config.isError) {
    return (
      <section className="rounded-3xl border border-border/40 px-5 py-6 text-[13px] text-muted-foreground">
        Could not check identity. Refresh the page.
      </section>
    );
  }
  if (!gated && !config.isLoading) return <>{children}</>;
  if (config.isLoading || session.isLoading || (session.data && kyc.isLoading)) {
    return (
      <section className="rounded-3xl border border-border/40 px-5 py-6 text-[13px] text-muted-foreground">
        Checking identity…
      </section>
    );
  }
  if (!session.data) {
    return (
      <section className="rounded-3xl border border-primary/25 bg-foreground/[0.03] p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Identity required to buy
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Sign in and finish KYC on Identity before the private sale. The OS seat does not need this.
        </p>
        <Link
          to="/auth"
          search={{ next: "/sale" }}
          className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Sign in
        </Link>
      </section>
    );
  }
  if (!kyc.data?.approved) {
    return (
      <section className="rounded-3xl border border-primary/25 bg-foreground/[0.03] p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Verify before you buy
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Status: {KYC_STATUS_LABEL[(kyc.data?.status ?? "none") as KycStatus]}. Open Identity, run
          Didit, then come back here.
        </p>
        <Link
          to="/identity"
          className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Open Identity
        </Link>
      </section>
    );
  }
  return <>{children}</>;
}
