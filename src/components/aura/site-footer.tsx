import { Link } from "@tanstack/react-router";

import { SITE_NAME, SITE_URL, LEGAL_EMAIL } from "@/lib/site";
import { ShareBar } from "@/components/aura/share";
import { cn } from "@/lib/utils";

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
        {share ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            share ? "border-t border-border/40 pt-5" : "",
            "sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <span>
            ◎ {SITE_NAME} ·{" "}
            <a
              href={SITE_URL}
              className="transition-colors hover:text-foreground"
            >
              aibusiness.fun
            </a>
          </span>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
