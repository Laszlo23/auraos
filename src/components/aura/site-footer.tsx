import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

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
        { to: "/pitch", label: t("landing.navPitch") },
        { to: "/features", label: t("footer.features") },
        { to: "/how-it-works", label: t("footer.how") },
        { to: "/guide", label: t("footer.guide") },
        { to: "/try", label: t("footer.try") },
        { to: "/pricing", label: t("footer.pricing") },
        { to: "/proof", label: t("footer.proof") },
        { to: "/faq", label: t("footer.faq") },
      ],
    },
    {
      title: t("footer.ecosystem"),
      links: [
        { to: "/hood", label: "The Hood" },
        { to: "/pit", label: "TICKPIX Pit" },
        { to: "/trust", label: "Covenant" },
        { to: "/tokenomics", label: "Tokenomics" },
        { to: "/get", label: t("landing.navBuy") },
        { to: "/swap", label: "Swap desk" },
        { to: "/square", label: "Aura Square" },
        { to: "/token", label: "AURA" },
        { to: "/roadmap", label: "Roadmap" },
        { to: "/for/builders", label: "Creators" },
        { to: "/lokal", label: "Aura Local" },
        { to: "/marketplace", label: "Agent Store" },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { to: "/impressum", label: "Impressum" },
        { to: "/privacy", label: t("footer.privacy") },
        { to: "/terms", label: t("footer.terms") },
        { to: "/cookies", label: t("footer.cookies") },
        { to: "/brand", label: "Brand" },
        { to: "/team", label: "Team" },
      ],
    },
  ];
}

function ProductSwitcher() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pills: { id: string; label: string; href: string }[] = [
    ...PRODUCT_SURFACES.filter((p) => ["os", "lokal", "app"].includes(p.id)),
    { id: "hood", label: "The Hood", href: "/hood" },
    { id: "pit", label: "TICKPIX", href: "/pit" },
    { id: "builders", label: "Creators", href: "/for/builders" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((p) => {
        const active =
          pathname === p.href ||
          (p.id === "hood" && pathname.startsWith("/hood")) ||
          (p.id === "pit" && pathname.startsWith("/pit"));
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              trackTeaser("cta_click", { placement: `footer_switch:${p.id}`.slice(0, 40) });
              void navigate({ to: p.href });
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
              active
                ? "border-primary/45 bg-primary/12 text-foreground"
                : "border-border/50 bg-foreground/[0.04] text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
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
    <footer
      className={cn("cv-auto relative z-10 border-t border-transparent px-6 py-10", className)}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
              <li>
                <Link
                  to="/changelog"
                  className="text-[13px] font-medium text-foreground transition-colors hover:text-primary"
                >
                  {t("footer.changelog")}
                </Link>
              </li>
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
          <p className="label-luxury mb-3 text-muted-foreground">{t("footer.switch")}</p>
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
            <Link
              to="/donate"
              onClick={() => trackTeaser("cta_click", { placement: "footer_donate" })}
              className="inline-flex shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("footer.donate")}
            </Link>
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
