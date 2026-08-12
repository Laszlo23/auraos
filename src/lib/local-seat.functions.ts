import { createServerFn } from "@tanstack/react-start";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  LOCAL_SEAT_BOOST_GRANT,
  LOCAL_SEAT_EUR,
  LOCAL_SEAT_PLAN_ID,
  boostPackById,
  isBoostPackId,
  stripePriceForBoostPack,
  type BoostPackId,
} from "@/lib/boost-packs";
import { REVIEW_BOOST_INVITE_GOAL } from "@/lib/funnels";
import { SITE_URL } from "@/lib/site";

type LooseDb = {
  from: (table: string) => any;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: Error | null }>;
};

function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

async function ownedCompany(supabase: LooseDb, userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, name, slug, entry_funnel, ui_locale, local_seat_paid_at, is_local_business, google_review_url, homepage_url, local_cohort_number, niche, city",
    )
    .eq("owner_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Kein Unternehmen gefunden.");
  return data as {
    id: string;
    name: string;
    slug: string | null;
    entry_funnel: string;
    ui_locale: string;
    local_seat_paid_at: string | null;
    is_local_business: boolean;
    google_review_url: string | null;
    homepage_url: string | null;
    local_cohort_number: number | null;
    niche: string | null;
    city: string | null;
  };
}

export const getLokalHub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tokens_remaining, plan, status")
      .eq("company_id", company.id)
      .maybeSingle();

    const { data: channels } = await supabase
      .from("channel_connections")
      .select("provider, status")
      .eq("company_id", company.id);

    const { data: campaign } = await supabase
      .from("review_campaigns")
      .select("id, goal_invites, status")
      .eq("company_id", company.id)
      .eq("status", "active")
      .maybeSingle();

    let inviteTotal = 0;
    let invitesSent = 0;
    if (campaign?.id) {
      const { count } = await supabase
        .from("review_invites")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id);
      inviteTotal = count ?? 0;
      const { count: sentCount } = await supabase
        .from("review_invites")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .in("status", ["sent", "clicked", "completed"]);
      invitesSent = sentCount ?? 0;
    }

    const { count: guestsConfirmed } = await supabase
      .from("nachbar_checkins")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("status", "confirmed");

    const paid = Boolean(company.local_seat_paid_at);
    if (paid) {
      // Ensure guest QR / review→Nachbar deep links always resolve.
      await supabase.rpc("owner_nachbar_checkin_code");
    }

    const hasGoogle = Boolean(company.google_review_url);
    const hasInvite = inviteTotal > 0;
    const hasGuest = (guestsConfirmed ?? 0) > 0;

    const nextStep = !paid
      ? ("seat" as const)
      : !hasGoogle
        ? ("reviews" as const)
        : !campaign || !hasInvite
          ? ("reviews_start" as const)
          : !hasGuest
            ? ("guests" as const)
            : !(channels ?? []).some(
                  (c: { status: string }) => c.status === "connected" || c.status === "active",
                )
              ? ("social" as const)
              : ("boost" as const);

    return {
      company,
      boostBalance: Number((sub as { tokens_remaining?: number } | null)?.tokens_remaining ?? 0),
      seatPaid: paid,
      channels: (channels ?? []) as { provider: string; status: string }[],
      reviewCampaign: campaign as { id: string; goal_invites: number; status: string } | null,
      inviteTotal,
      invitesSent,
      guestsConfirmed: guestsConfirmed ?? 0,
      nextStep,
      activation: {
        seat: paid,
        google: hasGoogle,
        invite: hasInvite,
        guest: hasGuest,
      },
    };
  });

export const redeemLocalSeatCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { code: string }) => ({
    code: String(input.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 32),
  }))
  .handler(async ({ data, context }) => {
    if (data.code.length < 6) throw new Error("Code ungültig.");
    const { data: result, error } = await asDb(context.supabase).rpc("redeem_local_seat_code", {
      _code: data.code,
    });
    if (error) {
      const msg = error.message || "";
      if (/invalid_code/i.test(msg)) throw new Error("Code ungültig oder unbekannt.");
      if (/code_already_used/i.test(msg)) throw new Error("Code wurde bereits eingelöst.");
      if (/company_not_found/i.test(msg)) throw new Error("Zuerst Unternehmen anlegen.");
      throw error;
    }
    return result as { ok: boolean; already_paid?: boolean; boost_grant?: number };
  });

/** Ops: generate Barzahlung codes. Requires LOCAL_SEAT_OPS_KEY. */
export const generateLocalSeatCodes = createServerFn({ method: "POST" })
  .validator((input: { opsKey: string; count?: number; soldNote?: string }) => ({
    opsKey: String(input.opsKey || ""),
    count: Math.min(Math.max(Number(input.count) || 1, 1), 50),
    soldNote:
      String(input.soldNote || "")
        .trim()
        .slice(0, 200) || null,
  }))
  .handler(async ({ data }) => {
    const expected = process.env["LOCAL_SEAT_OPS_KEY"]?.trim();
    const provided = data.opsKey;
    if (
      !expected ||
      !provided ||
      Buffer.byteLength(expected) !== Buffer.byteLength(provided) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
    ) {
      throw new Error("Unauthorized");
    }
    const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !key) throw new Error("Supabase admin not configured");
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const codes: string[] = [];
    for (let i = 0; i < data.count; i++) {
      const raw = crypto.getRandomValues(new Uint8Array(8));
      const body = Array.from(raw, (b) => alphabet[b % 36]!).join("");
      const code = `${body.slice(0, 4)}-${body.slice(4, 8)}`;
      const { error } = await admin.from("local_seat_codes").insert({
        code,
        amount_eur: LOCAL_SEAT_EUR,
        boost_grant: LOCAL_SEAT_BOOST_GRANT,
        sold_note: data.soldNote,
        active: true,
      });
      if (!error) codes.push(code);
    }
    return { codes, amountEur: LOCAL_SEAT_EUR, boostGrant: LOCAL_SEAT_BOOST_GRANT };
  });

export async function applyBoostPackKickoff(
  supabase: LooseDb,
  companyId: string,
  packId: BoostPackId,
  companyName: string,
) {
  const pack = boostPackById(packId);
  if (!pack) return;

  if (pack.kickoff === "review_boost") {
    const { data: existing } = await supabase
      .from("review_campaigns")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "active")
      .maybeSingle();
    if (!existing?.id) {
      await supabase.from("review_campaigns").insert({
        company_id: companyId,
        goal_invites: REVIEW_BOOST_INVITE_GOAL,
        status: "active",
      });
    }
    await supabase.from("activity_events").insert({
      company_id: companyId,
      kind: "product",
      message: `Boost-Paket Bewertungen aktiv — echte Kunden um Google-Reviews bitten (max. ${REVIEW_BOOST_INVITE_GOAL}).`,
    });
    return;
  }

  if (pack.kickoff === "social_drip") {
    await supabase.from("activity_events").insert({
      company_id: companyId,
      kind: "product",
      message: "Boost-Paket Sichtbarkeit: 3 Posts diese Woche vorbereiten und freigeben.",
    });
    await supabase.from("knowledge_items").insert({
      company_id: companyId,
      title: "Sichtbarkeit · Wochenplan",
      summary:
        "Ziel: 3 Social Posts diese Woche. Kanäle verbinden, Entwürfe freigeben, nichts ungeprüft publizieren.",
      cluster: "Lokal",
      source: "Boost",
    });
    return;
  }

  if (pack.kickoff === "akquise") {
    await supabase.from("activity_events").insert({
      company_id: companyId,
      kind: "product",
      message: `Boost-Paket Neukunden für ${companyName}: Akquise-Kampagne starten.`,
    });
    const { data: existing } = await supabase
      .from("akquise_campaigns")
      .select("id")
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle();
    if (!existing?.id) {
      await supabase.from("akquise_campaigns").insert({
        company_id: companyId,
        name: "Neukunden Boost",
        brief: `Finde 15 passende lokale Interessenten für ${companyName}`,
        goal: `Finde 15 passende lokale Interessenten für ${companyName}`,
        template: "website_leads",
        language: "de",
        status: "draft",
        target_count: 15,
        objective: "research",
      });
    }
    await supabase.from("knowledge_items").insert({
      company_id: companyId,
      title: "Neukunden · Lead Hunter",
      summary:
        "Open /akquise?autostart=1 to run research now. Real web sources only — no fake leads.",
      cluster: "Lokal",
      source: "Boost",
    });
  }
}

export { LOCAL_SEAT_PLAN_ID, isBoostPackId, stripePriceForBoostPack };

export const createLocalPeerInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await asDb(context.supabase).rpc("create_local_peer_invite");
    if (error) {
      const msg = error.message || "";
      if (/seat_required/i.test(msg)) throw new Error("Local Seat nötig für Peer-Einladungen.");
      throw error;
    }
    return data as {
      ok: boolean;
      code: string;
      invite_id: string;
      boost_grant: number;
      path: string;
    };
  });

export const acceptLocalPeerInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { code: string }) => ({
    code: String(input.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16),
  }))
  .handler(async ({ data, context }) => {
    if (data.code.length < 6) throw new Error("Code ungültig.");
    const { data: result, error } = await asDb(context.supabase).rpc("accept_local_peer_invite", {
      _code: data.code,
    });
    if (error) {
      const msg = error.message || "";
      if (/invite_not_found/i.test(msg)) throw new Error("Einladung nicht gefunden.");
      if (/self_invite/i.test(msg)) throw new Error("Eigene Einladung.");
      throw error;
    }
    return result as { ok: boolean; inviter_company_id: string };
  });
