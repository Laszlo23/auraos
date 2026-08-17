import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureCompanySlug } from "@/lib/company-slug";
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

async function ensureCompanySlugRow(
  supabase: LooseDb,
  company: { id: string; name: string; slug?: string | null },
) {
  return ensureCompanySlug(supabase, company);
}

async function ownedCompany(supabase: LooseDb, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select(
      "id, name, slug, homepage_url, google_review_url, local_cohort_number, entry_funnel, is_local_business, booking_url, hours_note, cover_url, public_story",
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.id) throw new Error("Company not found");
  return data as {
    id: string;
    name: string;
    slug: string | null;
    homepage_url: string | null;
    google_review_url: string | null;
    local_cohort_number: number | null;
    entry_funnel: string | null;
    is_local_business: boolean;
    booking_url: string | null;
    hours_note: string | null;
    cover_url: string | null;
    public_story: string | null;
  };
}

function normalizeHttpUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export const getLocalBusinessHub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const slug = await ensureCompanySlugRow(supabase, company);
    company.slug = slug;

    const { data: campaign } = await supabase
      .from("review_campaigns")
      .select("id, goal_invites, status, created_at")
      .eq("company_id", company.id)
      .eq("status", "active")
      .maybeSingle();

    const inviteStats = { draft: 0, queued: 0, sent: 0, clicked: 0, completed: 0, total: 0 };
    if (campaign?.id) {
      const { data: invites } = await supabase
        .from("review_invites")
        .select("status")
        .eq("campaign_id", campaign.id);
      const rows = (invites ?? []) as { status: string }[];
      inviteStats.total = rows.length;
      for (const row of rows) {
        const k = row.status as keyof typeof inviteStats;
        if (k in inviteStats && k !== "total") inviteStats[k] += 1;
      }
    }

    const { data: channels } = await supabase
      .from("channel_connections")
      .select("provider, status")
      .eq("company_id", company.id);

    const { data: remaining } = await supabase.rpc("local_cohort_remaining");

    return {
      company,
      campaign: campaign as {
        id: string;
        goal_invites: number;
        status: string;
        created_at: string;
      } | null,
      inviteStats,
      channels: (channels ?? []) as { provider: string; status: string }[],
      cohortRemaining: typeof remaining === "number" ? remaining : null,
      publicCardPath: `/b/${slug}`,
    };
  });

export const updateLocalBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      homepageUrl?: string;
      googleReviewUrl?: string;
      name?: string;
      bookingUrl?: string;
      hoursNote?: string;
      coverUrl?: string | null;
      publicStory?: string | null;
    }) => ({
      homepageUrl: typeof input.homepageUrl === "string" ? input.homepageUrl : undefined,
      googleReviewUrl: typeof input.googleReviewUrl === "string" ? input.googleReviewUrl : undefined,
      name: typeof input.name === "string" ? input.name.trim().slice(0, 80) : undefined,
      bookingUrl: typeof input.bookingUrl === "string" ? input.bookingUrl : undefined,
      hoursNote: typeof input.hoursNote === "string" ? input.hoursNote.trim().slice(0, 160) : undefined,
      coverUrl:
        input.coverUrl === null
          ? null
          : typeof input.coverUrl === "string"
            ? input.coverUrl
            : undefined,
      publicStory:
        input.publicStory === null
          ? null
          : typeof input.publicStory === "string"
            ? input.publicStory
            : undefined,
    }),
  )
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const patch: Record<string, unknown> = {};

    if (data.homepageUrl !== undefined) {
      const url = data.homepageUrl.trim() ? normalizeHttpUrl(data.homepageUrl) : null;
      if (data.homepageUrl.trim() && !url) throw new Error("Homepage URL looks invalid.");
      patch["homepage_url"] = url;
    }
    if (data.googleReviewUrl !== undefined) {
      const url = data.googleReviewUrl.trim() ? normalizeHttpUrl(data.googleReviewUrl) : null;
      if (data.googleReviewUrl.trim() && !url) throw new Error("Google review URL looks invalid.");
      patch["google_review_url"] = url;
    }
    if (data.bookingUrl !== undefined) {
      const url = data.bookingUrl.trim() ? normalizeHttpUrl(data.bookingUrl) : null;
      if (data.bookingUrl.trim() && !url) throw new Error("Booking URL looks invalid.");
      patch["booking_url"] = url;
    }
    if (data.hoursNote !== undefined) patch["hours_note"] = data.hoursNote || null;
    if (data.name && data.name.length > 1) patch["name"] = data.name;
    if (data.coverUrl !== undefined) {
      if (data.coverUrl === null || data.coverUrl.trim() === "") {
        patch["cover_url"] = null;
      } else {
        const url = normalizeHttpUrl(data.coverUrl);
        if (!url) throw new Error("Cover URL looks invalid.");
        patch["cover_url"] = url;
      }
    }
    if (data.publicStory !== undefined) {
      const story =
        data.publicStory === null ? "" : String(data.publicStory).trim().slice(0, 1200);
      patch["public_story"] = story || null;
    }

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabase.from("companies").update(patch).eq("id", company.id);
    if (error) throw error;
    return { ok: true };
  });

export const ensureLocalCohort = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    if (company.entry_funnel !== "local" && !company.is_local_business) {
      throw new Error("Review Boost is for the local business funnel.");
    }
    const { data, error } = await supabase.rpc("assign_local_cohort", {
      _company_id: company.id,
    });
    if (error) {
      if (/local_cohort_full/i.test(error.message)) {
        throw new Error("Review Boost cohort is full (1000 local businesses).");
      }
      throw error;
    }
    return { cohortNumber: Number(data) };
  });

export const startReviewBoostCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);

    if (company.entry_funnel !== "local" && !company.is_local_business) {
      throw new Error("Review Boost is for the local business funnel.");
    }

    if (!company.local_cohort_number) {
      const { data: num, error } = await supabase.rpc("assign_local_cohort", {
        _company_id: company.id,
      });
      if (error) {
        if (/local_cohort_full/i.test(error.message)) {
          throw new Error("Review Boost cohort is full (1000 local businesses).");
        }
        throw error;
      }
      if (!num) throw new Error("Could not join Review Boost cohort.");
    }

    if (!company.google_review_url) {
      throw new Error("Add your Google Business review link before starting Review Boost.");
    }

    const { data: existing } = await supabase
      .from("review_campaigns")
      .select("id, goal_invites, status")
      .eq("company_id", company.id)
      .eq("status", "active")
      .maybeSingle();
    if (existing?.id) return existing;

    const { data: created, error } = await supabase
      .from("review_campaigns")
      .insert({
        company_id: company.id,
        goal_invites: REVIEW_BOOST_INVITE_GOAL,
        status: "active",
      })
      .select("id, goal_invites, status")
      .single();
    if (error || !created) throw error ?? new Error("Could not start campaign");

    await supabase.from("activity_events").insert({
      company_id: company.id,
      kind: "product",
      message: `Review Boost started — up to ${REVIEW_BOOST_INVITE_GOAL} real-customer invites. Founder approves every send.`,
    });

    return created;
  });

export const addReviewInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { name?: string; email: string; body?: string }) => ({
    name:
      String(input.name || "")
        .trim()
        .slice(0, 80) || null,
    email: String(input.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 200),
    body:
      String(input.body || "")
        .trim()
        .slice(0, 2000) || null,
  }))
  .handler(async ({ data, context }) => {
    if (!data.email || !data.email.includes("@")) throw new Error("Valid email required.");
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);

    const { data: campaign } = await supabase
      .from("review_campaigns")
      .select("id, goal_invites")
      .eq("company_id", company.id)
      .eq("status", "active")
      .maybeSingle();
    if (!campaign?.id) throw new Error("Start Review Boost first.");

    const { count } = await supabase
      .from("review_invites")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id);
    if ((count ?? 0) >= Number(campaign.goal_invites ?? REVIEW_BOOST_INVITE_GOAL)) {
      throw new Error("Invite capacity reached for this campaign.");
    }

    const defaultBody = [
      `Hi${data.name ? ` ${data.name}` : ""},`,
      "",
      `Thanks for choosing ${company.name}. If we earned it, would you leave a short Google review?`,
      "It helps other locals find us.",
      "",
      "Thank you!",
    ].join("\n");

    const { data: invite, error } = await supabase
      .from("review_invites")
      .insert({
        campaign_id: campaign.id,
        company_id: company.id,
        recipient_name: data.name,
        recipient_email: data.email,
        invite_body: data.body || defaultBody,
        status: "draft",
      })
      .select("id, recipient_email, recipient_name, status, tracking_token, invite_body")
      .single();
    if (error || !invite) throw error ?? new Error("Could not add invite");
    return invite;
  });

export const listReviewInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const { data, error } = await supabase
      .from("review_invites")
      .select(
        "id, recipient_email, recipient_name, status, tracking_token, invite_body, sent_at, clicked_at, completed_at, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map((row: { tracking_token: string }) => ({
      ...row,
      trackUrl: `${SITE_URL}/r/review/${row.tracking_token}`,
    }));
  });

/** Mark invite sent after founder-approved mailbox send (or manual copy of track link). */
export const markReviewInviteSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { inviteId: string }) => ({
    inviteId: String(input.inviteId),
  }))
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const { error } = await supabase
      .from("review_invites")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", data.inviteId)
      .eq("company_id", company.id)
      .in("status", ["draft", "queued"]);
    if (error) throw error;
    return { ok: true };
  });

export const markReviewInviteCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { inviteId: string }) => ({
    inviteId: String(input.inviteId),
  }))
  .handler(async ({ data, context }) => {
    const supabase = asDb(context.supabase);
    const company = await ownedCompany(supabase, context.userId);
    const { error } = await supabase
      .from("review_invites")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.inviteId)
      .eq("company_id", company.id);
    if (error) throw error;
    return { ok: true };
  });

/** Paid founding Local seats left of 1000 (excludes Aura demos). */
export const getLocalCohortScarcity = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    return { taken: 0, remaining: 1000, cap: 1000 };
  }
  const supabase = createClient(url, key);
  const [{ data: taken }, { data: remaining }] = await Promise.all([
    supabase.rpc("local_seats_sold"),
    supabase.rpc("local_seats_remaining"),
  ]);
  return {
    taken: typeof taken === "number" ? taken : 0,
    remaining: typeof remaining === "number" ? remaining : 1000,
    cap: 1000,
  };
});
