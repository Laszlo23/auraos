import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, LogOut, Megaphone, Sparkle, Star, Users, Zap } from "lucide-react";

import { LOCAL_DE_TABS } from "@/lib/boost-packs";
import { compact } from "@/lib/format";
import { useCompany } from "@/hooks/use-aura";
import { useSubscription } from "@/hooks/use-tokens";
import { useProgress } from "@/hooks/use-progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Pulse } from "@/components/aura/primitives";

const TAB_ICONS: Record<(typeof LOCAL_DE_TABS)[number]["to"], LucideIcon> = {
  "/heute": Home,
  "/social": Megaphone,
  "/kunden": Users,
  "/bewertungen": Star,
  "/boost": Zap,
};

export function isLocalDeCompany(company: {
  entry_funnel?: string | null;
  ui_locale?: string | null;
} | null | undefined): boolean {
  return company?.entry_funnel === "local" && company?.ui_locale === "de";
}

export function LocalDeShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const { data: sub } = useSubscription();
  const { data: progress } = useProgress();

  const needsOnboarding = Boolean(progress && !progress.onboarded);
  const immersive = pathname === "/onboarding";
  const seatPaid = Boolean(company?.local_seat_paid_at);

  useEffect(() => {
    if (needsOnboarding && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [needsOnboarding, pathname, navigate]);

  const tabs = useMemo(() => [...LOCAL_DE_TABS], []);

  if (immersive) {
    return <div className="min-h-svh bg-background">{children}</div>;
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 20% -10%, oklch(0.55 0.1 200 / 0.16), transparent 55%), radial-gradient(ellipse 45% 30% at 90% 0%, oklch(0.75 0.12 85 / 0.1), transparent 50%)",
        }}
      />

      <header className="relative z-20 sticky top-0 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Link to="/heute" className="font-display text-base font-semibold tracking-tight">
            Aura <span className="text-muted-foreground">Lokal</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-2.5 py-1 text-[11px] font-semibold tabular-nums">
              <Sparkle className="h-3 w-3 text-gold" />
              {compact(sub?.tokens_remaining ?? 0)} Boost
            </span>
            {!seatPaid ? (
              <Link
                to="/boost"
                className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground"
              >
                Seat
              </Link>
            ) : (
              <Pulse tone="gold" />
            )}
            <button
              type="button"
              aria-label="Abmelden"
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/lokal" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0 px-1 py-1.5">
          {tabs.map((tab) => {
            const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            const Icon = TAB_ICONS[tab.to];
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5", active ? "stroke-[2.25]" : "stroke-[1.75]")}
                    aria-hidden
                  />
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
