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
import { ShareBar } from "@/components/aura/share";
import { requestInstallPrompt } from "@/components/aura/install-app";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

const SITE_LINKS = [
  { to: "/share", label: "Share kit" },
  { to: "/partners/fio", label: "FIO partners" },
  { to: "/grants", label: "Grants" },
  { to: "/", label: "Waitlist", hash: "community" },
  { to: "/team", label: "Team" },
  { to: "/tokenomics", label: "Tokenomics" },
  { to: "/lightpaper", label: "Lightpaper" },
  { to: "/whitepaper", label: "Whitepaper" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/proof", label: "Proof" },
  { to: "/pitch", label: "Pitch & decks" },
  { to: "/blog", label: "Blog" },
  { to: "/access", label: "Founding seats" },
  { to: "/faq", label: "FAQ" },
] as const;

const LEGAL_LINKS = [
  { to: "/impressum", label: "Impressum" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms / AGB" },
  { to: "/cookies", label: "Cookies" },
] as const;

function ProductSwitcher() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = useMemo(() => {
    const exact = PRODUCT_SURFACES.find((p) => p.href === pathname);
    if (exact) return exact.id;
    if (pathname.startsWith("/nachbar")) return "nachbar";
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
        Switch project
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
        <optgroup label="Products">
          {PRODUCT_SURFACES.filter((p) => p.group === "product").map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.blurb}
            </option>
          ))}
        </optgroup>
        <optgroup label="Funnels">
          {PRODUCT_SURFACES.filter((p) => p.group === "funnel").map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="App">
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
  return (
    <footer className={cn("relative z-10 border-t border-primary/10 px-6 py-10", className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Join Ninty
          </span>
          <nav aria-label="Social" className="flex flex-wrap gap-2">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackTeaser("social_join", { placement: `${s.id}:footer`.slice(0, 40) })
                }
                className="rounded-xl border border-border/50 bg-foreground/4 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-[0_0_20px_-10px_var(--glow)]"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="border-t border-border/40 pt-5">
          <ProductSwitcher />
        </div>

        {share ? (
          <div className="flex flex-col gap-3 border-t border-border/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Share the cohort
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
          <span>
            ◎ {SITE_NAME} · {NINTY.short} · {NINTY.tagline} ·{" "}
            <a href={SITE_URL} className="transition-colors hover:text-foreground">
              aibusiness.fun
            </a>
          </span>
          <nav aria-label="Site" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {SITE_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                {...("hash" in l && l.hash ? { hash: l.hash } : {})}
                className="transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                trackTeaser("cta_click", { placement: "footer_install" });
                requestInstallPrompt();
              }}
              className="transition-colors hover:text-foreground"
            >
              Get app
            </button>
            {LEGAL_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
            <a
              href={`mailto:${LEGAL_EMAIL}`}
              className="normal-case tracking-normal transition-colors hover:text-foreground"
            >
              {LEGAL_EMAIL}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
