import { DEMO_SUBSCRIPTION_SITES } from "@/lib/sites/templates";

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDailyDrop(opts: {
  slug: string;
  brand: string;
  dropDate: string;
}): { subject: string; body: string } {
  const daySeed = opts.dropDate.replace(/-/g, "");
  const n = Number(daySeed) % 12;
  if (opts.slug.includes("horoscope") || opts.brand.toLowerCase().includes("horoscope")) {
    const signs = [
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces",
    ];
    const sign = signs[n] ?? "Leo";
    return {
      subject: `${opts.brand}: ${sign} focus — ${opts.dropDate}`,
      body: [
        `Good morning.`,
        ``,
        `Today's note leans toward ${sign} energy: protect your attention, finish one hard thing, and leave room for a small kindness.`,
        ``,
        `This is a generated daily drop from ${opts.brand}. Take what fits; leave the rest.`,
        ``,
        `— ${opts.brand}`,
      ].join("\n"),
    };
  }

  const cards = [
    "The Fool",
    "The Magician",
    "The High Priestess",
    "The Empress",
    "The Emperor",
    "The Hierophant",
    "The Lovers",
    "The Chariot",
    "Strength",
    "The Hermit",
    "Wheel of Fortune",
    "Justice",
  ];
  const card = cards[n] ?? "The Star";
  return {
    subject: `${opts.brand}: ${card} — ${opts.dropDate}`,
    body: [
      `Today's card: ${card}.`,
      ``,
      `Sit with what you already know. Then take one clear step — not ten.`,
      ``,
      `This is a generated daily drop from ${opts.brand}. Soft guidance, not destiny.`,
      ``,
      `— ${opts.brand}`,
    ].join("\n"),
  };
}

/** Generate (and optionally send) today's drop for subscription_daily sites. */
export async function runSubscriptionContentTick(limit = 20): Promise<{
  drops: number;
  sent: number;
  errors: string[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const dropDate = todayUtcDate();
  const errors: string[] = [];
  let drops = 0;
  let sent = 0;

  const { data: sites } = await supabaseAdmin
    .from("company_sites")
    .select("id, company_id, slug, template_id, content, status")
    .eq("template_id", "subscription_daily")
    .eq("status", "published")
    .limit(limit);

  for (const site of sites ?? []) {
    const content = (site.content ?? {}) as { brand?: string };
    const brand = content.brand || site.slug;

    const { data: existing } = await supabaseAdmin
      .from("site_content_drops")
      .select("id, status")
      .eq("site_id", site.id)
      .eq("drop_date", dropDate)
      .maybeSingle();

    let dropId = existing?.id as string | undefined;
    let dropStatus = existing?.status as string | undefined;

    if (!dropId) {
      const drafted = buildDailyDrop({ slug: site.slug, brand, dropDate });
      const { data: inserted, error } = await supabaseAdmin
        .from("site_content_drops")
        .insert({
          site_id: site.id,
          drop_date: dropDate,
          subject: drafted.subject,
          body: drafted.body,
          status: "draft",
        })
        .select("id, status, subject, body")
        .single();
      if (error) {
        errors.push(`${site.slug}: ${error.message}`);
        continue;
      }
      dropId = inserted.id;
      dropStatus = inserted.status;
      drops += 1;
    }

    if (dropStatus === "sent") continue;

    const { data: drop } = await supabaseAdmin
      .from("site_content_drops")
      .select("id, subject, body")
      .eq("id", dropId!)
      .maybeSingle();
    if (!drop) continue;

    const { data: subscribers } = await supabaseAdmin
      .from("site_subscribers")
      .select("email")
      .eq("site_id", site.id)
      .eq("status", "active")
      .limit(500);

    if (!subscribers?.length) continue;

    const { loadSmtpConfigForCompanyOwner, sendViaSmtp } = await import("@/lib/smtp.server");
    const mail = await loadSmtpConfigForCompanyOwner(site.company_id);
    if (!mail) {
      errors.push(`${site.slug}: no SMTP for company owner — drop left as draft`);
      continue;
    }

    let ok = 0;
    for (const sub of subscribers) {
      try {
        await sendViaSmtp({
          config: mail.config,
          to: sub.email,
          subject: drop.subject,
          text: drop.body,
        });
        ok += 1;
      } catch (err) {
        errors.push(
          `${site.slug}→${sub.email}: ${err instanceof Error ? err.message : "send failed"}`,
        );
      }
    }

    if (ok > 0) {
      await supabaseAdmin
        .from("site_content_drops")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", drop.id);
      sent += 1;
    } else {
      await supabaseAdmin
        .from("site_content_drops")
        .update({ status: "failed" })
        .eq("id", drop.id);
    }
  }

  // Touch demo catalog so seed env prices stay documented in logs when missing
  for (const demo of DEMO_SUBSCRIPTION_SITES) {
    if (!process.env[demo.envPriceKey]) {
      /* optional — founder can set price later */
    }
  }

  return { drops, sent, errors };
}

/** Draft outreach for new site leads — never auto-sends. */
export async function runSiteLeadsDraftTick(limit = 25): Promise<{
  drafted: number;
  errors: string[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const errors: string[] = [];
  let drafted = 0;

  const { data: leads } = await supabaseAdmin
    .from("site_leads")
    .select("id, email, name, company_id, site_id, status")
    .eq("status", "new")
    .order("created_at", { ascending: true })
    .limit(limit);

  for (const lead of leads ?? []) {
    const { data: site } = await supabaseAdmin
      .from("company_sites")
      .select("slug, content")
      .eq("id", lead.site_id)
      .maybeSingle();
    const brand =
      ((site?.content as { brand?: string } | null)?.brand as string | undefined) ||
      site?.slug ||
      "our team";
    const first = (lead.name || "").split(/\s+/)[0] || "there";
    const subject = `Thanks for reaching out — ${brand}`;
    const body = [
      `Hi ${first},`,
      ``,
      `Thanks for leaving your email on ${brand}. We wanted to follow up personally.`,
      ``,
      `If you're open to a short reply, what are you hoping to get help with?`,
      ``,
      `— ${brand}`,
      ``,
      `(Draft queued in Aura OS — founder approval required before send.)`,
    ].join("\n");

    const { error } = await supabaseAdmin
      .from("site_leads")
      .update({
        status: "drafted",
        draft_subject: subject,
        draft_body: body,
      })
      .eq("id", lead.id)
      .eq("status", "new");
    if (error) {
      errors.push(`${lead.id}: ${error.message}`);
      continue;
    }
    drafted += 1;
  }

  return { drafted, errors };
}
