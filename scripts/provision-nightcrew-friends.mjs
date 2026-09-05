/**
 * Shared friends / close-crew demo account — full OS console + founding seat.
 * Idempotent: re-run updates password and refreshes roster.
 *
 *   node --env-file=.env scripts/provision-nightcrew-friends.mjs
 */
import { createClient } from "@supabase/supabase-js";

const EMAIL = "nightcrew@aibusiness.fun";
const HANDLE = "nightcrew";
const FULL_NAME = "Night Crew";
const COMPANY_NAME = "Night Crew";
const SLUG = "night-crew";
const AMOUNT_CENTS = 29_900;
const SITE = process.env.SITE_URL?.trim() || "https://aibusiness.fun";
/** Memorable shared password for close friends — rotate after the wave if needed. */
const PASSWORD = `NightCrew-Aura26!gold`;

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
      "CEO for Night Crew demo. Orchestrate missions, approvals, and proof. Keep language plain — time and money saved, not jargon.",
  },
  {
    name: "Vela",
    role: "Growth & Marketing",
    avatar: "✧",
    accent: "rose",
    memory: "Growth drafts and campaigns. Publish only after founder approval.",
  },
  {
    name: "Orin",
    role: "Social Voice",
    avatar: "◈",
    accent: "teal",
    memory: "Social drafts for X and friends. Draft/queue until approved.",
  },
  {
    name: "Iris",
    role: "Product & Storefront",
    avatar: "◆",
    accent: "violet",
    memory: "Product and landing drafts for the demo company.",
  },
  {
    name: "Juno",
    role: "Customer Success",
    avatar: "◉",
    accent: "amber",
    memory: "Follow-up and guest care. Never invent conversations.",
  },
  {
    name: "Cass",
    role: "Engineering",
    avatar: "⬡",
    accent: "slate",
    memory: "Automations and channel health. No fake live URLs.",
  },
  {
    name: "Ledger",
    role: "Finance",
    avatar: "▣",
    accent: "emerald",
    memory: "Track spend and compute. No tax advice.",
  },
  {
    name: "Quant",
    role: "Trading Desk",
    avatar: "▲",
    accent: "gold",
    memory: "Optional desk. Paper until armed. Prefer WETH/USDC on Base.",
  },
  {
    name: "Yield",
    role: "Yield & Liquidity",
    avatar: "◈",
    accent: "emerald",
    memory: "Yield desk. Paper until armed. Never invent on-chain fills.",
  },
];

async function findUserByEmail(email) {
  const needle = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data?.users?.find((u) => u.email?.toLowerCase() === needle);
    if (hit) return hit;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function ensureAgent(companyId, a) {
  const { data: exists } = await admin
    .from("agents")
    .select("id")
    .eq("company_id", companyId)
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
        current_task: "Full OS desk — ready for friends",
      })
      .eq("id", exists.id);
    return exists.id;
  }
  const { data: created, error } = await admin
    .from("agents")
    .insert({
      company_id: companyId,
      name: a.name,
      role: a.role,
      avatar: a.avatar,
      accent: a.accent,
      status: "active",
      current_task: "Full OS desk — ready for friends",
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
  return created.id;
}

async function main() {
  let user = await findUserByEmail(EMAIL);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME, handle: HANDLE },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata || {}), full_name: FULL_NAME, handle: HANDLE },
    });
    if (error) throw error;
  }

  const userId = user.id;
  const sessionKey = `friends_nightcrew_${userId.slice(0, 8)}`;

  const { data: seatGrant, error: seatErr } = await admin.rpc("grant_founding_seat", {
    _user_id: userId,
    _stripe_session_id: sessionKey,
    _invite_code: null,
    _amount_cents: AMOUNT_CENTS,
    _payment_intent: "friends_demo_complimentary",
  });
  if (seatErr) throw seatErr;

  let { data: company } = await admin
    .from("companies")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!company) {
    const { data: seatsTaken } = await admin.rpc("founding_seats_taken");
    const seatNumber = typeof seatsTaken === "number" ? Math.max(1, seatsTaken) : 1;
    const { data: created, error: coErr } = await admin
      .from("companies")
      .insert({
        owner_id: userId,
        name: COMPANY_NAME,
        slug: SLUG,
        tagline: "Close friends demo — full Aura OS console",
        emoji: "◎",
        credits: 0,
        runway_days: 30,
        mrr: 0,
        strategy:
          "Shared Night Crew demo for close friends. Explore console, missions, approvals, proof, community, quest. Plain language. Paper trading until armed.",
        autonomy: 1,
        entry_funnel: "os",
        ui_locale: "en",
        os_preset: "full",
        is_local_business: false,
        network_backlink: false,
        niche: "Demo / friends",
        city: "Wien",
        owner_display_name: FULL_NAME,
        public_email: EMAIL,
        public_story: "Night Crew — friends trying the full Aura OS desk together.",
        trading_paper: true,
        trading_armed: false,
        yield_paper: true,
        yield_armed: false,
        agent_slot_bonus: 12,
        desk_network: "base",
      })
      .select()
      .single();
    if (coErr) throw coErr;
    company = created;

    await admin.from("founder_progress").insert({
      company_id: company.id,
      xp: 250,
      level: 1,
      streak_days: 1,
      seat_number: seatNumber,
      last_active: new Date().toISOString(),
      onboarded: true,
      completed_quests: ["founding_seat", "friends_demo", "full_os_desk"],
    });

    await admin.from("activity_events").insert({
      company_id: company.id,
      kind: "system",
      message: "Night Crew friends demo unlocked. Full console is open — try a mission.",
    });
  } else {
    const { error: upErr } = await admin
      .from("companies")
      .update({
        name: COMPANY_NAME,
        slug: SLUG,
        tagline: "Close friends demo — full Aura OS console",
        strategy:
          "Shared Night Crew demo for close friends. Explore console, missions, approvals, proof, community, quest. Plain language. Paper trading until armed.",
        entry_funnel: "os",
        ui_locale: "en",
        os_preset: "full",
        is_local_business: false,
        network_backlink: false,
        niche: "Demo / friends",
        city: "Wien",
        owner_display_name: FULL_NAME,
        public_email: EMAIL,
        public_story: "Night Crew — friends trying the full Aura OS desk together.",
        trading_paper: true,
        trading_armed: false,
        yield_paper: true,
        yield_armed: false,
        agent_slot_bonus: 12,
        autonomy: 1,
        desk_network: "base",
      })
      .eq("id", company.id);
    if (upErr) {
      // entry_funnel may be immutable — keep going if only that failed after other fields
      if (!/entry_funnel/i.test(upErr.message)) throw upErr;
    }

    await admin.from("founder_progress").upsert(
      {
        company_id: company.id,
        xp: 250,
        level: 1,
        streak_days: 1,
        last_active: new Date().toISOString(),
        onboarded: true,
        completed_quests: ["founding_seat", "friends_demo", "full_os_desk"],
      },
      { onConflict: "company_id" },
    );
  }

  const companyId = company.id;

  for (const a of AGENTS) {
    await ensureAgent(companyId, a);
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, tokens_remaining")
    .eq("company_id", companyId)
    .maybeSingle();
  if (sub?.id) {
    await admin
      .from("subscriptions")
      .update({
        plan: "founding_seat",
        status: "active",
        payment_mode: "friends_demo",
        tokens_remaining: Math.max(Number(sub.tokens_remaining) || 0, 50_000),
        tokens_per_cycle: 50_000,
      })
      .eq("id", sub.id);
  } else {
    await admin.from("subscriptions").insert({
      company_id: companyId,
      plan: "founding_seat",
      status: "active",
      payment_mode: "friends_demo",
      tokens_remaining: 50_000,
      tokens_per_cycle: 50_000,
    });
  }

  await admin.from("profiles").upsert({
    id: userId,
    email: EMAIL,
    full_name: FULL_NAME,
    founder_goal: "Friends demo — explore full Aura OS",
    growth_xp: 120,
    growth_quests: ["signup", "founding_seat", "friends_demo"],
  });

  const { data: handleRow } = await admin
    .from("handles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!handleRow?.id) {
    const { error: hErr } = await admin.from("handles").insert({
      user_id: userId,
      company_id: companyId,
      handle: HANDLE,
      display_name: FULL_NAME,
      bio: "Close friends demo · full Aura OS",
      avatar: "◎",
      is_public: true,
    });
    if (hErr && !/duplicate|unique/i.test(hErr.message)) throw hErr;
  } else {
    await admin
      .from("handles")
      .update({
        company_id: companyId,
        handle: HANDLE,
        display_name: FULL_NAME,
        bio: "Close friends demo · full Aura OS",
        is_public: true,
      })
      .eq("id", handleRow.id);
  }

  // Quest / user_progress if table exists
  try {
    await admin.from("user_progress").upsert(
      {
        user_id: userId,
        xp: 200,
        level: 2,
        rep: 50,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  } catch {
    /* optional */
  }

  // Join Aura Beta squad if present
  const { data: squad } = await admin
    .from("aura_squads")
    .select("id, invite_code")
    .eq("invite_code", "BETAVN")
    .maybeSingle();
  if (squad?.id) {
    await admin.from("aura_squad_members").upsert(
      {
        squad_id: squad.id,
        user_id: userId,
        role: "member",
        joined_at: new Date().toISOString(),
      },
      { onConflict: "squad_id,user_id" },
    );
  }

  const { data: seat } = await admin
    .from("founding_seats")
    .select("outbound_invite_code, paid_at, amount_cents")
    .eq("user_id", userId)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: EMAIL,
        password: PASSWORD,
        username: `@${HANDLE}`,
        displayName: FULL_NAME,
        userId,
        companyId,
        seatGrant,
        outboundInvite: seat?.outbound_invite_code ?? null,
        login: `${SITE}/auth`,
        console: `${SITE}/console`,
        community: `${SITE}/community?join=BETAVN`,
        note: "Shared friends demo — rotate password after the wave if it leaks.",
        tip: "Sign in with email + password. Skip onboarding if already onboarded; open /console.",
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
