import type { ReactNode } from "react";

import { PublicSiteHeader } from "@/components/aura/public-site-header";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

type HoodShellProps = {
  children: ReactNode;
  className?: string;
};

/** Hood campaign wrapper — gold atmosphere + shared public chrome. */
export function HoodShell({ children, className }: HoodShellProps) {
  const { t } = useLocale();

  return (
    <div className={cn("hood-atmosphere relative min-h-svh overflow-x-hidden text-foreground", className)}>
      <PublicSiteHeader
        cta={{ to: "/auth", label: t("landing.navStart"), search: { mode: "signup" } }}
        ghostCta={{ href: "#mint", label: t("landing.navMint") }}
        showSignIn
      />
      {children}
    </div>
  );
}
