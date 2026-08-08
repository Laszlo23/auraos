import { SITE_URL, TOKEN_LAUNCH_DISPLAY } from "@/lib/site";

export type ShareAspect = "vertical" | "landscape";

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
};

const CTA = `Fair launch ${TOKEN_LAUNCH_DISPLAY} → ${SITE_URL}`;

/**
 * Public share kit — funny, copy-ready posts paired with hosted watch pages + MP4s.
 * Everyone can share a link (watch on Aura) or download for native upload. No login.
 */
export const SHARE_POSTS: SharePost[] = [
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
      `Quant at 3am: “+$4,280 overnight.”\nMe, one eye open, typing like a raccoon: “nice… wait approve?”\n\nAutonomy. With a leash.\n\n${CTA}`,
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
    id: "auraos-bedroom",
    title: "Quant while you dream",
    vibe: "Candlesticks in the bedroom. Soft life meets hard metrics.",
    file: "auraos",
    aspect: "landscape",
    duration: "15s",
    bestFor: ["X", "Instagram", "Telegram"],
    hook: "12 actions. 4 leads. 3 campaigns. 0 alarms.",
    captions: [
      `12 actions completed.\n4 leads.\n3 campaigns launched.\nAlarms snoozed: infinite.\n\nMy Quant agent grinds charts. I grind sleep.\n\n${CTA}`,
      `This is “set it and forget it” when it actually works — not when your SaaS just emails you a weekly digest.\n\n${CTA}`,
      `Bedroom aesthetic. Boardroom output.\nAura OS doesn't care where you rest.\n\n${CTA}`,
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
  return `/${file}.mp4`;
}

export function sharePosterSrc(file: string) {
  return `/share/${file}.jpg`;
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
  return `${SITE_URL}/${file}.mp4`;
}

export function sharePosterAbsoluteUrl(file: string) {
  return `${SITE_URL}/share/${file}.jpg`;
}

export function getSharePost(postId: string): SharePost | undefined {
  return SHARE_POSTS.find((p) => p.id === postId);
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
