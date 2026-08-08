import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";

export type TeaserEvent =
  | "open"
  | "view_start"
  | "q25"
  | "q50"
  | "q75"
  | "complete"
  | "cta_click"
  | "download"
  | "landing_view"
  | "signup_view"
  | "share"
  | "social_join"
  | "launch_share";

const KEY = "aura.visitor";

/** Stable anonymous id for this browser — no PII, only used to de-duplicate funnel steps. */
export function visitorId(): string {
  if (typeof window === "undefined") return "server000";
  let id = window.localStorage.getItem(KEY);
  if (!id || id.length < 8) {
    id = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

/** Fire-and-forget funnel event. Never blocks or breaks the UI. */
export function trackTeaser(
  event: TeaserEvent,
  opts: { placement?: string; positionPct?: number } = {},
): void {
  if (typeof window === "undefined") return;
  void supabase
    .from("teaser_events")
    .insert({
      session_id: visitorId(),
      event,
      placement: (opts.placement ?? "unknown").slice(0, 40),
      position_pct:
        opts.positionPct === undefined
          ? null
          : Math.max(0, Math.min(100, Math.round(opts.positionPct))),
      referrer: (document.referrer || window.location.href).slice(0, 500),
      ...getAttribution(),
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
