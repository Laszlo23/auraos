import {
  buildLeadDigestEmail,
  shouldSendDigestNow,
  type LeadDigestLead,
} from "@/lib/lead-digest";
import { sendDigestMail } from "@/lib/platform-mail.server";

type PrefRow = {
  company_id: string;
  enabled: boolean;
  email: string;
  timezone: string;
  hours: number[] | null;
  language: string | null;
  last_sent_slot: string | null;
  last_sent_at?: string | null;
};

function asLead(row: Record<string, unknown>): LeadDigestLead {
  const raw = row.metadata;
  const metadata =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as LeadDigestLead["metadata"])
      : null;
  return {
    id: String(row.id),
    name: (row.name as string | null) ?? null,
    org: (row.org as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    source_url: (row.source_url as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    snippet: (row.snippet as string | null) ?? null,
    score: row.score != null ? Number(row.score) : null,
    created_at: String(row.created_at),
    metadata,
  };
}

async function sendOneDigest(opts: {
  pref: PrefRow;
  force?: boolean;
  now?: Date;
  skipScout?: boolean;
}): Promise<{
  companyId: string;
  sent: boolean;
  skipped?: string;
  slot?: string;
  leadCount?: number;
  via?: string;
  error?: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hours =
    Array.isArray(opts.pref.hours) && opts.pref.hours.length > 0 ? opts.pref.hours : [8, 16];
  const timezone = opts.pref.timezone || "Europe/Vienna";
  const gate = shouldSendDigestNow({
    now: opts.now,
    timezone,
    hours,
    lastSentSlot: opts.force ? null : opts.pref.last_sent_slot,
  });
  if (!opts.force && !gate.due) {
    return { companyId: opts.pref.company_id, sent: false, skipped: "not_due", slot: gate.slot };
  }

  const slot = gate.slot;
  const { data: existing } = await supabaseAdmin
    .from("lead_digest_sends")
    .select("id, status")
    .eq("company_id", opts.pref.company_id)
    .eq("slot", slot)
    .maybeSingle();
  if (existing?.id && existing.status === "sent" && !opts.force) {
    return { companyId: opts.pref.company_id, sent: false, skipped: "already_sent", slot };
  }

  if (!opts.skipScout) {
    try {
      const { scoutListingsForCompany } = await import("@/lib/immo-listing-scout.server");
      await scoutListingsForCompany(opts.pref.company_id, { force: Boolean(opts.force) });
    } catch (e) {
      console.warn(
        "[lead-digest] listing scout skipped",
        e instanceof Error ? e.message : e,
      );
    }
  }

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id, name")
    .eq("id", opts.pref.company_id)
    .maybeSingle();
  if (!company) {
    return { companyId: opts.pref.company_id, sent: false, skipped: "company_missing", slot };
  }

  const sinceIso =
    opts.pref.last_sent_at != null
      ? new Date(opts.pref.last_sent_at).toISOString()
      : new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();

  const cutoff = sinceIso;

  const { data: newRows } = await supabaseAdmin
    .from("akquise_leads")
    .select("id, name, org, email, phone, source_url, address, snippet, score, created_at, metadata")
    .eq("company_id", opts.pref.company_id)
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(40);

  const { data: recentRows } = await supabaseAdmin
    .from("akquise_leads")
    .select("id, name, org, email, phone, source_url, address, snippet, score, created_at, metadata")
    .eq("company_id", opts.pref.company_id)
    .order("created_at", { ascending: false })
    .limit(8);

  const newLeads = (newRows ?? []).map((r) => asLead(r as Record<string, unknown>));
  const recentLeads = (recentRows ?? []).map((r) => asLead(r as Record<string, unknown>));
  const language = opts.pref.language === "en" ? "en" : "de";
  const copy = buildLeadDigestEmail({
    companyName: String(company.name || "Company"),
    language,
    slotHour: gate.hour,
    newLeads,
    recentLeads,
  });

  try {
    const sent = await sendDigestMail({
      companyId: opts.pref.company_id,
      to: opts.pref.email.trim(),
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
    });

    await supabaseAdmin.from("lead_digest_sends").upsert(
      {
        company_id: opts.pref.company_id,
        slot,
        to_email: opts.pref.email.trim(),
        lead_count: newLeads.length,
        subject: copy.subject,
        status: "sent",
        error: null,
      },
      { onConflict: "company_id,slot" },
    );

    await supabaseAdmin
      .from("lead_digest_prefs")
      .update({
        last_sent_slot: slot,
        last_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", opts.pref.company_id);

    await supabaseAdmin.from("activity_events").insert({
      company_id: opts.pref.company_id,
      kind: "product",
      message: `Lead digest emailed to ${opts.pref.email.trim()} · ${newLeads.length} new · via ${sent.via}`,
    });

    return {
      companyId: opts.pref.company_id,
      sent: true,
      slot,
      leadCount: newLeads.length,
      via: sent.via,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send_failed";
    await supabaseAdmin.from("lead_digest_sends").upsert(
      {
        company_id: opts.pref.company_id,
        slot,
        to_email: opts.pref.email.trim(),
        lead_count: newLeads.length,
        subject: copy.subject,
        status: "failed",
        error: msg.slice(0, 500),
      },
      { onConflict: "company_id,slot" },
    );
    return {
      companyId: opts.pref.company_id,
      sent: false,
      slot,
      leadCount: newLeads.length,
      error: msg,
    };
  }
}

/** Worker tick: send digests for companies whose local hour matches prefs. */
export async function runLeadDigestTick(limit = 40): Promise<{
  checked: number;
  sent: number;
  errors: string[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const errors: string[] = [];
  let sent = 0;

  const { data: prefs, error } = await supabaseAdmin
    .from("lead_digest_prefs")
    .select("company_id, enabled, email, timezone, hours, language, last_sent_slot, last_sent_at")
    .eq("enabled", true)
    .limit(limit);
  if (error) {
    return { checked: 0, sent: 0, errors: [error.message] };
  }

  for (const pref of prefs ?? []) {
    const result = await sendOneDigest({ pref: pref as PrefRow });
    if (result.sent) sent += 1;
    if (result.error) errors.push(`${result.companyId}: ${result.error}`);
  }

  return { checked: prefs?.length ?? 0, sent, errors };
}

/** Force-send for one company (desk / founder “send now”). */
export async function forceLeadDigestForCompany(
  companyId: string,
  opts?: { skipScout?: boolean },
): Promise<{
  sent: boolean;
  slot?: string;
  leadCount?: number;
  via?: string;
  error?: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pref, error } = await supabaseAdmin
    .from("lead_digest_prefs")
    .select("company_id, enabled, email, timezone, hours, language, last_sent_slot, last_sent_at")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) return { sent: false, error: error.message };
  if (!pref) return { sent: false, error: "digest_not_configured" };
  if (!pref.enabled) return { sent: false, error: "digest_disabled" };
  const result = await sendOneDigest({
    pref: pref as PrefRow,
    force: true,
    skipScout: opts?.skipScout === true,
  });
  return {
    sent: result.sent,
    slot: result.slot,
    leadCount: result.leadCount,
    via: result.via,
    error: result.error,
  };
}
