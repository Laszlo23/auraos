/**
 * Watch / share-kit → attributed join URLs.
 * Preserves first-touch ref when present; tags UTM for viral surfaces.
 */

import { getAttribution } from "@/lib/attribution";
import { SITE_URL } from "@/lib/site";

export type ViralJoinCampaign =
  "watch" | "share_kit" | "tickpix_tape" | "scout_invite" | "make_good";

export function viralJoinHref(opts: {
  path?: "/auth" | "/access";
  campaign: ViralJoinCampaign;
  content?: string;
  mode?: "signin" | "signup";
}): string {
  const path = opts.path ?? "/auth";
  const params = new URLSearchParams({
    utm_source: "share",
    utm_medium: opts.campaign,
    utm_campaign: "viral_join",
  });
  if (opts.content) params.set("utm_content", opts.content.slice(0, 80));
  if (opts.mode) params.set("mode", opts.mode);
  if (typeof window !== "undefined") {
    const ref = getAttribution().ref_code?.trim().toUpperCase();
    if (ref) params.set("ref", ref);
  }
  return `${path}?${params.toString()}`;
}

export function viralJoinAbsolute(opts: Parameters<typeof viralJoinHref>[0]): string {
  const rel = viralJoinHref(opts);
  return `${SITE_URL}${rel.startsWith("/") ? rel : `/${rel}`}`;
}

/** ISO-ish week key for weekly quest idempotency. */
export function progressWeekKey(prefix: string): string {
  const t = new Date();
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${prefix}:${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function scoutInviteKit(scoutLink: string): string {
  return `Join Aura Local via my Scout link — when your seat pays, I earn contribution REP for connecting you (not the €49 Aura Reputation product).\n${scoutLink}`;
}

export function scoutInviteXText(scoutLink: string): string {
  return `Vienna shops: try Aura Local with my Scout invite. When your seat pays, I earn REP for connecting you.\n${scoutLink}`;
}

export function tickpixShareText(): string {
  return `TICKPIX seats on Robinhood Chain — culture for the tape, not a second Hood.\n\nPit → ${SITE_URL}/pit\nMint → https://nft.aibusiness.fun\nCovenant → ${SITE_URL}/trust\n\nVerify CA on Blockscout. Never by DM.`;
}
