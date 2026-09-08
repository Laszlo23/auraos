import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Coins,
  Crown,
  Hammer,
  Landmark,
  Menu,
  Radio,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { PulseOrbit } from "@/components/aura/pulse-orbit";
import { SocialBrandIcon } from "@/components/aura/social-brand-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/hooks/use-locale";
import { SOCIAL_LINKS } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

export type PublicNavItem = {
  to: string;
  label: string;
  hash?: string;
  /** Gold accent (e.g. Hood) */
  accent?: "gold";
};

/** Always visible on desktop — keep this short. */
export function publicNavPrimary(t: (key: string) => string): PublicNavItem[] {
  return [
    { to: "/how-it-works", label: t("landing.navHow") },
    { to: "/pricing", label: t("landing.navPricing") },
    { to: "/token", label: t("landing.navToken") },
    { to: "/hood", label: t("landing.navHood"), accent: "gold" },
  ];
}

/** Secondary links — desktop "More" menu + mobile explore section. */
export function publicNavMore(t: (key: string) => string): PublicNavItem[] {
  return [
    { to: "/try", label: t("landing.navTry") },
    { to: "/pit", label: t("landing.navPit") },
    { to: "/for/builders", label: t("landing.navBuilders") },
    { to: "/lokal", label: t("landing.navLokal") },
    { to: "/proof", label: t("landing.navProof") },
    { to: "/tokenomics", label: t("landing.navTokenomics") },
    { to: "/sale", label: t("landing.navSale") },
    { to: "/wien", label: t("landing.navWien") },
  ];
}

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

const NAV_ICONS: Record<string, LucideIcon> = {
  "/how-it-works": Sparkles,
  "/pricing": Tag,
  "/for/builders": Hammer,
  "/hood": Crown,
  "/pit": Radio,
  "/try": Zap,
  "/lokal": Store,
  "/proof": ShieldCheck,
  "/token": Coins,
  "/tokenomics": Coins,
  "/sale": Tag,
  "/wien": Landmark,
};

function NavHairline({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-4 h-px shrink-0", className)} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border/70 to-transparent" />
      <div className="absolute inset-x-[18%] inset-y-0 bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
    </div>
  );
}

function NavSectionRule() {
  return (
    <div className="my-1.5 flex items-center gap-3 px-4" aria-hidden>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
      <span className="text-[8px] text-gold/50">◆</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/35 to-transparent" />
    </div>
  );
}

function MobileNavRow({
  item,
  active,
  onClick,
}: {
  item: PublicNavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = NAV_ICONS[item.to] ?? Sparkles;
  const gold = item.accent === "gold";

  return (
    <Link
      to={item.to}
      {...(item.hash ? { hash: item.hash } : {})}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium tracking-tight transition-colors",
        active
          ? "bg-primary/12 text-foreground"
          : gold
            ? "text-gold hover:bg-gold/10"
            : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition-colors",
          active
            ? "border-primary/30 bg-primary/10 text-primary"
            : gold
              ? "border-gold/25 bg-gold/10 text-gold"
              : "border-border/40 bg-foreground/[0.04] text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.85} />
      </span>
      <span className="font-semibold">{item.label}</span>
    </Link>
  );
}

function MobileSocialBar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLocale();

  return (
    <div className="shrink-0 border-t border-border/40 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
      <p className="label-luxury mb-3 text-[10px] text-muted-foreground">{t("footer.community")}</p>
      <div className="flex items-center gap-2">
        {SOCIAL_LINKS.map((s) => (
          <a
            key={s.id}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            title={s.hint}
            onClick={() => {
              trackTeaser("social_join", { placement: `${s.id}:mobile-nav`.slice(0, 40) });
              onNavigate?.();
            }}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border/45 bg-foreground/[0.04] text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
          >
            <SocialBrandIcon id={s.id} />
            <span className="sr-only">{s.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  className,
  onClick,
}: {
  item: PublicNavItem;
  active: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={item.to}
      {...(item.hash ? { hash: item.hash } : {})}
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        item.accent === "gold"
          ? active
            ? "text-gold"
            : "text-gold/85 hover:text-gold"
          : active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {item.label}
    </Link>
  );
}

function DesktopMoreMenu({ items, pathname }: { items: PublicNavItem[]; pathname: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = items.some((i) => i.to === pathname);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[13px] font-medium transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {t("landing.navMore")}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-2xl border border-border/50 bg-background/95 p-1.5 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                pathname === item.to
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PublicMobileMenu({
  primary,
  more,
  hideFrom = "lg",
  className,
  children,
}: {
  primary: PublicNavItem[];
  more?: PublicNavItem[];
  hideFrom?: keyof typeof HIDE_FROM_CLASS;
  className?: string;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const hideClass = HIDE_FROM_CLASS[hideFrom];
  const secondary = more ?? [];

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
          className="flex min-h-0 flex-1 flex-col overflow-hidden pt-1"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
            <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("landing.navSectionMain")}
            </p>
            <div className="flex flex-col">
              {primary.map((item, i) => (
                <div key={item.to}>
                  <MobileNavRow
                    item={item}
                    active={pathname === item.to}
                    onClick={() => setOpen(false)}
                  />
                  {i < primary.length - 1 ? <NavHairline /> : null}
                </div>
              ))}
            </div>
            {secondary.length > 0 ? (
              <>
                <NavSectionRule />
                <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t("landing.navSectionExplore")}
                </p>
                <div className="flex flex-col">
                  {secondary.map((item, i) => (
                    <div key={item.to}>
                      <MobileNavRow
                        item={item}
                        active={pathname === item.to}
                        onClick={() => setOpen(false)}
                      />
                      {i < secondary.length - 1 ? <NavHairline /> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            {children ? (
              <>
                <NavSectionRule />
                <div className="flex flex-col gap-2 px-1 pt-1">{children}</div>
              </>
            ) : null}
          </div>
          <MobileSocialBar onNavigate={() => setOpen(false)} />
        </nav>
      </DialogContent>
    </Dialog>
  );
}

type PublicSiteHeaderProps = {
  /** Primary CTA — internal route or external href */
  cta?: { to?: string; href?: string; label: string; search?: Record<string, string> };
  /** Optional ghost link (e.g. Hood #mint anchor) shown before primary CTA */
  ghostCta?: { href: string; label: string };
  showSignIn?: boolean;
  onCtaClick?: () => void;
  fixed?: boolean;
  mobileMenuFooter?: ReactNode;
};

export function PublicSiteHeader({
  cta,
  ghostCta,
  showSignIn = true,
  onCtaClick,
  fixed = false,
  mobileMenuFooter,
}: PublicSiteHeaderProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const primary = publicNavPrimary(t);
  const more = publicNavMore(t);

  const ctaLink = cta ?? {
    to: "/auth",
    label: t("landing.navStart"),
    search: { mode: "signup" },
  };

  return (
    <header
      className={cn(
        "z-30 border-b border-white/[0.04] bg-background/35 backdrop-blur-2xl",
        fixed ? "fixed inset-x-0 top-0" : "sticky top-0",
      )}
    >
      <div className="austria-bar" aria-hidden />
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <PulseOrbit size="sm" />
          <span className="hidden font-display text-sm font-semibold tracking-tight text-foreground/95 sm:inline">
            Aura OS
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 lg:flex">
          {primary.map((item) => (
            <NavLink key={item.to} item={item} active={pathname === item.to} />
          ))}
          <DesktopMoreMenu items={more} pathname={pathname} />
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5 lg:ml-0">
          <LanguageToggle className="hidden border-white/15 bg-black/20 sm:inline-flex" />
          {showSignIn ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
              className="hidden rounded-xl px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
            >
              {t("landing.signIn")}
            </button>
          ) : null}
          {ghostCta ? (
            <a
              href={ghostCta.href}
              className="hidden rounded-xl border border-gold/35 px-3 py-2 text-sm font-semibold text-gold/90 transition-colors hover:border-gold/55 hover:text-gold md:inline-flex"
            >
              {ghostCta.label}
            </a>
          ) : null}
          {ctaLink.href ? (
            <a
              href={ctaLink.href}
              onClick={onCtaClick}
              className="cta-liquid cta-magnetic shrink-0 rounded-2xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_28px_-10px_var(--glow)] sm:px-4"
            >
              {ctaLink.label}
            </a>
          ) : (
            <Link
              to={ctaLink.to!}
              {...(ctaLink.search ? { search: ctaLink.search } : {})}
              onClick={onCtaClick}
              className="cta-liquid cta-magnetic shrink-0 rounded-2xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_28px_-10px_var(--glow)] sm:px-4"
            >
              {ctaLink.label}
            </Link>
          )}
          <PublicMobileMenu primary={primary} more={more} hideFrom="lg">
            {mobileMenuFooter ?? (
              <>
                <LanguageToggle className="self-start sm:hidden" />
                {showSignIn ? (
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
                    className="rounded-xl border border-border/50 px-3 py-2 text-sm font-semibold"
                  >
                    {t("landing.signIn")}
                  </button>
                ) : null}
                {ctaLink.href ? (
                  <a
                    href={ctaLink.href}
                    onClick={onCtaClick}
                    className="cta-liquid rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                  >
                    {ctaLink.label}
                  </a>
                ) : (
                  <Link
                    to={ctaLink.to!}
                    {...(ctaLink.search ? { search: ctaLink.search } : {})}
                    onClick={onCtaClick}
                    className="cta-liquid rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                  >
                    {ctaLink.label}
                  </Link>
                )}
              </>
            )}
          </PublicMobileMenu>
        </div>
      </div>
      <div
        className="h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        aria-hidden
      />
    </header>
  );
}
