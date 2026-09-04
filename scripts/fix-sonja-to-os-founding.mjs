/**
 * Fix Sonja: OS console (not Lokal) + founding seat €299/year cash + leads, no Google.
 * Run: node --env-file=.env scripts/fix-sonja-to-os-founding.mjs
 */
import { createClient } from "@supabase/supabase-js";

const EMAIL = "investment.sn@yahoo.com";
const USER_ID = "adeac1e2-0f95-454c-9925-50eaba4e8286";
const COMPANY_ID = "afb03dc0-8c0f-4ecf-86fb-16cff18ee4ae";
const AMOUNT_CENTS = 29_900; // €299 / year cash → liquidity later
const CASH_SESSION = `cash_eur_sonja_immobilien_20260904`;

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const AGENTS = [
  {
    name: "Atlas",
    role: "Chief Executive",
    avatar: "◎",
    accent: "cyan",
    memory:
      "CEO for Sonja Immobilien. Primary job: qualified leads (buyers, sellers, investors). Social drafts support lead flow. Never run Google review campaigns.",
  },
  {
    name: "Vela",
    role: "Growth & Marketing",
    avatar: "✧",
    accent: "rose",
    memory:
      "Growth for Wien real estate. Prospecting briefs + social that drives inquiries. No fake leads. No Google review asks.",
  },
  {
    name: "Orin",
    role: "Social Voice",
    avatar: "◈",
    accent: "teal",
    memory:
      "Social voice for listings and market tips. Draft-only until Sonja approves. Never push Google reviews.",
  },
  {
    name: "Iris",
    role: "Product & Storefront",
    avatar: "◆",
    accent: "violet",
    memory: "Mandate / offer landing copy for acquisition. No fake metrics.",
  },
  {
    name: "Juno",
    role: "Customer Success",
    avatar: "◉",
    accent: "amber",
    memory: "Warm follow-ups with prospects. Never invent conversations.",
  },
  {
    name: "Ledger",
    role: "Finance",
    avatar: "▣",
    accent: "emerald",
    memory: "Track seat and compute usage. No tax advice.",
  },
];

async function main() {
  const { data: userCheck } = await admin.auth.admin.getUserById(USER_ID);
  if (!userCheck.user || userCheck.user.email?.toLowerCase() !== EMAIL) {
    throw new Error(`User mismatch for ${USER_ID}`);
  }

  // 1) Founding seat (€299 cash)
  const { data: seatGrant, error: seatErr } = await admin.rpc("grant_founding_seat", {
    _user_id: USER_ID,
    _stripe_session_id: CASH_SESSION,
    _invite_code: null,
    _amount_cents: AMOUNT_CENTS,
    _payment_intent: "cash_eur_year_liquidity",
  });
  if (seatErr) throw seatErr;
  console.log("founding_seat", seatGrant);

  // 2) Flip company to OS console (entry_funnel is DB-immutable — set via SQL once if needed)
  const { data: coNow } = await admin
    .from("companies")
    .select("entry_funnel")
    .eq("id", COMPANY_ID)
    .single();
  if (coNow?.entry_funnel !== "os") {
    throw new Error(
      `entry_funnel is '${coNow?.entry_funnel}' — run SQL: DISABLE TRIGGER companies_entry_funnel_immutable; UPDATE … SET entry_funnel='os'; ENABLE TRIGGER…`,
    );
  }

  const { error: coErr } = await admin
    .from("companies")
    .update({
      name: "Sonja Immobilien",
      slug: "sonja-immobilien",
      tagline: "Immobilien Wien — Leads & Sichtbarkeit",
      is_local_business: false,
      network_backlink: false,
      local_seat_paid_at: null,
      local_cohort_number: null,
      google_review_url: null,
      niche: "Real estate",
      city: "Wien",
      ui_locale: "de",
      owner_display_name: "Sonja",
      public_email: EMAIL,
      public_story:
        "Immobilienmaklerin. Fokus: qualifizierte Leads + Social. Keine Google-Bewertungen.",
      services: [
        "Wohnungskauf",
        "Wohnungsverkauf",
        "Investoren",
        "Lead Generation",
        "Social Visibility",
      ],
      strategy:
        "Founding Seat (€299/Jahr Bar → Liquidity). OS-Console. Ziel: echte Eigentümer-/Käufer-/Investoren-Leads in Wien + Social-Entwürfe zur Freigabe. Keine Google-Review-Kampagne.",
      trading_paper: true,
      trading_armed: false,
      autonomy: 1,
    })
    .eq("id", COMPANY_ID);
  if (coErr) throw coErr;

  // 3) Subscription = founding compute (not local_seat boost packs)
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, tokens_remaining")
    .eq("company_id", COMPANY_ID)
    .maybeSingle();
  if (sub?.id) {
    await admin
      .from("subscriptions")
      .update({
        plan: "founding_seat",
        status: "active",
        payment_mode: "cash_eur_year",
        tokens_remaining: Math.max(Number(sub.tokens_remaining) || 0, 50_000),
        tokens_per_cycle: 50_000,
      })
      .eq("id", sub.id);
  } else {
    await admin.from("subscriptions").insert({
      company_id: COMPANY_ID,
      plan: "founding_seat",
      status: "active",
      payment_mode: "cash_eur_year",
      tokens_remaining: 50_000,
      tokens_per_cycle: 50_000,
    });
  }

  // 4) Agents (ensure OS roster)
  for (const a of AGENTS) {
    const { data: exists } = await admin
      .from("agents")
      .select("id")
      .eq("company_id", COMPANY_ID)
      .eq("name", a.name)
      .maybeSingle();
    if (exists?.id) {
      await admin
        .from("agents")
        .update({
          role: a.role,
          memory: a.memory,
          status: "active",
          current_task: "Leads & Social — awaiting brief",
        })
        .eq("id", exists.id);
      continue;
    }
    await admin.from("agents").insert({
      company_id: COMPANY_ID,
      name: a.name,
      role: a.role,
      avatar: a.avatar,
      accent: a.accent,
      status: "active",
      current_task: "Leads & Social — awaiting brief",
      health: 100,
      performance: 0,
      activity: 0,
      revenue_generated: 0,
      credits_used: 0,
      tasks_completed: 0,
      lessons_count: 0,
      memory: a.memory,
    });
  }

  // 5) Akquise = real estate leads
  const { data: akq } = await admin
    .from("akquise_campaigns")
    .select("id")
    .eq("company_id", COMPANY_ID)
    .limit(1)
    .maybeSingle();
  if (akq?.id) {
    await admin
      .from("akquise_campaigns")
      .update({
        name: "Immobilien Leads Wien",
        brief:
          "Finde 15 passende Eigentümer, Verkäufer oder Investoren in Wien für Sonja Immobilien. Nur echte Kontakte aus öffentlichen Quellen. Keine Google-Reviews.",
        goal: "15 qualifizierte Immobilien-Leads (Wien)",
        template: "real_estate",
        language: "de",
        status: "draft",
        target_count: 15,
        objective: "research",
      })
      .eq("id", akq.id);
  } else {
    await admin.from("akquise_campaigns").insert({
      company_id: COMPANY_ID,
      name: "Immobilien Leads Wien",
      brief:
        "Finde 15 passende Eigentümer, Verkäufer oder Investoren in Wien für Sonja Immobilien. Nur echte Kontakte aus öffentlichen Quellen.",
      goal: "15 qualifizierte Immobilien-Leads (Wien)",
      template: "real_estate",
      language: "de",
      status: "draft",
      target_count: 15,
      objective: "research",
    });
  }

  // 6) Knowledge — OS + leads only (strip Lokal / Google playbooks)
  await admin.from("knowledge_items").delete().eq("company_id", COMPANY_ID);
  await admin.from("knowledge_items").insert([
    {
      company_id: COMPANY_ID,
      title: "Sonja · OS Spielregeln",
      summary: [
        "Du bist auf der gleichen Console wie Aura OS Founders (/console).",
        "Ziel 1: Leads — /akquise mit Template Real Estate starten.",
        "Ziel 2: Social — /channels verbinden, Entwürfe unter Approvals freigeben.",
        "Keine Google-Bewertungen. Kein Lokal-Hub (Heute/Sterne).",
        "Seat: €299/Jahr Bar — Founding Seat (Liquidity später).",
      ].join("\n"),
      cluster: "Company",
      source: "Onboarding",
    },
    {
      company_id: COMPANY_ID,
      title: "Leads · Real Estate",
      summary:
        "Open /akquise?autostart=1 — Template real_estate. Nur echte Web-Quellen. Freigabe vor Outreach.",
      cluster: "Sales",
      source: "Onboarding",
    },
    {
      company_id: COMPANY_ID,
      title: "Social · Visibility",
      summary:
        "Connect channels, let Orin/Vela draft listing + market posts. Nothing publishes without Sonja.",
      cluster: "Growth",
      source: "Onboarding",
    },
  ]);

  await admin.from("activity_events").insert({
    company_id: COMPANY_ID,
    kind: "product",
    message:
      "Upgraded to OS Founding Seat (€299/Jahr Bar). Console = /console. Focus: Leads + Social. No Google reviews.",
  });

  await admin.from("founder_progress").upsert(
    {
      company_id: COMPANY_ID,
      xp: 200,
      level: 1,
      streak_days: 1,
      last_active: new Date().toISOString(),
      onboarded: true,
      completed_quests: ["founding_seat", "leads_ready", "social_focus"],
    },
    { onConflict: "company_id" },
  );

  await admin.from("profiles").upsert({
    id: USER_ID,
    email: EMAIL,
    full_name: "Sonja",
    founder_goal: "Immobilien-Leads Wien (OS Founding Seat)",
  });

  // 7) Desk: correct sale line (founding €299, not local €99)
  await admin.from("team_desk_sales").insert({
    closer: "Laszlo",
    product: "founding_seat",
    amount_cents: AMOUNT_CENTS,
    currency: "EUR",
    customer_name: "Sonja Immobilien",
    notes:
      "Bar €299/Jahr ausstehend → Liquidity. OS Founding Seat. Leads + Social, kein Google. investment.sn@yahoo.com",
  });

  await admin.from("team_desk_events").insert({
    closer: "Laszlo",
    kind: "sale_logged",
    message: `Sonja Immobilien flipped to OS Founding Seat · €299/Jahr Bar · leads focus`,
    metadata: {
      company_id: COMPANY_ID,
      email: EMAIL,
      entry_funnel: "os",
      amount_cents: AMOUNT_CENTS,
    },
  });

  // Void old local seat code note (keep row for audit)
  await admin
    .from("local_seat_codes")
    .update({
      sold_note:
        "VOIDED — Sonja moved to OS Founding Seat €299 (was mistaken Local Seat). See founding_seats cash_eur_sonja_immobilien_20260904",
      active: false,
    })
    .eq("redeemed_company_id", COMPANY_ID);

  const { data: seat } = await admin
    .from("founding_seats")
    .select("amount_cents, paid_at, outbound_invite_code, stripe_session_id")
    .eq("user_id", USER_ID)
    .maybeSingle();

  const { data: co } = await admin
    .from("companies")
    .select("name, entry_funnel, is_local_business, local_seat_paid_at, google_review_url")
    .eq("id", COMPANY_ID)
    .single();

  console.log(
    JSON.stringify(
      {
        ok: true,
        company: co,
        foundingSeat: seat,
        login: "https://aibusiness.fun/auth",
        console: "https://aibusiness.fun/console",
        akquise: "https://aibusiness.fun/akquise?autostart=1",
        channels: "https://aibusiness.fun/channels",
        note: "Log out/in or hard refresh so LocalDeShell is gone",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
