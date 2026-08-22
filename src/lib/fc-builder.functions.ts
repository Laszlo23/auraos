import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FC_BUILDER_CREDITS,
  fcBuilderCastBody,
  fcBuilderInviteUrl,
  type FcBuilderStatus,
} from "@/lib/fc-builder";
import { cycleWindow } from "@/lib/subscription";

type Db = {
  from: (table: string) => any;
};

export type FcBuilderInviteRow = {
  id: string;
  company_id: string;
  fid: number;
  username: string;
  display_name: string | null;
  claim_token: string;
  credits: number;
  status: FcBuilderStatus;
  target_cast_hash: string | null;
  reply_hash: string | null;
  cast_url: string | null;
  claimed_user_id: string | null;
  claimed_at: string | null;
  feedback: string | null;
  feedback_at: string | null;
  created_at: string;
};

function asStatus(value: string | null | undefined): FcBuilderStatus {
  switch (value) {
    case "drafted":
    case "casted":
    case "claimed":
    case "feedback":
      return value;
    default:
      return "drafted";
  }
}

function mapInvite(row: Record<string, unknown>): FcBuilderInviteRow {
  const str = (key: string) => {
    const v = row[key];
    return typeof v === "string" ? v : null;
  };
  return {
    id: String(row["id"] ?? ""),
    company_id: String(row["company_id"] ?? ""),
    fid: Number(row["fid"]),
    username: String(row["username"] ?? ""),
    display_name: str("display_name"),
    claim_token: String(row["claim_token"] ?? ""),
    credits: Number(row["credits"] ?? FC_BUILDER_CREDITS),
    status: asStatus(str("status")),
    target_cast_hash: str("target_cast_hash"),
    reply_hash: str("reply_hash"),
    cast_url: str("cast_url"),
    claimed_user_id: str("claimed_user_id"),
    claimed_at: str("claimed_at"),
    feedback: str("feedback"),
    feedback_at: str("feedback_at"),
    created_at: String(row["created_at"] ?? ""),
  };
}

async function ownedCompanyId(db: Db, userId: string, companyId: string): Promise<string> {
  const { data: owned } = await db
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (owned?.id) return owned.id as string;
  const { data: fallback } = await db
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!fallback?.id) throw new Error("No company on this account yet.");
  return fallback.id as string;
}

async function ensureInviteeCompany(db: Db, userId: string): Promise<string> {
  const { data: existing } = await db
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: company, error } = await db
    .from("companies")
    .insert({
      owner_id: userId,
      name: "Untitled company",
      emoji: "◎",
      credits: 0,
      runway_days: 0,
      mrr: 0,
      autonomy: 0,
      entry_funnel: "os",
      ui_locale: "en",
      trading_paper: true,
      trading_armed: false,
    })
    .select("id")
    .single();
  if (error || !company?.id) {
    throw new Error(error?.message || "Could not open a company for test credits.");
  }
  return company.id as string;
}

export async function grantBuilderCredits(
  db: Db,
  companyId: string,
  amount: number,
  reason: string,
): Promise<number> {
  const grant = Math.max(1, Math.floor(amount));
  const { data: sub } = await db
    .from("subscriptions")
    .select("id, tokens_remaining")
    .eq("company_id", companyId)
    .maybeSingle();

  if (sub?.id) {
    const next = Number(sub.tokens_remaining ?? 0) + grant;
    const { error } = await db
      .from("subscriptions")
      .update({ tokens_remaining: next, status: "active" })
      .eq("id", sub.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("subscriptions").insert({
      company_id: companyId,
      plan: "starter",
      status: "active",
      tokens_per_cycle: grant,
      tokens_remaining: grant,
      ...cycleWindow(),
    });
    if (error) throw new Error(error.message);
  }

  const { error: ledErr } = await db.from("token_ledger").insert({
    company_id: companyId,
    kind: "grant",
    amount: grant,
    reason: reason.slice(0, 120),
  });
  if (ledErr) throw new Error(ledErr.message);
  return grant;
}

export const listFcBuilderInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { companyId: string }) => ({
    companyId: String(input.companyId),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const companyId = await ownedCompanyId(supabaseAdmin, context.userId, data.companyId);
    const { data: rows, error } = await supabaseAdmin
      .from("fc_builder_invites")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return { invites: (rows ?? []).map((r) => mapInvite(r as Record<string, unknown>)) };
  });

export const previewFcBuilderInvite = createServerFn({ method: "GET" })
  .validator((input: { fid: number }) => ({
    fid: Math.floor(Number(input.fid)),
  }))
  .handler(async ({ data }) => {
    if (!Number.isFinite(data.fid) || data.fid <= 0) throw new Error("Need a valid FID.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("fc_builder_invites")
      .select("fid, username, display_name, credits, status, claimed_at, feedback, feedback_at")
      .eq("fid", data.fid)
      .maybeSingle();
    if (!row) return { invite: null };
    return {
      invite: {
        fid: Number(row.fid),
        username: String(row.username ?? ""),
        displayName: typeof row.display_name === "string" ? row.display_name : null,
        credits: Number(row.credits ?? FC_BUILDER_CREDITS),
        status: asStatus(row.status),
        claimed: Boolean(row.claimed_at),
        hasFeedback: Boolean(row.feedback),
      },
    };
  });

export const sendFcBuilderInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { companyId: string; fid: number; confirm: boolean }) => ({
    companyId: String(input.companyId),
    fid: Math.floor(Number(input.fid)),
    confirm: Boolean(input.confirm),
  }))
  .handler(async ({ data, context }) => {
    if (!data.confirm) throw new Error("Confirm the reply before sending.");
    if (!Number.isFinite(data.fid) || data.fid <= 0) throw new Error("Need a valid FID.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadConnectionSecrets } = await import("@/lib/social-oauth.server");
    const {
      fetchLatestCastByFid,
      lookupFarcasterUserByFid,
      neynarApiConfigured,
      publishFarcasterCast,
    } = await import("@/lib/farcaster-neynar.server");

    if (!neynarApiConfigured()) throw new Error("NEYNAR_API_KEY is not set");

    const companyId = await ownedCompanyId(supabaseAdmin, context.userId, data.companyId);
    const conn = await loadConnectionSecrets(companyId, "farcaster");
    if (!conn?.accessToken) {
      throw new Error("Connect Farcaster on Channels first — we reply from that account.");
    }

    const { data: existing } = await supabaseAdmin
      .from("fc_builder_invites")
      .select("*")
      .eq("fid", data.fid)
      .maybeSingle();
    if (existing) {
      const row = mapInvite(existing as Record<string, unknown>);
      if (row.company_id !== companyId) {
        throw new Error("That FID already has a personal invite.");
      }
      if (row.status !== "drafted") {
        return { invite: row, alreadySent: true as const };
      }
    }

    const profile = await lookupFarcasterUserByFid(data.fid);
    if (!profile?.username) throw new Error("Could not find that FID on Farcaster.");

    const latest = await fetchLatestCastByFid(data.fid);
    const token = existing
      ? String(
          (existing as { claim_token?: string }).claim_token || randomBytes(12).toString("hex"),
        )
      : randomBytes(12).toString("hex");
    const url = fcBuilderInviteUrl(data.fid, token);
    const body = fcBuilderCastBody({
      username: profile.username,
      fid: data.fid,
      url,
    });

    const published = await publishFarcasterCast(conn.accessToken, body, {
      parent: latest?.hash ?? null,
      embedUrl: url,
    });

    const payload = {
      company_id: companyId,
      fid: data.fid,
      username: profile.username.replace(/^@/, ""),
      display_name: profile.displayName || profile.username,
      claim_token: token,
      credits: FC_BUILDER_CREDITS,
      status: "casted" as const,
      target_cast_hash: latest?.hash ?? null,
      reply_hash: published.hash,
      cast_url: published.url,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = existing
      ? await supabaseAdmin
          .from("fc_builder_invites")
          .update(payload)
          .eq("id", (existing as { id: string }).id)
          .select("*")
          .single()
      : await supabaseAdmin.from("fc_builder_invites").insert(payload).select("*").single();
    if (error || !saved) throw new Error(error?.message || "Could not save the invite.");

    await supabaseAdmin.from("activity_events").insert({
      company_id: companyId,
      kind: "decision",
      message: `Orin invited @${profile.username.replace(/^@/, "")} (fid ${data.fid}) to build`,
    });

    return {
      invite: mapInvite(saved as Record<string, unknown>),
      alreadySent: false as const,
      replied: Boolean(latest?.hash),
    };
  });

export const claimFcBuilderInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { fid: number; token: string }) => ({
    fid: Math.floor(Number(input.fid)),
    token: String(input.token ?? "").trim(),
  }))
  .handler(async ({ data, context }) => {
    if (!Number.isFinite(data.fid) || data.fid <= 0) throw new Error("Need a valid FID.");
    if (data.token.length < 8) throw new Error("This invite link is missing its key.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("fc_builder_invites")
      .select("*")
      .eq("fid", data.fid)
      .eq("claim_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Invite not found — ask for a fresh personal link.");

    const invite = mapInvite(row as Record<string, unknown>);
    if (invite.claimed_user_id && invite.claimed_user_id !== context.userId) {
      throw new Error("This invite was already claimed.");
    }
    if (invite.claimed_user_id === context.userId) {
      return { alreadyClaimed: true as const, credits: invite.credits, status: invite.status };
    }

    const companyId = await ensureInviteeCompany(supabaseAdmin, context.userId);
    await grantBuilderCredits(
      supabaseAdmin,
      companyId,
      invite.credits,
      `Farcaster builder invite · fid ${invite.fid}`,
    );

    const { error: upErr } = await supabaseAdmin
      .from("fc_builder_invites")
      .update({
        status: "claimed",
        claimed_user_id: context.userId,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invite.id)
      .is("claimed_user_id", null);
    if (upErr) throw new Error(upErr.message);

    return { alreadyClaimed: false as const, credits: invite.credits, status: "claimed" as const };
  });

export const submitFcBuilderFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { fid: number; token: string; feedback: string }) => ({
    fid: Math.floor(Number(input.fid)),
    token: String(input.token ?? "").trim(),
    feedback: String(input.feedback ?? "")
      .trim()
      .slice(0, 800),
  }))
  .handler(async ({ data, context }) => {
    if (!data.feedback) throw new Error("Write a note — what should we build together?");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("fc_builder_invites")
      .select("id, claimed_user_id")
      .eq("fid", data.fid)
      .eq("claim_token", data.token)
      .maybeSingle();
    if (!row || row.claimed_user_id !== context.userId) {
      throw new Error("Claim the invite first, then leave a note.");
    }
    const { error } = await supabaseAdmin
      .from("fc_builder_invites")
      .update({
        status: "feedback",
        feedback: data.feedback,
        feedback_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
