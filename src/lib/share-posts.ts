import { SITE_URL, TOKEN_LAUNCH_DISPLAY, mediaPath } from "@/lib/site";

export type ShareAspect = "vertical" | "landscape";

export type ShareCampaign = "wien-schmah";

export type SharePost = {
  id: string;
  /** Short punchy title shown on the card. */
  title: string;
  /** One-line vibe tag under the title. */
  vibe: string;
  /** Filename stem in /public (without extension). */
  file: string;
  aspect: ShareAspect;
  duration: string;
  /** Suggested platforms for this cut. */
  bestFor: string[];
  /** Primary hook — the first line people paste. */
  hook: string;
  /** Ready-to-post captions. Each already includes the CTA + link placeholder. */
  captions: string[];
  /** Featured social wave — shown first in the kit. */
  campaign?: ShareCampaign;
};

const CTA = `Fair launch ${TOKEN_LAUNCH_DISPLAY} → ${SITE_URL}`;

const WIEN_CTA = `Kein Urteil. Nur jetzt.
Die kleinen Dinge. Dankbar.

Wien → ${SITE_URL}/wien
Fair launch ${TOKEN_LAUNCH_DISPLAY} → ${SITE_URL}`;

/**
 * Public share kit — funny, copy-ready posts paired with hosted watch pages + MP4s.
 * Everyone can share a link (watch on Aura) or download for native upload. No login.
 */
export const SHARE_POSTS: SharePost[] = [
  {
    id: "wien",
    title: "Ned in einem WeWork",
    vibe: "In Wien. Cracked screen. Real street.",
    file: "wien",
    aspect: "vertical",
    duration: "15s",
    bestFor: ["TikTok", "Reels", "WhatsApp", "X"],
    campaign: "wien-schmah",
    hook: "Ned in einem WeWork. In Wien.",
    captions: [
      `Ned in einem WeWork. In Wien.

Cracked screen. Real street.
Homepage still “in Überarbeitung.”
That's ok. We start here.

Ottakring. Echt. Ehrlich.
No pitch deck required.

${WIEN_CTA}`,
      `Ned in einem WeWork.

A Beisl with a dying homepage.
A phone that already lived a life.
A street that doesn't need a slide deck.

See the little things.
Be grateful they're still open.

${WIEN_CTA}`,
      `In Wien.

Not a campus. Not a demo day.
A shop light on cobblestones.

Full focus. Full love. Just the now.

${WIEN_CTA}`,
    ],
  },
  {
    id: "oida",
    title: "Danke für euere Treue",
    vibe: "A shutter, a heart, no judgment.",
    file: "oida",
    aspect: "vertical",
    duration: "15s",
    bestFor: ["TikTok", "Reels", "WhatsApp", "X"],
    campaign: "wien-schmah",
    hook: "Geschäft wird geschlossen. Danke. Herz.",
    captions: [
      `Geschäft wird geschlossen.
Danke für euere Treue.
Herz.

No judgment. Just the now.
A handwritten thank-you on a shutter is still a business.

See the little things.
Be grateful they were here.

${WIEN_CTA}`,
      `Oida.

A shop that said goodbye with a heart
instead of a press release.

That's Wien.
That's enough.

${WIEN_CTA}`,
      `We don't rank a goodbye.
We notice it.

Thank you for the years.
Thank you for the light in the Gasse.

${WIEN_CTA}`,
    ],
  },
  {
    id: "checkout",
    title: "Oida, ned des",
    vibe: "€500 BAR vs empty stars. Wien remembers.",
    file: "checkout",
    aspect: "vertical",
    duration: "15s",
    bestFor: ["TikTok", "Reels", "X", "WhatsApp"],
    campaign: "wien-schmah",
    hook: "Cash for stars? Oida, ned des.",
    captions: [
      `€500 BAR.
Five empty stars.

Oida, ned des.

We don't buy Google.
We buy a Melange and ask after a real visit.

Love the visit. Leave the rating if it's true.

${WIEN_CTA}`,
      `Someone offered cash for stars.
Vienna said: not like that.

No fake glow.
No judging the shop that said no.

Just a real night, a real street, a real no.

${WIEN_CTA}`,
      `Reputation isn't an envelope.
It's a neighbor who came back.

That's the whole Schmäh.

${WIEN_CTA}`,
    ],
  },
  {
    id: "1fromweek",
    title: "Week 1 · Share kit live",
    vibe: "Command center in the mountains. Heart still in Wien.",
    file: "1fromweek",
    aspect: "vertical",
    duration: "15s",
    bestFor: ["TikTok", "Reels", "X", "LinkedIn"],
    campaign: "wien-schmah",
    hook: "Week 1. Not perfect. Present. Grateful. Shipping.",
    captions: [
      `Week 1.
Share kit live.
Build like Aura OS.

Not perfect.
Present.
Grateful.
Shipping.

Heart still in Wien.

${WIEN_CTA}`,
      `First week energy:
see the little things,
keep the love,
skip the judgment,
stay in the now.

Then share it with a neighbor.

${WIEN_CTA}`,
      `Command center. Mountain light.
The work is still a Beisl homepage
and a thank-you on a shutter.

That's week 1. That's enough for today.

${WIEN_CTA}`,
    ],
  },
  {
    id: "auraos-bedroom",
    title: "Not a bot. A desk.",
    vibe: "Quant scans. You approve. Sleep is allowed.",
    file: "auraos",
    aspect: "landscape",
    duration: "15s",
    bestFor: ["X", "Telegram", "LinkedIn"],
    hook: "Not a trading bot. A Quant desk inside a company you own.",
    captions: [
      `A founder opened a Quant trading desk inside Aura OS.

Not a script on an iPad.
An AI employee named Quant — plus Atlas, Vela, Iris, Cass watching the rest of the company.

Starting capital to wake the company: $99.

Here's how it works:

Quant watches live market pulses and candlesticks.
Backtests before it arms.
Risk meters before it sizes.
Founder approval before live fire.

The edge isn't “Claude vibes.”
It's speed + rules + a leash.

While people refresh one chart and second-guess entries,
Quant is already evaluating signals against a risk policy that doesn't get tired, greedy, or revenge-trade.

No emotions.
No “one more candle.”
No 3am FOMO.

Paper first. Backtest first. Then arm — if you say so.

Most people are still trading alone.
Aura founders hire Quant into a company they own.

${CTA}
Desk → ${SITE_URL}/trading
Seat → ${SITE_URL}/access`,
      `Not a bot. A desk.

Quant in Aura OS:
→ live market pulse
→ backtest before arm
→ risk meter before size
→ you approve before live

Starting seat: $99.
You own the company. Quant doesn't own your keys.

${CTA}`,
      `Why are people still trading manually?

Quant doesn't stare at one chart hoping.
It evaluates, sizes with policy, and waits for your approve.

Own the desk. Own the company.
${CTA}`,
    ],
  },
  {
    id: "4am",
    title: "4am and still shipping",
    vibe: "You woke up early. The agents never went to bed.",
    file: "4am",
    aspect: "landscape",
    duration: "10s",
    bestFor: ["X", "LinkedIn", "TikTok"],
    hook: "It's 4am. Your company already filed three updates.",
    captions: [
      `It's 4am.\nYou: coffee.\nAgents: already shipped.\n\nOwn a company that doesn't wait for you to wake up.\n\n${CTA}`,
      `The only acceptable reason to be awake at 4am:\nchecking what your AI employees did overnight.\n\n${CTA}`,
      `Grind culture called.\nI told it my agents clocked in without me.\n\n${CTA}`,
    ],
  },
  {
    id: "donotsleep",
    title: "Do not sleep (they won't)",
    vibe: "Agents don't sleep. You can. That's the deal.",
    file: "donotsleep",
    aspect: "landscape",
    duration: "15s",
    bestFor: ["X", "Telegram", "TikTok"],
    hook: "They don't sleep. You don't have to either — but you can.",
    captions: [
      `Do not sleep?\nNah.\nLet them not sleep.\nYou rest. They execute.\n\n${CTA}`,
      `My AI employees skipped the all-nighter memo.\nThey just… never clock out.\n\n${CTA}`,
      `Sleep is for founders.\nShipping is for agents.\nFair launch ${TOKEN_LAUNCH_DISPLAY}.\n\n${CTA}`,
    ],
  },
  {
    id: "hired",
    title: "Just hired 8",
    vibe: "Onboarding complete. Small talk cancelled.",
    file: "hired",
    aspect: "landscape",
    duration: "10s",
    bestFor: ["X", "LinkedIn", "Reddit"],
    hook: "Just hired 8 AI employees. None of them asked about snacks.",
    captions: [
      `Just hired 8 AI employees.\nNo offer letters.\nNo “quick syncs.”\nJust missions.\n\n${CTA}`,
      `Hiring update: the whole team showed up ready to work.\nThey still don't do lunch debates.\n\n${CTA}`,
      `Welcome to the company, agents.\nPlease don't form a Slack about the coffee machine.\n\n${CTA}`,
    ],
  },
  {
    id: "makemoney",
    title: "Let AI make money",
    vibe: "Own the company. Keep the upside.",
    file: "makemoney",
    aspect: "landscape",
    duration: "15s",
    bestFor: ["X", "LinkedIn", "YouTube Shorts"],
    hook: "Own a company. Let AI make money.",
    captions: [
      `Own a company.\nLet AI make money.\nKeep the upside.\n\nNot a chatbot. A company OS.\n\n${CTA}`,
      `The pitch in four words:\nAI employees. Your equity.\n\n${CTA}`,
      `Stop renting AI tools.\nStart owning the company that runs them.\n\n${CTA}`,
    ],
  },
  {
    id: "makemoney2",
    title: "Make money (cut 2)",
    vibe: "Same thesis. Sharper punch.",
    file: "makemoney2",
    aspect: "landscape",
    duration: "10s",
    bestFor: ["X", "TikTok", "Reels"],
    hook: "If AI can write emails, it can run the boring half of your company.",
    captions: [
      `If AI can write emails,\nit can run the boring half of your company.\nYou keep the call on risk.\n\n${CTA}`,
      `Make money while you sleep —\nnot as a slogan.\nAs a company with agents on payroll.\n\n${CTA}`,
      `Fair launch ${TOKEN_LAUNCH_DISPLAY}.\nWake a company. Own the upside.\n\n${CTA}`,
    ],
  },
  {
    id: "meanwhile",
    title: "Meanwhile at your company",
    vibe: "You sleep. Eight departments clock in.",
    file: "meanwhile",
    aspect: "landscape",
    duration: "15s",
    bestFor: ["X", "LinkedIn", "YouTube Shorts"],
    hook: "Meanwhile… your company is doing cardio without you.",
    captions: [
      `Me: sleeping.\nCEO: planning.\nGrowth: acquiring leads.\nSales: following up.\nSupport: answering customers.\nMe again: still sleeping.\n\nThis is the whole pitch.\n\n${CTA}`,
      `Work-life balance unlocked:\nI do the life.\nAura does the work.\n\n${CTA}`,
      `POV: your employees never call in sick because they aren't people.\nThey're agents. And they're rude about productivity.\n\n${CTA}`,
    ],
  },
  {
    id: "aishouldwork",
    title: "AI should work",
    vibe: "Excited boss energy vs. 'wait, that's actually real?' face.",
    file: "aishouldwork",
    aspect: "landscape",
    duration: "15s",
    bestFor: ["X", "LinkedIn", "TikTok"],
    hook: "Boss: “AI should work for us.” Me: “Sir… it already does.”",
    captions: [
      `Boss energy: “AI should work.”\nEmployee energy: processing… buffering… realizing it's not a joke.\n\nOwn a company. Let AI make money.\n\n${CTA}`,
      `The meeting where someone says “let AI run it” and for once the demo isn't a slide deck.\n\n${CTA}`,
      `Hiring update: I stopped interviewing humans for night shifts.\nThey kept needing sleep. Weird.\n\n${CTA}`,
    ],
  },
  {
    id: "aprove",
    title: "Nothing spends without you",
    vibe: "Autonomy with a leash. Chaotic good.",
    file: "aprove",
    aspect: "landscape",
    duration: "15s",
    bestFor: ["X", "Telegram", "LinkedIn"],
    hook: "They never sleep. Nothing spends a dollar without your approval.",
    captions: [
      `Quant at 3am: “signal ready — approve?”\nMe, one eye open: “nice… wait, show risk.”\n\nAutonomy. With a leash.\n\n${CTA}`,
      `AI employees that hustle 24/7 — and still ask before touching the wallet.\nThat's not a chatbot. That's a company with manners.\n\n${CTA}`,
      `My agents never sleep.\nMy bank account sleeps great.\nBecause nothing spends without me.\n\n${CTA}`,
    ],
  },
  {
    id: "automateds",
    title: "The uncanny office",
    vibe: "8 AI employees. One stare. Zero water-cooler talk.",
    file: "automateds",
    aspect: "landscape",
    duration: "15s",
    bestFor: ["X", "Reddit", "TikTok"],
    hook: "NPC office energy — except they actually ship.",
    captions: [
      `We hired 8 AI employees.\nThey showed up synchronized.\nThey don't do small talk.\nThey do missions.\n\nMission: AI-native.\n\n${CTA}`,
      `This is what “automate everything” looks like when it stops being a LinkedIn carousel.\n\n${CTA}`,
      `Whiteboard says “8 AI EMPLOYEES.”\nThe vibe says they share one braincell.\nThe P&L says that braincell is crushing it.\n\n${CTA}`,
    ],
  },
  {
    id: "wait",
    title: "Wait…",
    vibe: "The 2am realization that the company is real.",
    file: "aura_os",
    aspect: "vertical",
    duration: "15s",
    bestFor: ["TikTok", "Reels", "Shorts"],
    hook: "Wait… I own a company that works while I doomscroll?",
    captions: [
      `Wait…\n\n>_ Run the company.\n\nok but can it also run my laundry\n\n${CTA}`,
      `The face you make when you realize your AI employees shipped while you argued with strangers online.\n\n${CTA}`,
      `Wait… fair launch is ${TOKEN_LAUNCH_DISPLAY} and I'm still explaining this to group chats like it's science fiction.\n\n${CTA}`,
    ],
  },
  {
    id: "teaser-ops",
    title: "Operations hub",
    vibe: "Mission control for a company that thinks in orbits.",
    file: "teaser",
    aspect: "vertical",
    duration: "15s",
    bestFor: ["TikTok", "Reels", "X"],
    hook: "Inside the OS — Sales is just one glowing node.",
    captions: [
      `POV: your “operations” finally look like an OS, not a Google Sheet held together by hope.\n\n${CTA}`,
      `Sales node: online.\nBrain: glowing.\nFounder: still pretending this is normal.\n\n${CTA}`,
      `Not another AI wrapper.\nAn operating system for a company you own.\n\n${CTA}`,
    ],
  },
  {
    id: "think",
    title: "Could think for itself",
    vibe: "Eight departments. One nervous system.",
    file: "teasernice",
    aspect: "vertical",
    duration: "15s",
    bestFor: ["TikTok", "Reels", "Shorts"],
    hook: "What if your company could think for itself?",
    captions: [
      `…could think for itself?\n\nMarketing. Quant. Support. Research.\nOne glowing brain. Zero Slack fights about lunch.\n\n${CTA}`,
      `What if the company had a nervous system — and you were the owner, not the unpaid intern.\n\n${CTA}`,
      `8 departments wired to one core.\nYou approve the risky stuff.\nThey do the boring stuff at 3am.\n\n${CTA}`,
    ],
  },
  {
    id: "classic",
    title: "The classic cut",
    vibe: "15s vertical — the feed-native teaser.",
    file: "aura-teaser",
    aspect: "vertical",
    duration: "15s",
    bestFor: ["TikTok", "Reels", "X", "Shorts"],
    hook: "Own a company. Let AI make money.",
    captions: [
      `Own a company.\nLet AI make money.\nKeep the upside.\n\n15 seconds. Sound optional. Brains required.\n\n${CTA}`,
      `Not a chat window.\nA company you own — staffed by AI employees that execute.\n\n${CTA}`,
      `Drop this in the group chat that still thinks “AI company” means another chatbot with a logo.\n\n${CTA}`,
    ],
  },
];

export function shareVideoSrc(file: string) {
  return mediaPath(`/${file}.mp4`);
}

export function sharePosterSrc(file: string) {
  return mediaPath(`/share/${file}.jpg`);
}

export function shareDownloadName(file: string) {
  return `aura-os-${file}.mp4`;
}

/** Absolute URL for sharing the kit page (or a deep-linked post). */
export function shareKitUrl(postId?: string) {
  return postId ? `${SITE_URL}/share#${postId}` : `${SITE_URL}/share`;
}

/** Hosted watch page — primary share target for link cards. */
export function shareWatchUrl(postId: string) {
  return `${SITE_URL}/v/${postId}`;
}

export function shareEmbedUrl(postId: string) {
  return `${SITE_URL}/embed/${postId}`;
}

export function shareVideoAbsoluteUrl(file: string) {
  return `${SITE_URL}${mediaPath(`/${file}.mp4`)}`;
}

export function sharePosterAbsoluteUrl(file: string) {
  return `${SITE_URL}${mediaPath(`/share/${file}.jpg`)}`;
}

export function getSharePost(postId: string): SharePost | undefined {
  return SHARE_POSTS.find((p) => p.id === postId);
}

export function isWienWave(post: SharePost) {
  return post.campaign === "wien-schmah";
}

export function wienWavePosts() {
  return SHARE_POSTS.filter(isWienWave);
}

/** Cycle the Wien wave. After a classic clip, land people in the wave. */
export function nextLoopPost(currentId: string): SharePost {
  const wave = wienWavePosts();
  const current = getSharePost(currentId);
  if (current && isWienWave(current)) {
    const ix = wave.findIndex((p) => p.id === currentId);
    return wave[(ix + 1) % wave.length] ?? wave[0]!;
  }
  return wave[0] ?? SHARE_POSTS[0]!;
}

/** Video dimensions for OG / Twitter player tags. */
export function shareVideoDims(aspect: ShareAspect): { width: number; height: number } {
  return aspect === "vertical" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
}

/**
 * Fetch a kit MP4 as a File for download / Web Share.
 * Throws if the asset is missing or not video.
 */
export async function fetchShareVideoFile(file: string): Promise<File> {
  const src = shareVideoSrc(file);
  const res = await fetch(src, { credentials: "same-origin" });
  if (!res.ok) {
    throw new Error(`Video unavailable (${res.status}). Try again in a moment.`);
  }
  const type = res.headers.get("content-type") || "";
  if (type && !type.includes("video") && !type.includes("octet-stream") && !type.includes("mp4")) {
    throw new Error("Video unavailable — got a non-video response.");
  }
  const blob = await res.blob();
  if (blob.size < 1024) {
    throw new Error("Video file looks empty.");
  }
  const name = shareDownloadName(file);
  return new File([blob], name, { type: blob.type || "video/mp4" });
}

export async function downloadShareVideo(file: string): Promise<void> {
  const videoFile = await fetchShareVideoFile(file);
  const url = URL.createObjectURL(videoFile);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = videoFile.name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
  }
}
