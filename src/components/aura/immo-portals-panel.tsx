import { Building2, ExternalLink } from "lucide-react";

import { Panel } from "@/components/aura/primitives";
import { AT_IMMO_PORTALS } from "@/lib/immo-portals";

/** Shared Austrian listing sources used by every realty desk. */
export function ImmoPortalsPanel() {
  const active = AT_IMMO_PORTALS.filter((p) => p.active);
  const parked = AT_IMMO_PORTALS.filter((p) => !p.active);
  return (
    <Panel label="AT Immobilien-Portale">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Shared catalog for every Austrian realty desk. The listing scout searches these public
        portals twice a day and mails matching ads into the inbox digest.
      </p>
      <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-[12px]">
        {active.map((p) => (
          <li key={p.slug} className="flex items-center justify-between gap-2 py-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{p.name}</span>
            </span>
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-primary"
            >
              {p.kind}
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
        ))}
      </ul>
      {parked.length ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Parked / inactive: {parked.map((p) => p.host).join(", ")}
        </p>
      ) : null}
    </Panel>
  );
}
