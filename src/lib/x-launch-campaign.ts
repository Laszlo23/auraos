import { SHARE_POSTS, shareWatchUrl } from "@/lib/share-posts";
import { TOKEN_LAUNCH_AT, TOKEN_LAUNCH_MS } from "@/lib/site";

/** Stable campaign id for Aug 2026 fair-launch drip. */
export const LAUNCH_DRIP_CAMPAIGN = "launch-drip-2026-08";

export type LaunchDripSlot = {
  /** Unique per company via DB unique index on (company_id, campaign_key). */
  campaignKey: string;
  sharePostId: string;
  body: string;
  scheduledAt: string;
};

/** Clip rotation: new five first, then strongest existing kit posts. */
const ROTATION_IDS = [
  "4am",
  "donotsleep",
  "hired",
  "makemoney",
  "makemoney2",
  "meanwhile",
  "aprove",
  "wait",
  "aishouldwork",
  "classic",
] as const;

/** Short X-native lines (before URL). Keep under ~200 so URL fits in 280. */
const X_LINES: Record<string, string[]> = {
  "4am": [
    "It's 4am. Coffee for me. Ship log for the agents.",
    "Woke up early. The company was already mid-sprint.",
    "4am check-in: three agent updates, zero Slack debates.",
  ],
  donotsleep: [
    "They don't sleep. You can. That's the product.",
    "Do not sleep? Nah — let the agents keep the lights on.",
    "All-nighters are optional when your employees aren't people.",
  ],
  hired: [
    "Just hired 8 AI employees. None asked about snacks.",
    "Onboarding done. Small talk cancelled. Missions queued.",
    "New team: CEO, growth, sales, research, quant, support…",
  ],
  makemoney: [
    "Own a company. Let AI make money. Keep the upside.",
    "Not a chatbot. A company OS you actually own.",
    "Stop renting AI tools. Own the company that runs them.",
  ],
  makemoney2: [
    "If AI can write emails, it can run the boring half.",
    "Make money while you sleep — as a company, not a slogan.",
    "Wake a company. Own the upside.",
  ],
  meanwhile: [
    "Meanwhile at your company: eight departments, zero you.",
    "You sleep. Growth acquires. Support answers. Repeat.",
    "Work-life balance: you do life, Aura does work.",
  ],
  aprove: [
    "They never sleep. Nothing spends without your approval.",
    "Autonomy with a leash. Chaotic good.",
    "Agents hustle 24/7 — and still ask before touching the wallet.",
  ],
  wait: [
    "Wait… I own a company that works while I doomscroll?",
    ">_ Run the company. (ok but can it run laundry too)",
    "The 2am face when you realize the agents already shipped.",
  ],
  aishouldwork: [
    "Boss: “AI should work.” Me: it already does.",
    "The meeting where “let AI run it” isn't a slide deck.",
    "Night shifts? Agents don't need PTO.",
  ],
  classic: [
    "Own a company. Let AI make money.",
    "Not a chat window — a company you own.",
    "15s. Sound optional. Brains required.",
  ],
};

/** Post windows in CEST (UTC+2 in August) — hours local, quiet before 07:00. */
const SLOT_HOURS_CEST = [9, 13, 18] as const;

function cestDateParts(ms: number): { y: number; m: number; d: number; h: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") };
}

/** Build ISO timestamp for a CEST wall-clock time (UTC+2 during fair-launch window). */
function cestWallToIso(y: number, month: number, day: number, hour: number, minute = 14): string {
  // August is CEST = UTC+2
  const utcMs = Date.UTC(y, month - 1, day, hour - 2, minute, 0);
  return new Date(utcMs).toISOString();
}

function clipBody(sharePostId: string, lineIndex: number): string {
  const lines = X_LINES[sharePostId] ?? ["Aura OS — own a company. Let AI make money."];
  const line = lines[lineIndex % lines.length]!;
  const url = shareWatchUrl(sharePostId);
  const body = `${line}\n\n${url}`;
  if (body.length <= 280) return body;
  const trimmed = line.slice(0, Math.max(40, 280 - url.length - 4));
  return `${trimmed}…\n\n${url}`.slice(0, 280);
}

/**
 * Build the fair-launch X drip: ~2–3 posts/day from `fromMs` through TOKEN_LAUNCH_AT,
 * skipping quiet hours (before 07:00 CEST). Idempotent keys: launch-drip-2026-08#N
 */
export function buildLaunchDripSchedule(fromMs: number = Date.now()): LaunchDripSlot[] {
  const endMs = TOKEN_LAUNCH_MS;
  if (!Number.isFinite(endMs) || endMs <= fromMs) {
    // Launch already passed — seed a short farewell burst of 3 slots tomorrow.
    const start = cestDateParts(fromMs);
    const slots: LaunchDripSlot[] = [];
    for (let i = 0; i < 3; i++) {
      const id = ROTATION_IDS[i % ROTATION_IDS.length]!;
      const hour = SLOT_HOURS_CEST[i % SLOT_HOURS_CEST.length]!;
      slots.push({
        campaignKey: `${LAUNCH_DRIP_CAMPAIGN}#${i}`,
        sharePostId: id,
        body: clipBody(id, i),
        scheduledAt: cestWallToIso(start.y, start.m, start.d + 1, hour),
      });
    }
    return slots;
  }

  const slots: LaunchDripSlot[] = [];
  let index = 0;
  // Walk calendar days in CEST from today through launch day.
  let cursor = fromMs;
  const lastDay = cestDateParts(endMs);

  while (cursor <= endMs + 36e5 && slots.length < 24) {
    const day = cestDateParts(cursor);
    for (const hour of SLOT_HOURS_CEST) {
      // Skip hours already past today.
      if (day.y === cestDateParts(fromMs).y &&
          day.m === cestDateParts(fromMs).m &&
          day.d === cestDateParts(fromMs).d &&
          hour <= cestDateParts(fromMs).h) {
        continue;
      }
      // Don't schedule after launch moment on launch day.
      const at = cestWallToIso(day.y, day.m, day.d, hour);
      const atMs = Date.parse(at);
      if (atMs > endMs) continue;
      if (atMs <= fromMs) continue;

      const id = ROTATION_IDS[index % ROTATION_IDS.length]!;
      // Ensure share post exists (defensive).
      if (!SHARE_POSTS.some((p) => p.id === id) && !X_LINES[id]) continue;

      slots.push({
        campaignKey: `${LAUNCH_DRIP_CAMPAIGN}#${index}`,
        sharePostId: id,
        body: clipBody(id, index),
        scheduledAt: at,
      });
      index += 1;
    }

    // Advance to next CEST calendar day noon-ish.
    const next = cestWallToIso(day.y, day.m, day.d + 1, 8);
    cursor = Date.parse(next);
    if (day.y === lastDay.y && day.m === lastDay.m && day.d === lastDay.d) break;
  }

  return slots;
}

export function launchDripSummary(slots: LaunchDripSlot[] = buildLaunchDripSchedule()) {
  return {
    campaign: LAUNCH_DRIP_CAMPAIGN,
    count: slots.length,
    firstAt: slots[0]?.scheduledAt ?? null,
    lastAt: slots[slots.length - 1]?.scheduledAt ?? null,
    launchAt: TOKEN_LAUNCH_AT,
  };
}
