/**
 * Growth digital-work templates for Community squads.
 * Assign social posts, X Spaces show-up, Scout invites — not equity theater.
 */

export type GrowthTaskKind =
  | "custom"
  | "social_post"
  | "space_showup"
  | "scout_invite"
  | "channels_publish";

export type GrowthTaskTemplate = {
  id: string;
  kind: GrowthTaskKind;
  title: string;
  hint: string;
  xp: number;
  href?: string;
  meta?: Record<string, unknown>;
};

export const GROWTH_TASK_KIND_LABEL: Record<GrowthTaskKind, string> = {
  custom: "Custom",
  social_post: "Social post",
  space_showup: "X Space",
  scout_invite: "Scout invite",
  channels_publish: "Channels publish",
};

export const GROWTH_TASK_TEMPLATES: GrowthTaskTemplate[] = [
  {
    id: "post-quest-kit",
    kind: "social_post",
    title: "Post Quest + Squads kit on X",
    hint: "Copy a caption from /share · paste on X · mark done with the post URL",
    xp: 60,
    href: "https://aibusiness.fun/share",
    meta: { share_post_id: "quest-squads", platform: "x" },
  },
  {
    id: "space-showup",
    kind: "space_showup",
    title: "Show up on the next Aura X Space",
    hint: "Join live · say hi · drop /quest link in chat · honor-system check-in",
    xp: 80,
    href: "https://x.com/buildingcultu3",
    meta: { platform: "x_spaces", honor: true },
  },
  {
    id: "scout-share",
    kind: "scout_invite",
    title: "Share your Scout /lokal?ref invite",
    hint: "Join Scouts on /quest · copy invite · post in Space or group chat",
    xp: 50,
    href: "https://aibusiness.fun/quest",
    meta: { hint: "Join Scouts then copy invite" },
  },
  {
    id: "channels-publish",
    kind: "channels_publish",
    title: "Publish one growth post from Channels",
    hint: "Company Channels → publish (or Autopublish queue) · paste live URL as proof",
    xp: 70,
    href: "https://aibusiness.fun/channels",
    meta: { platform: "channels" },
  },
  {
    id: "discord-pulse",
    kind: "social_post",
    title: "Drop a world-pulse win in Discord",
    hint: "Share a squad win + /community invite in Discord",
    xp: 45,
    href: "https://discord.gg/geUpHt3eSb",
    meta: { platform: "discord" },
  },
];

export function growthKindXp(kind: GrowthTaskKind): number {
  const row = GROWTH_TASK_TEMPLATES.find((t) => t.kind === kind);
  if (row) return row.xp;
  switch (kind) {
    case "social_post":
      return 60;
    case "space_showup":
      return 80;
    case "scout_invite":
      return 50;
    case "channels_publish":
      return 70;
    case "custom":
      return 40;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
