import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Command as CommandIcon,
  Grip,
  Layers3,
  LogOut,
  MessageSquare,
  Plus,
  Sparkle,
  TriangleAlert,
  X,
} from "lucide-react";

import { isMoreGroup, NAV_GROUPS, navForFunnel, navLabel } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useSimpleMode } from "@/hooks/use-simple-mode";
import { useSwipeAxis } from "@/hooks/use-swipe-axis";
import { compact } from "@/lib/format";
import { useCompany } from "@/hooks/use-aura";
import { useSubscription } from "@/hooks/use-tokens";
import { levelFromXp, useProgress } from "@/hooks/use-progress";
import { TOKEN_SYMBOL } from "@/lib/plans";
import { funnelById, isFunnelId } from "@/lib/funnels";
import { trackAppEvent } from "@/lib/app-track";
import { supabase } from "@/integrations/supabase/client";
import { Pulse } from "./primitives";
import { PulseOrbit } from "./pulse-orbit";
import { CeoChat } from "./ceo-chat";
import { isLocalFunnelCompany, LocalDeShell } from "./local-de-shell";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function Shell({ children }: { children: React.ReactNode }) {
  const { data: company, isLoading } = useCompany();

  if (isLoading) {
    return <div className="min-h-svh bg-background">{children}</div>;
  }

  if (isLocalFunnelCompany(company)) {
    return <LocalDeShell>{children}</LocalDeShell>;
  }

  return <AuraOsShell>{children}</AuraOsShell>;
}

function AuraOsShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const { data: sub } = useSubscription();
  const { data: progress } = useProgress();
  const { simple, toggle: toggleSimple } = useSimpleMode();

  const entryFunnel =
    company?.entry_funnel && isFunnelId(company.entry_funnel) ? company.entry_funnel : "os";
  const funnelNav = funnelById(entryFunnel);

  const visibleNav = useMemo(
    () => navForFunnel(funnelNav.navCore, simple),
    [funnelNav.navCore, simple],
  );
  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.filter((g) => visibleNav.some((n) => n.group === g)).filter(
        (g) => !simple || !isMoreGroup(g),
      ),
    [visibleNav, simple],
  );

  /** Bottom tabs: funnel preferred order, then fill from visibleNav. */
  const mobileTabs = useMemo(() => {
    const preferred =
      funnelNav.mobileTabs.length > 0
        ? funnelNav.mobileTabs
        : (["/console", "/missions", "/approvals", "/proofs"] as const);
    const byTo = new Map(visibleNav.map((n) => [n.to, n]));
    const tabs: typeof visibleNav = [];
    for (const to of preferred) {
      const item = byTo.get(to);
      if (item) tabs.push(item);
    }
    for (const n of visibleNav) {
      if (tabs.length >= 4) break;
      if (!tabs.some((t) => t.to === n.to)) tabs.push(n);
    }
    return tabs.slice(0, 4);
  }, [visibleNav, funnelNav.mobileTabs]);

  const lvl = levelFromXp(progress?.xp ?? 0);
  const needsOnboarding = Boolean(progress && !progress.onboarded);
  const immersive = pathname === "/onboarding";

  useEffect(() => {
    if (!company?.id) return;
    trackAppEvent("page_view", { company_id: company.id, path: pathname });
  }, [company?.id, pathname]);

  // Adaptive slide: panes move along the nav order, so navigation reads as one surface.
  const navIndex = useMemo(
    () => visibleNav.findIndex((n) => n.to === pathname),
    [visibleNav, pathname],
  );

  const slideBy = (step: number) => {
    if (navIndex < 0) return;
    const next = visibleNav[navIndex + step];
    if (next) navigate({ to: next.to });
  };

  const routeSwipe = useSwipeAxis({
    axis: "x",
    enabled: navIndex >= 0,
    onSwipe: (dir) => slideBy(dir),
  });

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (needsOnboarding && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [needsOnboarding, pathname, navigate]);

  const tokenPct = sub ? Math.round((sub.tokens_remaining / sub.tokens_per_cycle) * 100) : 100;
  const lowTokens = tokenPct < 35;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return immersive ? (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-16 md:px-10 md:py-24">{children}</main>
  ) : (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col gap-2 px-3 py-4 transition-[width] duration-500 md:flex",
          collapsed ? "w-[76px]" : "w-[232px]",
        )}
      >
        <div className="glass flex-1 overflow-y-auto rounded-[1.7rem] px-2.5 py-4">
          <Link
            to="/console"
            title="Dashboard"
            className={cn(
              "mb-6 flex items-center gap-2.5 rounded-2xl px-2 py-1.5 transition-colors hover:bg-foreground/5",
              collapsed && "justify-center",
            )}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/25 to-gold/10 text-lg text-primary shadow-[0_0_24px_-8px_var(--glow)] ring-1 ring-primary/20">
              {company?.emoji ? company.emoji : <PulseOrbit size="sm" label={false} />}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">
                  {company?.name ?? "Aura OS"}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Pulse /> live
                </p>
              </div>
            )}
          </Link>

          {visibleGroups.map((group) => (
            <div key={group} className="mb-5">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground/70">
                  {simple ? "Your company" : group}
                </p>
              )}
              <nav
                className="space-y-0.5"
                aria-label={simple ? "Company navigation" : `${group} navigation`}
              >
                {visibleNav
                  .filter((n) => n.group === group)
                  .map((item) => {
                    const active = pathname === item.to;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        title={item.hint ?? item.label}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="nav-active"
                            transition={{ type: "spring", stiffness: 380, damping: 34 }}
                            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/16 to-primary/6 ring-1 ring-primary/28"
                          />
                        )}
                        <Icon
                          className={cn(
                            "relative h-[17px] w-[17px] shrink-0",
                            active && "text-primary",
                          )}
                        />
                        {!collapsed && (
                          <span className="relative truncate">{navLabel(item, simple)}</span>
                        )}
                        {!collapsed && item.live && (
                          <span className="relative ml-auto">
                            <Pulse tone={active ? "primary" : "muted"} />
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </nav>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleSimple}
          title={simple ? "Show every surface" : "Show only the essentials"}
          aria-label={simple ? "Show every surface" : "Show only the essentials"}
          className={cn(
            "glass-soft flex items-center justify-center gap-2 rounded-2xl py-2 text-xs transition-colors",
            simple ? "text-muted-foreground hover:text-foreground" : "text-primary",
          )}
        >
          <Layers3 className="h-4 w-4" aria-hidden />
          {!collapsed && (simple ? "More" : "Less")}
        </button>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="glass-soft flex items-center justify-center gap-2 rounded-2xl py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            aria-hidden
          />
          {!collapsed && "Collapse"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 space-y-2 px-4 pt-4 md:px-5">
          <div className="glass flex items-center gap-3 rounded-[1.7rem] px-3.5 py-2.5 sm:px-4">
            <Link
              to="/console"
              title="Dashboard"
              className="hidden min-w-0 items-center gap-2.5 rounded-2xl transition-opacity hover:opacity-80 lg:flex"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-primary/22 to-gold/10 text-sm text-primary ring-1 ring-primary/20">
                {company?.emoji ? company.emoji : <PulseOrbit size="sm" label={false} />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold leading-tight">
                  {company?.name ?? "Aura OS"}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  autonomous company
                </p>
              </div>
              <span className="ml-1 flex shrink-0 items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary ring-1 ring-primary/20">
                <Pulse /> active
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              className="glass-soft flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-3.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Sparkle
                className="h-[18px] w-[18px] shrink-0 text-primary md:h-4 md:w-4"
                strokeWidth={1.9}
              />
              <span className="truncate font-display text-[13px] font-medium tracking-[-0.01em] md:text-sm md:font-normal md:tracking-normal">
                Ask the company anything…
              </span>
              <kbd className="ml-auto hidden items-center gap-1 rounded-lg bg-foreground/8 px-1.5 py-0.5 font-mono text-[10px] sm:flex">
                <CommandIcon className="h-3 w-3" />K
              </kbd>
            </button>

            <Link
              to="/billing"
              className="hidden shrink-0 items-center gap-2 rounded-2xl bg-gold/12 px-3 py-1.5 text-xs text-gold transition-opacity hover:opacity-80 sm:flex"
            >
              <span className="num font-semibold">{compact(sub?.tokens_remaining ?? 0)}</span>
              {TOKEN_SYMBOL}
            </Link>

            <Link
              to="/community"
              title={`Level ${lvl.level} — ${lvl.into}/${lvl.needed} XP`}
              className="hidden shrink-0 items-center gap-2 rounded-2xl bg-primary/10 px-3 py-1.5 text-xs text-primary transition-opacity hover:opacity-80 lg:flex"
            >
              <span className="num font-semibold">LV {lvl.level}</span>
              <span className="relative h-1 w-10 overflow-hidden rounded-full bg-primary/20">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${(lvl.into / lvl.needed) * 100}%` }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-y-0 left-0 bg-primary"
                />
              </span>
            </Link>

            <Link
              to="/ceo"
              className="cta-liquid flex shrink-0 items-center gap-2 rounded-2xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_24px_-8px_var(--glow)] transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Instruct
            </Link>

            <button
              type="button"
              onClick={() => setRailOpen((v) => !v)}
              title="Toggle CEO rail"
              aria-label="Toggle CEO chat rail"
              aria-pressed={railOpen}
              className={cn(
                "hidden h-9 w-9 shrink-0 place-items-center rounded-2xl transition-colors xl:grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                railOpen
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-foreground/6",
              )}
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
            </button>

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {bannerOpen && lowTokens && (
            <div className="glass-soft flex items-center gap-3 rounded-2xl border-gold/25 px-4 py-2 text-[12px] text-gold">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">
                Token reserve at {tokenPct}% — Ledger recommends topping up before the next cycle.
              </span>
              <Link
                to="/billing"
                className="ml-auto shrink-0 font-semibold underline-offset-4 hover:underline"
              >
                Top up
              </Link>
              <button
                type="button"
                onClick={() => setBannerOpen(false)}
                aria-label="Dismiss token reserve warning"
                className="shrink-0 opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1" {...routeSwipe}>
          {/*
            Do NOT wrap Outlet in AnimatePresence mode="wait".
            TanStack Router updates the match immediately; Presence keeps a stale
            tree and the URL changes while the previous page stays on screen.
          */}
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full min-w-0 max-w-[1440px] px-5 pb-32 pt-7 md:px-8 md:pb-10 md:pt-9"
          >
            {children}
          </motion.main>

          {railOpen && pathname !== "/ceo" && (
            <aside className="sticky top-[86px] hidden h-[calc(100vh-104px)] w-[340px] shrink-0 px-4 pb-4 xl:block">
              <div className="glass flex h-full flex-col rounded-3xl">
                <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
                  <span className="h-1.5 w-1.5 rotate-45 bg-primary/70" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    CEO chat
                  </span>
                  <Link
                    to="/ceo"
                    className="ml-auto text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
                  >
                    expand
                  </Link>
                </div>
                <div className="min-h-0 flex-1 p-3">
                  <CeoChat variant="rail" />
                </div>
              </div>
            </aside>
          )}
        </div>

        <AnimatePresence>
          {sheetOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-xl md:hidden"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                onClick={(e) => e.stopPropagation()}
                className="glass absolute inset-x-3 bottom-3 max-h-[76vh] overflow-y-auto rounded-[28px] p-4"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/20" />
                {visibleGroups.map((group) => (
                  <div key={group} className="mb-5">
                    <p className="mb-2.5 px-1 font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground/80">
                      {simple ? "Your company" : group}
                    </p>
                    <div className="grid grid-cols-4 gap-2.5">
                      {visibleNav
                        .filter((n) => n.group === group)
                        .map((item) => {
                          const Icon = item.icon;
                          const active = pathname === item.to;
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              className={cn(
                                "glass-soft flex flex-col items-center gap-2 rounded-2xl px-1.5 py-3.5 transition-colors",
                                active
                                  ? "text-primary ring-1 ring-primary/30"
                                  : "text-muted-foreground",
                              )}
                            >
                              <Icon
                                className="h-[22px] w-[22px]"
                                strokeWidth={active ? 2.15 : 1.85}
                              />
                              <span className="w-full truncate text-center font-display text-[11px] font-semibold leading-tight tracking-[-0.01em]">
                                {navLabel(item, simple)}
                              </span>
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                ))}
                <button
                  onClick={toggleSimple}
                  className="glass-soft flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-display text-[12px] font-semibold tracking-wide text-muted-foreground"
                >
                  <Layers3 className="h-[18px] w-[18px]" strokeWidth={1.85} />
                  {simple ? "Show everything" : "Back to simple mode"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="glass fixed inset-x-3 bottom-3 z-30 flex items-end justify-around gap-0.5 rounded-[1.85rem] px-2 pb-2.5 pt-2.5 md:hidden">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/20 to-primary/8 ring-1 ring-primary/30"
                  />
                )}
                <Icon className="relative h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.9} />
                <span
                  className={cn(
                    "relative max-w-full truncate font-display text-[9px] font-semibold uppercase leading-none tracking-[0.12em]",
                    active ? "text-primary" : "text-muted-foreground/85",
                  )}
                >
                  {navLabel(item, simple)}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setSheetOpen(true)}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition-colors",
              sheetOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Grip className="h-[22px] w-[22px]" strokeWidth={sheetOpen ? 2.2 : 1.9} />
            <span className="relative font-display text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground/85">
              More
            </span>
          </button>
        </nav>
      </div>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput
          placeholder={
            simple ? "Search your menu…" : "Search anything — including advanced sections…"
          }
        />
        <CommandList>
          <CommandEmpty>Nothing matched. Try the CEO.</CommandEmpty>
          {visibleGroups.map((group) => (
            <CommandGroup key={group} heading={group}>
              {visibleNav
                .filter((n) => n.group === group)
                .map((item) => (
                  <CommandItem
                    key={item.to}
                    value={`${item.label} ${item.plain ?? ""} ${item.hint ?? ""}`}
                    onSelect={() => {
                      setPaletteOpen(false);
                      navigate({ to: item.to });
                    }}
                  >
                    <item.icon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate">{navLabel(item, simple)}</span>
                      {item.hint && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
