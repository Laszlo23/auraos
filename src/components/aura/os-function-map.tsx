import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { NAV, localizedNavHint, localizedNavLabel, type NavItem } from "@/lib/nav";
import { filterOsMapPillars, readOsMapCollapsed, writeOsMapCollapsed } from "@/lib/os-function-map";
import { cn } from "@/lib/utils";

const NAV_BY_PATH = new Map(NAV.map((n) => [n.to, n]));

export type OsFunctionMapHints = {
  /** Channels / social connected */
  socialConnected?: boolean;
  /** Mailbox live for outreach */
  mailboxLive?: boolean;
  /** Compact wallet / funds hint */
  hasFundsHint?: boolean;
};

/**
 * Map-first overview of the OS desk — what exists, filtered by visible nav.
 * Collapse persists in localStorage so power users can tuck it away.
 */
export function OsFunctionMap({
  visiblePaths,
  hints,
  className,
}: {
  visiblePaths: Iterable<string>;
  hints?: OsFunctionMapHints;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readOsMapCollapsed());
  }, []);

  const pillars = useMemo(() => filterOsMapPillars(visiblePaths), [visiblePaths]);

  if (pillars.length === 0) return null;

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v;
      writeOsMapCollapsed(next);
      return next;
    });
  };

  return (
    <Panel
      label={t("console.map.panel")}
      glow
      className={className}
      action={
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          {collapsed ? t("console.map.expand") : t("console.map.collapse")}
          {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>
      }
    >
      <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
        {t("console.map.intro")}
      </p>

      {!collapsed ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {pillars.map((pillar) => {
            const hint = pillarHint(pillar.id, hints, t);
            return (
              <div
                key={pillar.id}
                className="rounded-2xl bg-foreground/[0.03] p-4 ring-1 ring-border/40"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t(pillar.titleKey)}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {t(pillar.blurbKey)}
                </p>
                {hint ? <p className="mt-2 text-[11px] font-medium text-primary">{hint}</p> : null}
                <ul className="mt-3 space-y-1.5">
                  {pillar.paths.map((path) => {
                    const item = NAV_BY_PATH.get(path);
                    if (!item) return null;
                    return (
                      <li key={path}>
                        <MapLink item={item} locale={locale} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {pillars.map((pillar) => (
            <button
              key={pillar.id}
              type="button"
              onClick={toggle}
              className="rounded-full bg-foreground/5 px-3 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/40 transition-colors hover:text-foreground"
            >
              {t(pillar.titleKey)}
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

function MapLink({ item, locale }: { item: NavItem; locale: "en" | "de" }) {
  const label = localizedNavLabel(item, true, locale);
  const hint = localizedNavHint(item, locale);
  return (
    <Link
      to={item.to}
      title={hint}
      className={cn(
        "group flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-[13px] font-medium text-foreground",
        "bg-background/40 transition-colors hover:bg-primary/10 hover:text-primary",
      )}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground group-hover:text-primary">
        →
      </span>
    </Link>
  );
}

function pillarHint(
  id: string,
  hints: OsFunctionMapHints | undefined,
  t: (key: string) => string,
): string | null {
  if (!hints) return null;
  if (id === "marketing" && hints.socialConnected) return t("console.map.hint.social");
  if (id === "leads" && hints.mailboxLive) return t("console.map.hint.mailbox");
  if (id === "leads" && hints.mailboxLive === false) return t("console.map.hint.mailboxNeeded");
  if (id === "liquidity" && hints.hasFundsHint) return t("console.map.hint.funds");
  return null;
}
