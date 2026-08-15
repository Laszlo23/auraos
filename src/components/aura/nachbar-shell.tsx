import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Compass, Gift, Home, LogOut, UserRound, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { NACHBAR_TABS } from "@/lib/nachbar";
import { getNachbarHub } from "@/lib/nachbar.functions";
import { compact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { Pulse } from "@/components/aura/primitives";

const TAB_ICONS: Record<(typeof NACHBAR_TABS)[number]["to"], LucideIcon> = {
  "/nachbar/heute": Home,
  "/nachbar/entdecken": Compass,
  "/nachbar/verdienen": Wallet,
  "/nachbar/freunde": Gift,
  "/nachbar/ich": UserRound,
};

const PUBLIC_PREFIXES = ["/nachbar/c/", "/nachbar/ref/"];

export function NachbarShell({ children }: { children?: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isLanding = pathname === "/nachbar";
  const isPublicDeep = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isDiscover = pathname === "/nachbar/entdecken";
  const needsAuth = !isLanding && !isPublicDeep && !isDiscover;
  const showAppChrome = !isLanding && !isPublicDeep;

  const { data: user, isLoading: authLoading } = useSupabaseSession();

  const { data: hub } = useQuery({
    queryKey: ["nachbar-hub"],
    enabled: showAppChrome && Boolean(user),
    queryFn: () => getNachbarHub(),
    staleTime: 20_000,
    retry: 1,
  });

  useEffect(() => {
    if (!needsAuth || authLoading) return;
    if (!user) {
      navigate({
        to: "/auth",
        search: {
          mode: "signup",
          next: pathname.startsWith("/nachbar") ? pathname : "/nachbar/heute",
          lang: "de",
        },
      });
    }
  }, [needsAuth, authLoading, user, navigate, pathname]);

  if (isLanding || isPublicDeep) {
    return <>{children ?? <Outlet />}</>;
  }

  if (needsAuth && (authLoading || !user)) {
    return (
      <div className="grid min-h-svh place-items-center bg-background text-sm text-muted-foreground">
        Aura Nachbar wird geladen…
      </div>
    );
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
          <Link to="/nachbar/heute" className="font-display text-base font-semibold tracking-tight">
            Aura <span className="text-muted-foreground">Nachbar</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                  <Pulse tone="gold" />
                  {compact(hub?.profile.balance ?? 0)}
                </span>
                {hub?.has_company ? (
                  <Link
                    to="/console"
                    className="rounded-full border border-border/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Console
                  </Link>
                ) : null}
                <button
                  type="button"
                  aria-label="Abmelden"
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/nachbar" });
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                search={{ mode: "signup", next: "/nachbar/heute", lang: "de" }}
                className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
              >
                Mitspielen
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">
        {children ?? <Outlet />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0 px-1 py-1.5">
          {NACHBAR_TABS.map((tab) => {
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
