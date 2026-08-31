import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export type PublicNavItem = {
  to: string;
  label: string;
  hash?: string;
};

const HIDE_FROM_CLASS = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
} as const;

const HIDE_FROM_MQ = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
} as const;

export function publicPrimaryNav(t: (key: string) => string): PublicNavItem[] {
  return [
    { to: "/", label: t("landing.navOs") },
    { to: "/lokal", label: t("landing.navLokal") },
    { to: "/how-it-works", label: t("landing.navHow") },
    { to: "/try", label: t("landing.navTry") },
    { to: "/proof", label: t("landing.navProof") },
    { to: "/pricing", label: t("landing.navPricing") },
    { to: "/tokenomics", label: t("landing.navTokenomics") },
    { to: "/hood", label: t("landing.navHood") },
    { to: "/wien", label: t("landing.navWien") },
  ];
}

export function PublicMobileMenu({
  items,
  hideFrom = "lg",
  className,
  children,
}: {
  items: PublicNavItem[];
  hideFrom?: keyof typeof HIDE_FROM_CLASS;
  className?: string;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const hideClass = HIDE_FROM_CLASS[hideFrom];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia(HIDE_FROM_MQ[hideFrom]);
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [hideFrom]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-foreground/[0.05] text-foreground backdrop-blur-md",
            hideClass,
            className,
          )}
          aria-label={open ? t("common.closeMenu") : t("common.menu")}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "fixed inset-0 left-0 top-0 z-[70] flex h-[100svh] max-h-[100svh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background/92 p-0 shadow-none backdrop-blur-2xl data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 [&>button]:hidden",
          hideClass,
        )}
      >
        <DialogTitle className="sr-only">{t("common.menu")}</DialogTitle>
        <DialogDescription className="sr-only">{t("common.menu")}</DialogDescription>
        <div className="flex items-center justify-end px-5 pt-[max(0.85rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("common.closeMenu")}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-border/50 bg-foreground/[0.04] text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav
          aria-label={t("common.menu")}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4"
        >
          {items.map((item) => (
            <Link
              key={`${item.to}${item.hash ?? ""}`}
              to={item.to}
              {...(item.hash ? { hash: item.hash } : {})}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-2xl px-4 py-3.5 text-[15px] font-semibold tracking-tight transition-colors",
                pathname === item.to
                  ? "bg-primary/12 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          {children ? <div className="mt-6 flex flex-col gap-3 px-1">{children}</div> : null}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
