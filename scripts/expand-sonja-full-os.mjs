/**
 * Expand Sonja Immobilien to full OS console parity:
 * CEO Atlas, Grow/Quest, Wallet handle, Content Studio (X/Facebook),
 * full agent desk, missions, leads — no Google reviews.
 *
 * node --env-file=.env scripts/expand-sonja-full-os.mjs
 */
import { createClient } from "@supabase/supabase-js";

const USER_ID = "adeac1e2-0f95-454c-9925-50eaba4e8286";
const COMPANY_ID = "afb03dc0-8c0f-4ecf-86fb-16cff18ee4ae";
const EMAIL = "investment.sn@yahoo.com";

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
      "CEO for Sonja Immobilien (full Aura OS). Orchestrate leads, social automation (X + Facebook), wallet, and growth quests. Never invent metrics. Never run Google review campaigns.",
  },
  {
    name: "Vela",
    role: "Growth & Marketing",
    avatar: "✧",
    accent: "rose",
    memory:
      "Growth + X/Facebook campaign drafts for Wien Immobilien. Prospecting + drip calendars. Publish only after channel connect + founder approval.",
  },
  {
    name: "Orin",
    role: "Social Voice",
    avatar: "◈",
    accent: "teal",
    memory:
      "Social voice for X and Facebook. Draft listing tips, market notes, trust posts. Draft/queue mode until Sonja approves. No Google review asks.",
  },
  {
    name: "Iris",
    role: "Product & Storefront",
    avatar: "◆",
    accent: "violet",
    memory: "Landing + mandate offer copy. Storefront drafts for Sonja Immobilien.",
  },
  {
    name: "Juno",
    role: "Customer Success",
    avatar: "◉",
    accent: "amber",
    memory: "Follow-up with leads and past clients. Never invent conversations.",
  },
  {
    name: "Cass",
    role: "Engineering",
    avatar: "⬡",
    accent: "slate",
    memory:
      "Automations: channel connect health, schedule queues for X/Facebook, mission telemetry. No fake live post URLs.",
  },
  {
    name: "Ledger",
    role: "Finance",
    avatar: "▣",
    accent: "emerald",
    memory: "Track founding seat (€299/Jahr), compute tokens, wallet balances. No tax advice.",
  },
  {
    name: "Quant",
    role: "Trading Desk",
    avatar: "▲",
    accent: "gold",
    memory:
      "Optional trading desk for founder. Risk-first. Paper until armed. Prefer WETH/USDC on Base.",
  },
  {
    name: "Yield",
    role: "Yield & Liquidity",
    avatar: "◈",
    accent: "emerald",
    memory: "Yield desk for seat liquidity path. Paper until armed. Never invent on-chain fills.",
  },
];

async function ensureAgent(a) {
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
        avatar: a.avatar,
        accent: a.accent,
        current_task: "Full OS desk — ready",
      })
      .eq("id", exists.id);
    return exists.id;
  }
  const { data: created, error } = await admin
    .from("agents")
    .insert({
      company_id: COMPANY_ID,
      name: a.name,
      role: a.role,
      avatar: a.avatar,
      accent: a.accent,
      status: "active",
      current_task: "Full OS desk — ready",
      health: 100,
      performance: 0,
      activity: 0,
      revenue_generated: 0,
      credits_used: 0,
      tasks_completed: 0,
      lessons_count: 0,
      memory: a.memory,
    })
    .select("id")
    .single();
  if (error) throw error;
  await admin.from("activity_events").insert({
    company_id: COMPANY_ID,
    agent_id: created.id,
    kind: "hire",
    message: `${a.name} joined as ${a.role}`,
  });
  return created.id;
}

async function ensureProduct(row) {
  const { data: exists } = await admin
    .from("products")
    .select("id")
    .eq("company_id", COMPANY_ID)
    .eq("name", row.name)
    .maybeSingle();
  if (exists?.id) return exists.id;
  const { data, error } = await admin
    .from("products")
    .insert({ company_id: COMPANY_ID, revenue: 0, conversion: 0, subscriptions: 0, ...row })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  // Company flags for full OS
  await admin
    .from("companies")
    .update({
      name: "Sonja Immobilien",
      tagline: "Immobilien Wien — OS Console · Leads · Social Automation",
      strategy:
        "Full Aura OS Founding Seat (€299/Jahr Bar → Liquidity). Primary: qualified Wien leads + X/Facebook automation (Orin/Vela drafts, Sonja approves). Also: Grow/Quest, Wallet, Missions, CEO Atlas. No Google review campaigns.",
      desk_network: "base",
      agent_slot_bonus: 12,
      is_local_business: false,
      network_backlink: false,
      google_review_url: null,
      niche: "Real estate",
      city: "Wien",
      ui_locale: "de",
      owner_display_name: "Sonja",
      public_email: EMAIL,
      autonomy: 1,
      trading_paper: true,
      trading_armed: false,
      yield_paper: true,
      yield_armed: false,
    })
    .eq("id", COMPANY_ID);

  const agentIds = {};
  for (const a of AGENTS) {
    agentIds[a.name] = await ensureAgent(a);
  }

  await ensureProduct({
    name: "Content Studio",
    description:
      "Brand voice + daily drafts for X and Facebook — publish on approval after channels connect.",
    price: 29,
    emoji: "❖",
    inventory: 0,
  });
  await ensureProduct({
    name: "Acquisition mandate",
    description: "Buyer/seller/investor mandate supported by Aura lead research (Wien).",
    price: 0,
    emoji: "◎",
    inventory: 0,
  });
  await ensureProduct({
    name: "Quant + Yield Desk",
    description: "Optional Base desk with hard USDC caps — paper until Sonja arms it.",
    price: 0,
    emoji: "▲",
    inventory: 0,
  });

  // Identity handle → unlocks /wallet provision UI
  const { data: handleRow } = await admin
    .from("handles")
    .select("id")
    .eq("user_id", USER_ID)
    .maybeSingle();
  let handleId = handleRow?.id;
  if (!handleId) {
    const { data: created, error } = await admin
      .from("handles")
      .insert({
        user_id: USER_ID,
        company_id: COMPANY_ID,
        handle: "sonjaimmo",
        display_name: "Sonja",
        bio: "Immobilien Wien · Aura OS Founding Seat",
        avatar: "◎",
        is_public: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    handleId = created.id;
  } else {
    await admin
      .from("handles")
      .update({
        company_id: COMPANY_ID,
        display_name: "Sonja",
        bio: "Immobilien Wien · Aura OS Founding Seat",
      })
      .eq("id", handleId);
  }

  // Grow / Quest progress
  const { data: seatsTaken } = await admin.rpc("founding_seats_taken");
  const seatNumber = typeof seatsTaken === "number" ? Math.max(1, seatsTaken) : 1;
  await admin.from("founder_progress").upsert(
    {
      company_id: COMPANY_ID,
      xp: 250,
      level: 1,
      streak_days: 1,
      seat_number: seatNumber,
      last_active: new Date().toISOString(),
      onboarded: true,
      completed_quests: [
        "founding_seat",
        "leads_ready",
        "social_focus",
        "wallet_ready",
        "full_os_desk",
      ],
    },
    { onConflict: "company_id" },
  );

  await admin
    .from("profiles")
    .update({
      full_name: "Sonja",
      founder_goal: "Full OS · Leads + X/Facebook automation · Grow · Wallet",
      growth_xp: 120,
      growth_quests: ["signup", "founding_seat", "channels_connect", "first_lead"],
    })
    .eq("id", USER_ID);

  // Compute headroom for social + missions
  await admin
    .from("subscriptions")
    .update({
      plan: "founding_seat",
      status: "active",
      payment_mode: "cash_eur_year",
      tokens_remaining: 75_000,
      tokens_per_cycle: 75_000,
    })
    .eq("company_id", COMPANY_ID);

  // Akquise keep real_estate
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
        template: "real_estate",
        language: "de",
        status: "draft",
        target_count: 15,
        goal: "15 qualifizierte Immobilien-Leads (Wien) + Social-Funnel",
      })
      .eq("id", akq.id);
  }

  // First revenue mission (planned — full console Missions surface)
  const { data: existingMission } = await admin
    .from("revenue_missions")
    .select("id")
    .eq("company_id", COMPANY_ID)
    .limit(1)
    .maybeSingle();
  if (!existingMission?.id) {
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("revenue_missions").insert({
      company_id: COMPANY_ID,
      mission_number: 1,
      goal_text:
        "Hol 12 qualifizierte Immobilien-Leads in Wien und starte X + Facebook Automation (Content Studio) — ohne Google-Reviews.",
      target_usdc: 1200,
      deadline_at: deadline,
      budget_usdc: 50,
      industry: "Real estate",
      location: "Wien",
      risk: "medium",
      status: "planned",
      plan: {
        offer: "Immobilien-Mandat Wien",
        summary:
          "Leads via Akquise + Social automation on X/Facebook. Atlas orchestrates; Sonja approves every public send.",
        steps: [
          {
            day: 1,
            kind: "task",
            agent: "Atlas",
            order: 1,
            title: "Confirm OS priorities",
            detail: "Leads primary; connect X + Facebook; wallet provision.",
          },
          {
            day: 2,
            kind: "task",
            agent: "Orin",
            order: 2,
            title: "Draft first social week",
            detail: "3 X + 3 Facebook drafts for approval.",
          },
          {
            day: 3,
            kind: "prospect",
            agent: "Vela",
            order: 3,
            title: "Start Real Estate Akquise",
            detail: "Open /akquise real_estate — 15 Wien prospects.",
          },
          {
            day: 7,
            kind: "analyze",
            agent: "Atlas",
            order: 4,
            title: "Week-1 review",
            detail: "Leads quality + post approvals.",
          },
        ],
        timeline_days: 30,
        price_usdc: 0,
        capital_usdc: 50,
        feasibility: "possible",
        customers_needed: 12,
      },
      projected: {
        label: "projected",
        cost_aura: 80,
        cost_usdc: 50,
        revenue_usdc: 1200,
        profit_usdc: 1150,
      },
      agents_status: {
        Atlas: "waiting_approval",
        Vela: "waiting",
        Orin: "waiting",
        Juno: "waiting",
        Ledger: "waiting",
      },
      next_best_action: {
        kind: "task",
        title: "Connect X + Facebook on /channels",
        detail: "OAuth both channels, then approve Orin drafts. Wallet: /wallet → Provision.",
        status: "pending_approval",
        assignee: "Atlas",
        confidence: 0.9,
      },
      share_slug: `sonja${Date.now().toString(36).slice(-6)}`,
      share_public: false,
      akquise_campaign_id: akq?.id ?? null,
    });
  }

  // CEO + social starter tasks (Approvals / Console)
  const { count: taskCount } = await admin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("company_id", COMPANY_ID);

  if (!taskCount) {
    const tasks = [
      {
        agent: "Atlas",
        title: "Welcome brief — Full OS for Sonja",
        description:
          "Confirm priorities: (1) Leads via /akquise (2) Connect X + Facebook on /channels (3) Provision wallet on /wallet (4) Grow on /quest. No Google reviews.",
      },
      {
        agent: "Orin",
        title: "Draft brand voice + first X & Facebook posts",
        description:
          "Write 3 X posts (≤280) and 3 Facebook posts for Sonja Immobilien Wien. Status pending_approval. Do not invent engagement metrics. No Google review CTAs.",
      },
      {
        agent: "Vela",
        title: "Social automation calendar (14 days)",
        description:
          "Propose a 14-day X + Facebook drip: listings, market tips, trust. Queue for approval after channels connect.",
      },
      {
        agent: "Vela",
        title: "Kick off Real Estate lead research",
        description:
          "Prepare /akquise real_estate run for 15 Wien Eigentümer/Investoren. Real sources only.",
      },
      {
        agent: "Cass",
        title: "Channel + wallet readiness checklist",
        description:
          "Document: /channels connect X & Facebook; /wallet provision Light Account on Base; /quest daily grow. No fake live links.",
      },
    ];
    for (const t of tasks) {
      await admin.from("tasks").insert({
        company_id: COMPANY_ID,
        agent_id: agentIds[t.agent],
        title: t.title,
        description: t.description,
        status: "pending_approval",
        priority: "high",
        roi: 0,
        progress: 0,
      });
    }
  }

  // Draft social posts ready once she connects (queued for approval flow)
  const { count: postCount } = await admin
    .from("channel_posts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", COMPANY_ID);
  if (!postCount) {
    const drafts = [
      {
        provider: "x",
        agent_name: "Orin",
        body: "Wien sucht klare Makler-Kommunikation — nicht mehr Lärm. Sonja Immobilien: ehrliche Beratung, echte Objekte. DM für Erstgespräch.",
      },
      {
        provider: "x",
        agent_name: "Orin",
        body: "3 Fragen vor dem Verkauf in Wien: Timing, Unterlagen, Zielpreis. Kurz-Check mit Sonja — ohne Druck.",
      },
      {
        provider: "facebook",
        agent_name: "Orin",
        body: "Neu bei Sonja Immobilien (Wien): wir kombinieren persönliche Beratung mit smarter Sichtbarkeit auf Social. Interesse an Kauf/Verkauf? Schreib uns.",
      },
      {
        provider: "facebook",
        agent_name: "Vela",
        body: "Markttipp Wien: gute Fotos + klare Exposé-Texte verkaufen schneller als Rabatte. Wir helfen beides — und finden passende Käufer/Investoren.",
      },
    ];
    for (const [i, d] of drafts.entries()) {
      const { error: postErr } = await admin.from("channel_posts").insert({
        company_id: COMPANY_ID,
        provider: d.provider,
        body: d.body,
        status: "pending_approval",
        agent_name: d.agent_name,
        impressions: 0,
        likes: 0,
        reposts: 0,
        campaign_key: `sonja_${d.provider}_${i + 1}`,
      });
      if (postErr) console.warn("channel_posts", postErr.message);
    }
  }

  // Knowledge for full OS
  await admin.from("knowledge_items").delete().eq("company_id", COMPANY_ID);
  await admin.from("knowledge_items").insert([
    {
      company_id: COMPANY_ID,
      title: "Sonja · Full OS Console",
      summary: [
        "Gleiche Console wie Founding OS: /console · /approvals · /missions · /wallet · /channels · /quest · /akquise",
        "CEO Atlas steuert. Orin/Vela = Social (X + Facebook). Vela/Juno = Leads.",
        "Connect X + Facebook unter /channels (OAuth) — dann Automation freigeben.",
        "Wallet: /wallet → Provision Light Account (Base).",
        "Grow: /quest täglich. Community optional: /community?join=BETAVN",
        "Keine Google-Bewertungen.",
      ].join("\n"),
      cluster: "Company",
      source: "Onboarding",
    },
    {
      company_id: COMPANY_ID,
      title: "Landing page",
      summary: [
        "Brand: Sonja Immobilien",
        "Product: Content Studio + Acquisition mandate",
        "Hero: Immobilien Wien — Leads & Social Automation",
        "CTA: Erstgespräch anfragen",
        "Status: Draft — Iris refines after first Website task.",
      ].join("\n"),
      cluster: "Website",
      source: "Onboarding",
    },
    {
      company_id: COMPANY_ID,
      title: "Social · X + Facebook",
      summary:
        "Connect both on /channels. Approve pending_approval drafts. Auto-publish only after Sonja trusts Orin.",
      cluster: "Growth",
      source: "Onboarding",
    },
    {
      company_id: COMPANY_ID,
      title: "Leads · Real Estate",
      summary: "Open /akquise?autostart=1 — template real_estate. Real sources only.",
      cluster: "Sales",
      source: "Onboarding",
    },
    {
      company_id: COMPANY_ID,
      title: "Wallet · Base",
      summary: "Handle sonjaimmo claimed. Open /wallet and provision the smart wallet.",
      cluster: "Treasury",
      source: "Onboarding",
    },
  ]);

  await admin.from("activity_events").insert({
    company_id: COMPANY_ID,
    kind: "system",
    message:
      "Full OS desk ready: CEO, Grow, Wallet handle, Content Studio, X/Facebook drafts, Leads mission. Connect channels + provision wallet.",
  });

  // Beta squad (service role may need direct insert — join RPC needs auth.uid)
  const { data: squad } = await admin
    .from("aura_squads")
    .select("id")
    .eq("invite_code", "BETAVN")
    .maybeSingle();
  if (squad?.id) {
    const { data: mem } = await admin
      .from("aura_squad_members")
      .select("id")
      .eq("squad_id", squad.id)
      .eq("user_id", USER_ID)
      .maybeSingle();
    if (!mem?.id) {
      await admin.from("aura_squad_members").insert({
        squad_id: squad.id,
        user_id: USER_ID,
        role: "member",
      });
    }
  }

  const { data: agents } = await admin
    .from("agents")
    .select("name")
    .eq("company_id", COMPANY_ID)
    .order("name");
  const { data: products } = await admin
    .from("products")
    .select("name")
    .eq("company_id", COMPANY_ID);
  const { count: tasks } = await admin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("company_id", COMPANY_ID);
  const { count: posts } = await admin
    .from("channel_posts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", COMPANY_ID);

  console.log(
    JSON.stringify(
      {
        ok: true,
        handleId,
        handle: "sonjaimmo",
        agents: (agents || []).map((a) => a.name),
        products: (products || []).map((p) => p.name),
        tasks,
        socialDrafts: posts,
        urls: {
          console: "https://aibusiness.fun/console",
          wallet: "https://aibusiness.fun/wallet",
          channels: "https://aibusiness.fun/channels",
          quest: "https://aibusiness.fun/quest",
          missions: "https://aibusiness.fun/missions",
          akquise: "https://aibusiness.fun/akquise?autostart=1",
          community: "https://aibusiness.fun/community?join=BETAVN",
        },
        nextForSonja: [
          "Hard refresh / re-login → /console",
          "Connect X + Facebook on /channels",
          "Provision wallet on /wallet",
          "Approve CEO + social tasks on /approvals",
          "Grow daily on /quest",
        ],
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
