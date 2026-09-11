import { T0_ANNOUNCE_POST, T0_ANNOUNCE_POST_FC, T0_ANNOUNCE_POST_X } from "@/lib/aura-t0-clock";
import { SHARE_POSTS, shareWatchUrl } from "@/lib/share-posts";
import { SITE_URL, TOKEN_LAUNCH_DISPLAY } from "@/lib/site";
import { tickpixRaidOpen } from "@/lib/tickpix";

/** Stable campaign id for fair-launch drip (rolling schedule through T-0). */
export const LAUNCH_DRIP_CAMPAIGN = "launch-drip-2026-08";
/** One-shot 48h T-0 announce (no CA). Distinct from the rolling drip keys. */
export const T0_ANNOUNCE_CAMPAIGN = "t0-announce-2026-09-13";
/** Farcaster sister drip — same windows, cast-length copy. */
export const FARCASTER_DRIP_CAMPAIGN = "fc-drip-2026-09";
/** LinkedIn campaign — one professional post / day (not the 3× X cadence). */
export const LINKEDIN_DRIP_CAMPAIGN = "li-drip-2026-09";
/** Same-day OS message blast — 7 clips staggered on X + Farcaster. */
export const OS_MESSAGE_CAMPAIGN = "os-message-2026-09";
export const LINKEDIN_MAX_SLOTS = 14;
/** Minutes between OS-message blast slots (same day). */
export const OS_MESSAGE_STAGGER_MS = 25 * 60 * 1000;

/** Clip order for the OS message blast (share-kit ids). */
export const OS_MESSAGE_IDS = [
  "aichanging",
  "concept",
  "nosaas",
  "osos",
  "winos-winner",
  "workflow",
  "worktogether",
] as const;

/** How far ahead to keep scheduled when no public T-0 date is published. */
export const DRIP_HORIZON_MS = 14 * 24 * 60 * 60 * 1000;
/** 14 days × 3 slots, plus a small buffer so a cap can never starve the queue again. */
export const DRIP_MAX_SLOTS = 48;

export type LaunchDripSlot = {
  /** Unique per company via DB unique index on (company_id, campaign_key). */
  campaignKey: string;
  sharePostId: string;
  body: string;
  scheduledAt: string;
};

/** Clip rotation: Wien wave first, then Quant desk + strongest kit posts. */
const ROTATION_IDS = [
  "make-good",
  "tickpix-pit",
  "ccff00-hoodstreet",
  "hookr-rules",
  "wien",
  "oida",
  "checkout",
  "1fromweek",
  "auraos-bedroom",
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
  "make-good": [
    "Culture Coin was rugged by a former partner. We make it up by building — /trust",
    "Never trust a DM with a CA. Official only: aibusiness.fun · nft.aibusiness.fun · hoodstreet.capital · hookr.fun",
    "Receipts over theater. Covenant live → six promises you can hold us to.",
  ],
  "tickpix-pit": [
    "TICKPIX CCFF00 free raid EXTENDED → 12 Sep 19:00 UTC. Mint → nft.aibusiness.fun · Pit → /pit",
    "Held CCFF00? Free seats (max 3). Then public @ 0.0001 ETH. Verify CA on Blockscout.",
    "Hold Tickpix → Pit badge + Quest XP. Hood stays the OS passport. Culture, not a fund.",
  ],
  "hookr-rules": [
    "Rules before you sign — Uniswap v4 hooks on Robinhood Chain → hookr.fun · @hookrfun only",
    "No airdrop DMs. Readable hooks. Official: hookr.fun · covenant → aibusiness.fun/trust",
    "Anti-Snipe · Surge · Burn · LP Rewards · Nth-buy Pot — fixed at pool open.",
  ],
  "ccff00-hoodstreet": [
    "CCFF00 = HoodStreet Proof of Neon. Aura verifies the NFT on-chain — soft Quest XP only.",
    "Membership NFT on Robinhood Chain — not Aura founding seats. CA on /trust.",
    "hoodstreet.capital/ccff00 · then Tickpix pit → aibusiness.fun/pit",
  ],
  wien: [
    "Ned in einem WeWork. In Wien. Cracked screen. Real street.",
    "Ottakring. Echt. Ehrlich. No pitch deck required.",
    "Homepage still in Überarbeitung. That's ok. We start here.",
  ],
  oida: [
    "Geschäft wird geschlossen. Danke für euere Treue. Herz.",
    "No judgment. Just the now. A thank-you on a shutter is still a business.",
    "See the little things. Be grateful they were here.",
  ],
  checkout: [
    "€500 BAR vs empty stars. Oida, ned des.",
    "We don't buy Google. We buy a Melange after a real visit.",
    "Reputation isn't an envelope. It's a neighbor who came back.",
  ],
  "1fromweek": [
    "Week 1. Share kit live. Not perfect. Present. Grateful. Shipping.",
    "Command center in the mountains. Heart still in Wien.",
    "See the little things. Keep the love. Stay in the now.",
  ],
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
    "Aura OS: $29 / month or $299 / year. Same desk. Cancel monthly anytime.",
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
  "auraos-bedroom": [
    "Not a bot. A desk. Quant scans. You approve. Sleep is allowed.",
    "Risk meters before size. Founder approval before live fire. $29 / mo or $299 / year.",
    "Most people still trade alone. Aura founders hire Quant into a company they own.",
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
  aichanging: [
    "AI is changing work. Own the company — don't rent another chatbot.",
    "The shift isn't better prompts. It's owning the company agents work for.",
    "AI changed the job. Own the OS that runs it.",
  ],
  concept: [
    "The concept: a company OS. Not another chatbot.",
    "You name it. Agents wake up. You approve spend.",
    "Not a chat window with a price tag — a company you own.",
  ],
  nosaas: [
    "Lonely SaaS dashboards are dead. Own a company instead.",
    "Stop stacking subscriptions. Start owning the OS.",
    "Another tab won't compound. A company will.",
  ],
  osos: [
    "OS > SaaS. You own the company. Agents execute.",
    "Rent a tool → their upside. Own the company → yours.",
    "Software that runs a company — not another monthly seat.",
  ],
  "winos-winner": [
    "Winners run an OS — not a subscription pile.",
    "Winners don't collect tabs. They run an OS.",
    "Subscription pile vs company OS. Guess which compounds.",
  ],
  workflow: [
    "Agents execute the workflow. You approve spend and outbound.",
    "Autonomy with a leash. That's the product.",
    "Nothing moves a dollar without your approval.",
  ],
  worktogether: [
    "You + AI crew. Working together — not replacing you.",
    "They draft and ship. You decide.",
    "Own the company. Work with the agents.",
  ],
};

const TICKPIX_PIT_PUBLIC_LINES = [
  "TICKPIX public mint 0.0001 ETH on Robinhood Chain. Verify CA on Blockscout — never by DM.",
  "CCFF00 free raid closed. Seats still mint at nft.aibusiness.fun · Pit → /pit",
  "Hold Tickpix → Pit badge + Quest XP. Hood stays the OS passport. Culture, not a fund.",
] as const;

function dripLinesFor(sharePostId: string, at: Date | number = Date.now()): string[] {
  if (sharePostId === "tickpix-pit" && !tickpixRaidOpen(at)) {
    return [...TICKPIX_PIT_PUBLIC_LINES];
  }
  return X_LINES[sharePostId] ?? ["Aura OS — own a company. Let AI make money."];
}

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

/** Date-based keys so re-seed after #0–#16 history still inserts remaining windows. */
function dripSlotKey(y: number, month: number, day: number, hour: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  return `${LAUNCH_DRIP_CAMPAIGN}#${y}-${mm}-${dd}T${hh}`;
}

function clipBody(sharePostId: string, lineIndex: number, at: Date | number = Date.now()): string {
  const lines = dripLinesFor(sharePostId, at);
  const line = lines[lineIndex % lines.length]!;
  if (sharePostId === "make-good") {
    const trust = `${SITE_URL}/trust`;
    const body = `${line}\n\n${trust}`;
    return body.length <= 280 ? body : body.slice(0, 280);
  }
  if (sharePostId === "tickpix-pit") {
    const pit = `${SITE_URL}/pit`;
    const mint = "https://nft.aibusiness.fun";
    const body = `${line}\n\n${pit}\nMint → ${mint}`;
    if (body.length <= 280) return body;
    const short = `${line}\n\n${pit}`;
    return short.length <= 280 ? short : short.slice(0, 280);
  }
  if (sharePostId === "ccff00-hoodstreet") {
    const body = `${line}\n\nhttps://hoodstreet.capital/ccff00\n${SITE_URL}/trust`;
    return body.length <= 280 ? body : body.slice(0, 280);
  }
  if (sharePostId === "hookr-rules") {
    const body = `${line}\n\nhttps://hookr.fun/\n${SITE_URL}/trust`;
    return body.length <= 280 ? body : body.slice(0, 280);
  }
  const url = shareWatchUrl(sharePostId);
  const seat = `${SITE_URL}/access`;
  const body = `${line}\n\n${url}\n$29 / mo or $299 / year → ${seat}`;
  if (body.length <= 280) return body;
  const short = `${line}\n\n${url}`;
  if (short.length <= 280) return short;
  const trimmed = line.slice(0, Math.max(40, 280 - url.length - 4));
  return `${trimmed}…\n\n${url}`.slice(0, 280);
}

/** Farcaster cast body — shorter, embed-friendly (Neynar embeds the watch URL). */
function farcasterCastBody(
  sharePostId: string,
  lineIndex: number,
  at: Date | number = Date.now(),
): string {
  const lines = dripLinesFor(sharePostId, at);
  const line = lines[lineIndex % lines.length]!;
  if (sharePostId === "make-good") {
    return `${line}\n\n${SITE_URL}/trust`.slice(0, 320);
  }
  if (sharePostId === "tickpix-pit") {
    return `${line}\n\n${SITE_URL}/pit`.slice(0, 320);
  }
  if (sharePostId === "ccff00-hoodstreet") {
    return `${line}\n\nhttps://hoodstreet.capital/ccff00`.slice(0, 320);
  }
  if (sharePostId === "hookr-rules") {
    return `${line}\n\nhttps://hookr.fun/`.slice(0, 320);
  }
  const url = shareWatchUrl(sharePostId);
  const body = `${line}\n\n${url}`;
  return body.slice(0, 320);
}

export type T0AnnounceSlot = {
  provider: "x" | "farcaster" | "linkedin";
  campaignKey: string;
  sharePostId: string;
  body: string;
  scheduledAt: string;
};

/** Due-now 48h T-0 announce. No CA. Idempotent campaign keys. */
export function buildT0AnnounceSlots(nowMs: number = Date.now()): T0AnnounceSlot[] {
  const scheduledAt = new Date(nowMs).toISOString();
  return [
    {
      provider: "x",
      campaignKey: `${T0_ANNOUNCE_CAMPAIGN}#x`,
      sharePostId: "t0-announce",
      body: T0_ANNOUNCE_POST_X,
      scheduledAt,
    },
    {
      provider: "farcaster",
      campaignKey: `${T0_ANNOUNCE_CAMPAIGN}#farcaster`,
      sharePostId: "t0-announce",
      body: T0_ANNOUNCE_POST_FC,
      scheduledAt,
    },
    {
      provider: "linkedin",
      campaignKey: `${T0_ANNOUNCE_CAMPAIGN}#linkedin`,
      sharePostId: "t0-announce",
      body: T0_ANNOUNCE_POST,
      scheduledAt,
    },
  ];
}

export type OsMessageSlot = {
  provider: "x" | "farcaster";
  campaignKey: string;
  sharePostId: string;
  body: string;
  scheduledAt: string;
};

/**
 * Same-day OS message blast: 7 X + 7 FC slots, staggered ~25 min.
 * First slot is due immediately. Idempotent keys: os-message-2026-09#{id}#{provider}
 */
export function buildOsMessageSlots(nowMs: number = Date.now()): OsMessageSlot[] {
  const slots: OsMessageSlot[] = [];
  OS_MESSAGE_IDS.forEach((id, index) => {
    const atMs = nowMs + index * OS_MESSAGE_STAGGER_MS;
    const scheduledAt = new Date(atMs).toISOString();
    slots.push({
      provider: "x",
      campaignKey: `${OS_MESSAGE_CAMPAIGN}#${id}#x`,
      sharePostId: id,
      body: clipBody(id, index, atMs),
      scheduledAt,
    });
    slots.push({
      provider: "farcaster",
      campaignKey: `${OS_MESSAGE_CAMPAIGN}#${id}#farcaster`,
      sharePostId: id,
      body: farcasterCastBody(id, index, atMs),
      scheduledAt,
    });
  });
  return slots;
}

export function osMessageSummary(slots: OsMessageSlot[] = buildOsMessageSlots()) {
  return {
    campaign: OS_MESSAGE_CAMPAIGN,
    count: slots.length,
    xCount: slots.filter((s) => s.provider === "x").length,
    farcasterCount: slots.filter((s) => s.provider === "farcaster").length,
    firstAt: slots[0]?.scheduledAt ?? null,
    lastAt: slots[slots.length - 1]?.scheduledAt ?? null,
  };
}

/**
 * Build the fair-launch X drip: ~2–3 posts/day for the next ~14 days
 * through T-0, skipping quiet hours (before 07:00 CEST).
 * Idempotent keys: launch-drip-2026-08#YYYY-MM-DDTHH
 * Worker re-runs this on each tick so the horizon never runs dry.
 */
export function buildLaunchDripSchedule(fromMs: number = Date.now()): LaunchDripSlot[] {
  const endMs = fromMs + DRIP_HORIZON_MS;

  const slots: LaunchDripSlot[] = [];
  let index = 0;
  // Walk calendar days in CEST from today through the horizon.
  let cursor = fromMs;
  const lastDay = cestDateParts(endMs);

  while (cursor <= endMs + 36e5 && slots.length < DRIP_MAX_SLOTS) {
    const day = cestDateParts(cursor);
    for (const hour of SLOT_HOURS_CEST) {
      // Skip hours already past today.
      if (
        day.y === cestDateParts(fromMs).y &&
        day.m === cestDateParts(fromMs).m &&
        day.d === cestDateParts(fromMs).d &&
        hour <= cestDateParts(fromMs).h
      ) {
        continue;
      }
      // Don't schedule past the rolling horizon.
      const at = cestWallToIso(day.y, day.m, day.d, hour);
      const atMs = Date.parse(at);
      if (atMs > endMs) continue;
      if (atMs <= fromMs) continue;

      const id = ROTATION_IDS[index % ROTATION_IDS.length]!;
      // Ensure share post exists (defensive).
      if (!SHARE_POSTS.some((p) => p.id === id) && !X_LINES[id]) continue;

      slots.push({
        campaignKey: dripSlotKey(day.y, day.m, day.d, hour),
        sharePostId: id,
        body: clipBody(id, index, atMs),
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

/** Same windows as X drip, Farcaster-length copy + campaign keys. */
export function buildFarcasterDripSchedule(fromMs: number = Date.now()): LaunchDripSlot[] {
  return buildLaunchDripSchedule(fromMs).map((s, index) => ({
    ...s,
    campaignKey: s.campaignKey.replace(LAUNCH_DRIP_CAMPAIGN, FARCASTER_DRIP_CAMPAIGN),
    body: farcasterCastBody(s.sharePostId, index, Date.parse(s.scheduledAt)),
  }));
}

/**
 * Slots that should already have posted between [fromMs, toMs].
 * Used to backfill gaps when the worker was down or seeding started late.
 */
export function buildMissedDripSlots(fromMs: number, toMs: number = Date.now()): LaunchDripSlot[] {
  if (!(toMs > fromMs)) return [];
  return buildLaunchDripSchedule(fromMs).filter((s) => {
    const at = Date.parse(s.scheduledAt);
    return at > fromMs && at <= toMs;
  });
}

export function launchDripSummary(slots: LaunchDripSlot[] = buildLaunchDripSchedule()) {
  return {
    campaign: LAUNCH_DRIP_CAMPAIGN,
    count: slots.length,
    firstAt: slots[0]?.scheduledAt ?? null,
    lastAt: slots[slots.length - 1]?.scheduledAt ?? null,
    launchPolicy: TOKEN_LAUNCH_DISPLAY,
  };
}

/** One LinkedIn post per CEST morning — longer, founder-to-founder. */
const LINKEDIN_CAMPAIGN: { sharePostId: string; body: string }[] = [
  {
    sharePostId: "makemoney",
    body: `Most AI products sell you a chat window — then one scary price.

Aura OS is software for running a real company with AI employees.

You own it. They execute. You approve spend and outbound.

Three honest doors:
• Try Aura — free
• Monthly — $29
• Year — $299 (about two months free vs monthly)

Wien shops: Aura Local €49 / month.

The Hood NFT is a separate optional $299 mint. Not required to run the OS.

Start here: ${SITE_URL}/pricing`,
  },
  {
    sharePostId: "aprove",
    body: `Autonomy with a leash.

Aura employees draft pitches, follow-ups, posts, and research. Nothing spends money or goes public until you tap yes.

That's the product: a company that works while you sleep — without going feral.

$29 / month or $299 / year. Same desk.

${SITE_URL}/how-it-works`,
  },
  {
    sharePostId: "make-good",
    body: `Culture Coin was rugged by a former partner. We can't rewrite that.

We make it up by building — with rules you can hold us to:

${SITE_URL}/trust

Official CAs and mint URLs only on aibusiness.fun · nft.aibusiness.fun. Never by DM.

If someone slides you a contract address, it's hostile.`,
  },
  {
    sharePostId: "wien",
    body: `Not in a WeWork. In Vienna.

A dying homepage, 4-point-something stars, and a cousin who said: you do the internet thing.

That's why Aura Local exists — real visits, real reviews, no envelopes.

€49 / month for shops. Aura OS for the company that runs them.

${SITE_URL}/lokal`,
  },
  {
    sharePostId: "hired",
    body: `Onboarding: CEO, growth, sales, product, engineering, customers, finance, social.

None of them asked about snacks. All of them wait for your approval on spend.

That's an AI company — not another chatbot seat.

Try free, then $29 / month or $299 / year.

${SITE_URL}/try`,
  },
  {
    sharePostId: "1fromweek",
    body: `Proof over theater.

Completed work on Aura OS leaves a timestamp, a written result, and a cost. If a number is zero, the work hasn't happened yet.

Live receipts: ${SITE_URL}/proof
Changelog: ${SITE_URL}/changelog`,
  },
  {
    sharePostId: "donotsleep",
    body: `They don't sleep. You can.

That's the whole pitch — not “AI will 10x you.” A company that keeps the lights on while you do life.

Fair software: ${SITE_URL}/pricing`,
  },
  {
    sharePostId: "tickpix-pit",
    body: `Two keys. No dilution.

Hood (Base) = OS founding passport.
TICKPIX (Robinhood Chain) = culture seats — not a second Hood, not a fundraise.

Verify the CA on Blockscout. Never trust a DM.

Pit: ${SITE_URL}/pit
Mint: https://nft.aibusiness.fun`,
  },
  {
    sharePostId: "classic",
    body: `Stop renting AI tools. Own the company that runs them.

Aura OS — $29 / month or $299 / year. Cancel monthly anytime. Year is the flagship.

${SITE_URL}/access`,
  },
  {
    sharePostId: "quest-squads",
    body: `Not a lonely dashboard. A world you play with friends.

AURA Quest + Squads: XP, REP, shared tasks, world pulse.

Quest → ${SITE_URL}/quest
Squads → ${SITE_URL}/community`,
  },
  {
    sharePostId: "auraos-bedroom",
    body: `Not a trading bot. A Quant desk inside a company you own.

Risk meters before size. Founder approval before live fire. Paper first.

$29 / month or $299 / year to wake the company.

${SITE_URL}/trading`,
  },
  {
    sharePostId: "checkout",
    body: `€500 BAR vs empty Google stars. Oida, ned des.

We don't buy reviews. We buy a Melange after a real visit.

That's Aura Local — reputation as a neighbor who came back.

${SITE_URL}/lokal`,
  },
  {
    sharePostId: "hookr-rules",
    body: `Rules before you sign.

Readable Uniswap v4 hooks on Robinhood Chain — not an airdrop portal.

hookr.fun · @hookrfun only
Covenant: ${SITE_URL}/trust`,
  },
  {
    sharePostId: "ccff00-hoodstreet",
    body: `CCFF00 is HoodStreet Proof of Neon — a membership NFT on Robinhood Chain.

Aura verifies the NFT on-chain. Soft Quest XP only. Not founding seats.

https://hoodstreet.capital/ccff00
${SITE_URL}/trust`,
  },
];

function liDripSlotKey(y: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${LINKEDIN_DRIP_CAMPAIGN}#${y}-${mm}-${dd}`;
}

/**
 * LinkedIn drip: one post per morning (09:14 CEST), 14-day horizon.
 * Distinct campaign_keys so they never collide with the X unique index.
 */
export function buildLinkedInDripSchedule(fromMs: number = Date.now()): LaunchDripSlot[] {
  const endMs = fromMs + DRIP_HORIZON_MS;
  const slots: LaunchDripSlot[] = [];
  let index = 0;
  let cursor = fromMs;
  const lastDay = cestDateParts(endMs);
  const fromDay = cestDateParts(fromMs);

  while (cursor <= endMs + 36e5 && slots.length < LINKEDIN_MAX_SLOTS) {
    const day = cestDateParts(cursor);
    const skipTodayMorning =
      day.y === fromDay.y && day.m === fromDay.m && day.d === fromDay.d && fromDay.h >= 9;
    if (!skipTodayMorning) {
      const at = cestWallToIso(day.y, day.m, day.d, 9);
      const atMs = Date.parse(at);
      if (atMs > fromMs && atMs <= endMs) {
        const post = LINKEDIN_CAMPAIGN[index % LINKEDIN_CAMPAIGN.length]!;
        slots.push({
          campaignKey: liDripSlotKey(day.y, day.m, day.d),
          sharePostId: post.sharePostId,
          body: post.body,
          scheduledAt: at,
        });
        index += 1;
      }
    }
    const next = cestWallToIso(day.y, day.m, day.d + 1, 8);
    cursor = Date.parse(next);
    if (day.y === lastDay.y && day.m === lastDay.m && day.d === lastDay.d) break;
  }

  return slots;
}

/** First LinkedIn campaign post — used for an immediate all-channels fire. */
export function linkedInCampaignLaunchPost(): string {
  return LINKEDIN_CAMPAIGN[0]!.body;
}

/** Short X / Farcaster blast — distinct from the fair-price announcement already live. */
export const ALL_CHANNELS_FIRE_BODY = `Every public door is open.

Try free.
$29 / month.
$299 / year.

Same OS. Hood mint optional.

${SITE_URL}/pricing`;
