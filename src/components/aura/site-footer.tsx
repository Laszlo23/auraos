import { Link } from "@tanstack/react-router";

import {
  BUILDING_CULTURE,
  LEGAL_EMAIL,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS,
} from "@/lib/site";
import { ShareBar } from "@/components/aura/share";
import { trackTeaser } from "@/lib/teaser-track";
import { cn } from "@/lib/utils";

const SITE_LINKS = [{ to: "/share", label: "Share kit" }, { to: "/access", label: "Earn invite" }] as const;

const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/cookies", label: "Cookies" },
] as const;

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
    <footer className={cn("relative z-10 border-t border-border/40 px-6 py-8", className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Join Building Culture
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
                className="rounded-xl border border-border/50 bg-foreground/4 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>

        {share ? (
          <div className="flex flex-col gap-3 border-t border-border/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Share the cohort
            </span>
            <ShareBar
              url={share.url}
              text={share.text}
              placement={share.placement ?? "footer"}
            />
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
            ◎ {SITE_NAME} · {BUILDING_CULTURE.name} ·{" "}
            <a href={SITE_URL} className="transition-colors hover:text-foreground">
              aibusiness.fun
            </a>
          </span>
          <nav aria-label="Site" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {SITE_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="transition-colors hover:text-foreground"
              >
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
