import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

import {
  LEGAL_EMAIL,
  NINTY,
  PRODUCT_SURFACES,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS,
} from "@/lib/site";
import { AuraMark } from "@/components/aura/aura-logo";
import { ShareBar } from "@/components/aura/share";
import { requestInstallPrompt } from "@/components/aura/install-app";
import { useLocale } from "@/hooks/use-locale";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

function footerColumns(t: (key: string) => string) {
  return [
    {
      title: t("footer.product"),
      links: [
        { to: "/", label: "Aura OS" },
        { to: "/lokal", label: "Aura Lokal" },
        { to: "/how-it-works", label: t("footer.how") },
        { to: "/try", label: t("footer.try") },
        { to: "/compare", label: t("footer.compare") },
        { to: "/proof", label: t("footer.proof") },
        { to: "/pricing", label: t("footer.pricing") },
        { to: "/faq", label: t("footer.faq") },
      ],
    },
    {
      title: t("footer.ecosystem"),
      links: [
        { to: "/tokenomics", label: "AURA" },
        { to: "/tokenomics", label: "Tokenomics" },
        { to: "/lightpaper", label: "Lightpaper" },
        { to: "/whitepaper", label: "Whitepaper" },
        { to: "/roadmap", label: "Roadmap" },
        { to: "/marketplace", label: "Marketplace" },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { to: "/team", label: "Team" },
        { to: "/story", label: "Story" },
        { to: "/blog", label: "Blog" },
        { to: "/grants", label: "Grants" },
        { to: "/partners/fio", label: t("footer.partners") },
        { to: "/wien", label: "Wien" },
      ],
    },
    {
      title: t("footer.resources"),
      links: [
        { to: "/pitch", label: t("footer.pitch") },
        { to: "/share", label: t("footer.shareKit") },
        { to: "/review", label: t("footer.reviews") },
        { to: "/brand", label: "Brand" },
        { to: "/sticker", label: "Stickers" },
        { to: "/", label: t("footer.waitlist"), hash: "community" },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { to: "/impressum", label: "Impressum" },
        { to: "/privacy", label: t("footer.privacy") },
        { to: "/terms", label: t("footer.terms") },
        { to: "/cookies", label: t("footer.cookies") },
      ],
    },
  ];
}

function ProductSwitcher() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = useMemo(() => {
    const exact = PRODUCT_SURFACES.find((p) => p.href === pathname);
    if (exact) return exact.id;
    if (pathname.startsWith("/nachbar")) return "nachbar";
    if (
      pathname === "/wien" ||
      pathname === "/review" ||
      pathname === "/sticker" ||
      pathname === "/story"
    ) {
      return "wien";
    }
    if (pathname.startsWith("/for/")) {
      const slug = pathname.split("/")[2];
      const match = PRODUCT_SURFACES.find((p) => p.href === `/for/${slug}`);
      if (match) return match.id;
    }
    if (
      pathname.startsWith("/console") ||
      pathname.startsWith("/wallet") ||
      pathname.startsWith("/akquise") ||
      pathname.startsWith("/billing")
    ) {
      return "app";
    }
    return "os";
  }, [pathname]);

  return (
    <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        {t("footer.switch")}
      </span>
      <select
        value={current}
        aria-label="Switch between Aura products and funnels"
        onChange={(e) => {
          const next = PRODUCT_SURFACES.find((p) => p.id === e.target.value);
          if (!next) return;
          trackTeaser("cta_click", { placement: `footer_switch:${next.id}`.slice(0, 40) });
          void navigate({ to: next.href });
        }}
        className="max-w-full rounded-xl border border-border/60 bg-foreground/[0.04] px-3 py-2 text-[12px] font-medium text-foreground outline-none focus:border-primary/50 sm:min-w-[16rem]"
      >
        <optgroup label={t("footer.products")}>
          {PRODUCT_SURFACES.filter((p) => p.group === "product").map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.blurb}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("footer.funnels")}>
          {PRODUCT_SURFACES.filter((p) => p.group === "funnel").map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("footer.appGroup")}>
          {PRODUCT_SURFACES.filter((p) => p.group === "app").map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}

/**
 * Public-site footer. Legal links live here only — not in nav or marketing chrome.
 */
export function SiteFooter({
  className,
  share,
}: {
  className?: string;
  share?: { url: string; text: string; placement?: string };
}) {
  const { t } = useLocale();
  const columns = footerColumns(t);
  return (
    <footer className={cn("relative z-10 border-t border-primary/10 px-6 py-10", className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    {l.to ? (
                      <Link
                        to={l.to}
                        {...(l.hash ? { hash: l.hash } : {})}
                        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <nav aria-label={t("footer.community")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {t("footer.community")}
            </p>
            <ul className="mt-3 space-y-2">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackTeaser("social_join", { placement: `${s.id}:footer`.slice(0, 40) })
                    }
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-border/40 pt-5">
          <ProductSwitcher />
        </div>

        {share ? (
          <div className="flex flex-col gap-3 border-t border-border/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              {t("footer.share")}
            </span>
            <ShareBar url={share.url} text={share.text} placement={share.placement ?? "footer"} />
          </div>
        ) : null}

        <div
          className={cn(
            "flex flex-col gap-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground",
            "border-t border-border/40 pt-5",
            "sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <span className="inline-flex items-center gap-2 normal-case tracking-normal">
            <AuraMark className="h-4 w-4 text-primary" />
            <span className="uppercase tracking-[0.24em]">
              {SITE_NAME} · {NINTY.short} · {NINTY.tagline} ·{" "}
              <a href={SITE_URL} className="transition-colors hover:text-foreground">
                aibusiness.fun
              </a>
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => {
                trackTeaser("cta_click", { placement: "footer_install" });
                requestInstallPrompt();
              }}
              className="transition-colors hover:text-foreground"
            >
              {t("footer.app")}
            </button>
            <a
              href={`mailto:${LEGAL_EMAIL}`}
              className="normal-case tracking-normal transition-colors hover:text-foreground"
            >
              {LEGAL_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
