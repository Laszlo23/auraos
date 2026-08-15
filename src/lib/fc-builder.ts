import { SITE_URL } from "@/lib/site";

/** ~20 agent tasks at TASK_COST 12. */
export const FC_BUILDER_CREDITS = 240;

export type FcBuilderStatus = "drafted" | "casted" | "claimed" | "feedback";

export function fcBuilderInvitePath(fid: number, token?: string) {
  const base = `/i/fc/${fid}`;
  return token ? `${base}?k=${encodeURIComponent(token)}` : base;
}

export function fcBuilderInviteUrl(fid: number, token: string) {
  return `${SITE_URL}${fcBuilderInvitePath(fid, token)}`;
}

export function fcBuilderCastBody(opts: {
  username: string;
  fid: number;
  url: string;
}) {
  const handle = opts.username.replace(/^@/, "");
  const line = `@${handle} — personal invite, fid ${opts.fid}. Come build with us. Test credits waiting. No judging. Just the now.`;
  const body = `${line}\n\n${opts.url}`;
  return body.length <= 320 ? body : `${line.slice(0, 320 - opts.url.length - 5)}…\n\n${opts.url}`.slice(0, 320);
}

export function newClaimToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
