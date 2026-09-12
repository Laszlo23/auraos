import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { useKycPublicConfig, useKycStatus } from "@/hooks/use-kyc";
import { useLocale } from "@/hooks/use-locale";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { kycStatusI18nKey, type KycStatus } from "@/lib/kyc-status";

export function SaleKycGate({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const config = useKycPublicConfig();
  const session = useSupabaseSession();
  const gated = Boolean(config.data?.configured && config.data.gates.includes("sale"));
  const kyc = useKycStatus(gated && Boolean(session.data));

  if (config.isError) {
    return (
      <section className="rounded-3xl border border-border/40 px-5 py-6 text-[13px] text-muted-foreground">
        {t("kyc.checkFailed")}
      </section>
    );
  }
  if (!gated && !config.isLoading) return <>{children}</>;
  if (config.isLoading || session.isLoading || (session.data && kyc.isLoading)) {
    return (
      <section className="rounded-3xl border border-border/40 px-5 py-6 text-[13px] text-muted-foreground">
        {t("kyc.checking")}
      </section>
    );
  }
  if (!session.data) {
    return (
      <section className="rounded-3xl border border-primary/25 bg-foreground/[0.03] p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> {t("kyc.needSignInTitle")}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {t("kyc.needSignInBody")}
        </p>
        <Link
          to="/auth"
          search={{ next: "/sale" }}
          className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          {t("kyc.signIn")}
        </Link>
      </section>
    );
  }
  if (!kyc.data?.approved) {
    const status = (kyc.data?.status ?? "none") as KycStatus;
    return (
      <section className="rounded-3xl border border-primary/25 bg-foreground/[0.03] p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> {t("kyc.verifyTitle")}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {t("kyc.verifyBody", { status: t(kycStatusI18nKey(status)) })}
        </p>
        <Link
          to="/identity"
          className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          {t("kyc.openIdentity")}
        </Link>
      </section>
    );
  }
  return <>{children}</>;
}
