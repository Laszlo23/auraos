import type { ReactNode } from "react";
import { useAccount } from "wagmi";

import { useKycPublicConfig, useKycStatus } from "@/hooks/use-kyc";
import { useLocale } from "@/hooks/use-locale";
import { useSupabaseSession } from "@/hooks/use-supabase-session";

type Step = {
  id: "know" | "unlock" | "pay" | "hold";
  title: string;
  body: string;
  done: boolean;
};

export function SaleQuest({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const session = useSupabaseSession();
  const config = useKycPublicConfig();
  const gated = Boolean(config.data?.configured && config.data.gates.includes("sale"));
  const kyc = useKycStatus(gated && Boolean(session.data));
  const { isConnected } = useAccount();

  const unlocked = !gated || Boolean(kyc.data?.approved);
  const steps: Step[] = [
    { id: "know", title: t("sale.play1Title"), body: t("sale.play1Body"), done: true },
    {
      id: "unlock",
      title: t("sale.play2Title"),
      body: t("sale.play2Body"),
      done: Boolean(session.data) && unlocked,
    },
    {
      id: "pay",
      title: t("sale.play3Title"),
      body: t("sale.play3Body"),
      done: isConnected && unlocked,
    },
    { id: "hold", title: t("sale.play4Title"), body: t("sale.play4Body"), done: false },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const current = steps.find((s) => !s.done)?.id ?? "hold";

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-primary/25 bg-foreground/[0.03] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            {t("sale.playKicker")}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("sale.playScore", { done: doneCount })}
          </p>
        </div>
        <h2 className="mt-2 font-display text-xl font-semibold">{t("sale.playTitle")}</h2>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
        <ol className="mt-4 grid gap-2">
          {steps.map((step, i) => {
            const tone =
              step.done ? "done" : step.id === current ? "now" : "next";
            return (
              <li
                key={step.id}
                className={`rounded-2xl border px-3 py-3 ${
                  tone === "now"
                    ? "border-primary/40 bg-primary/10"
                    : tone === "done"
                      ? "border-border/30 bg-foreground/[0.02]"
                      : "border-border/25"
                }`}
              >
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground/10 text-[10px]">
                    {step.done ? "✓" : i + 1}
                  </span>
                  {step.title}
                  <span className="ml-auto text-muted-foreground">
                    {tone === "done"
                      ? t("sale.playDone")
                      : tone === "now"
                        ? t("sale.playNow")
                        : t("sale.playNext")}
                  </span>
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>
      {children}
    </div>
  );
}
