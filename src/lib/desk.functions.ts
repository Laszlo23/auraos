import { createServerFn } from "@tanstack/react-start";

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

async function deskAuth() {
  return import("@/lib/desk-auth.server");
}

async function getSupabaseAdmin(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return asDb(supabaseAdmin);
}

async function buildDashboard(displayName: string) {
  const db = await getSupabaseAdmin();

  const { data: allSales, error: salesError } = await db
    .from("team_desk_sales")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const sales =
    !salesError && allSales
      ? (allSales as Array<{
          id: string;
          closer: string;
          product: string;
          amount_cents: number;
          currency: string;
          customer_name: string;
          notes: string | null;
          created_at: string;
        }>)
      : [];

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const mySales = sales.filter((s) => s.closer === displayName);
  const myWeek = mySales.filter((s) => new Date(s.created_at) > weekAgo);
  const myMonth = mySales.filter((s) => new Date(s.created_at) > monthAgo);

  const teamWeek = sales.filter((s) => new Date(s.created_at) > weekAgo);
  const teamMonth = sales.filter((s) => new Date(s.created_at) > monthAgo);

  const leaderboard = Object.entries(
    sales
      .filter((s) => new Date(s.created_at) > monthAgo)
      .reduce(
        (acc, s) => {
          if (!acc[s.closer]) acc[s.closer] = { closes: 0, totalCents: 0 };
          acc[s.closer].closes++;
          acc[s.closer].totalCents += s.amount_cents;
          return acc;
        },
        {} as Record<string, { closes: number; totalCents: number }>,
      ),
  )
    .map(([closer, stats]) => ({ closer, ...stats }))
    .sort((a, b) => b.totalCents - a.totalCents);

  const { count: foundingSeats } = await db
    .from("companies")
    .select("id", { count: "exact", head: true })
    .eq("entry_funnel", "founding");

  const { count: localPaidSeats } = await db
    .from("companies")
    .select("id", { count: "exact", head: true })
    .not("local_seat_paid_at", "is", null);

  const finance = {
    foundingSeats: foundingSeats || 0,
    localPaidSeats: localPaidSeats || 0,
    // cents — match UI/SSOT ($299 founding, €99 local)
    foundingRevenue: (foundingSeats || 0) * 29_900,
    localRevenue: (localPaidSeats || 0) * 9_900,
  };

  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: appRows } = await db
    .from("app_events")
    .select("event")
    .gte("created_at", weekAgoIso);

  const eventCounts: Record<string, number> = {};
  for (const row of (appRows as { event?: string }[] | null) ?? []) {
    const ek = row.event ?? "";
    if (!ek) continue;
    eventCounts[ek] = (eventCounts[ek] ?? 0) + 1;
  }

  const { FOUNDING_SEAT_USD_CENTS, LOCAL_SEAT_USD_CENTS_APPROX } = await import("@/lib/beta-pulse");
  const seatCashUsdCents =
    (foundingSeats || 0) * FOUNDING_SEAT_USD_CENTS +
    (localPaidSeats || 0) * LOCAL_SEAT_USD_CENTS_APPROX;

  const betaPulse = {
    signups7d: eventCounts["signup_complete"] ?? 0,
    onboardComplete7d: eventCounts["onboarding_complete"] ?? 0,
    firstMission7d: eventCounts["first_mission"] ?? 0,
    firstProof7d: eventCounts["first_proof"] ?? 0,
    squadJoin7d: eventCounts["squad_join"] ?? 0,
    scoutJoin7d: eventCounts["scout_join"] ?? 0,
    growthTaskDone7d: eventCounts["growth_task_done"] ?? 0,
    foundingSeatsTotal: foundingSeats || 0,
    localSeatsPaid: localPaidSeats || 0,
    seatCashUsdCents,
    asOf: new Date().toISOString(),
  };

  return {
    displayName,
    mySales: {
      week: myWeek.length,
      month: myMonth.length,
      weekAmount: myWeek.reduce((sum, s) => sum + s.amount_cents, 0),
      monthAmount: myMonth.reduce((sum, s) => sum + s.amount_cents, 0),
    },
    teamSales: {
      week: teamWeek.length,
      month: teamMonth.length,
      weekAmount: teamWeek.reduce((sum, s) => sum + s.amount_cents, 0),
      monthAmount: teamMonth.reduce((sum, s) => sum + s.amount_cents, 0),
    },
    leaderboard,
    recentSales: sales.slice(0, 20),
    finance,
    betaPulse,
    migrationWarning: salesError
      ? "Team Desk migration not applied — sales features disabled until `supabase db push`."
      : null,
  };
}

export const deskLogin = createServerFn({ method: "POST" })
  .validator((input: { password: string; displayName?: string }) => ({
    password: String(input.password || "").trim(),
    displayName: String(input.displayName || "")
      .trim()
      .slice(0, 50),
  }))
  .handler(async ({ data }) => {
    const { timingSafeEqual } = await import("node:crypto");
    const { signDeskToken, setDeskAuthCookie } = await deskAuth();
    const envPwd = process.env["TEAM_DESK_PASSWORD"];
    const envHash = process.env["TEAM_DESK_PASSWORD_HASH"];

    if (!envPwd && !envHash) {
      throw new Error("Team Desk password not configured");
    }

    let valid = false;

    if (envPwd && envPwd.trim()) {
      const expected = envPwd.trim();
      const provided = data.password;
      if (expected && provided && Buffer.byteLength(expected) === Buffer.byteLength(provided)) {
        valid = timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(provided, "utf8"));
      }
    }

    if (!valid && envHash && envHash.trim()) {
      const bcrypt = await import("bcrypt");
      valid = await bcrypt.compare(data.password, envHash.trim());
    }

    if (!valid) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      throw new Error("Falsches Passwort");
    }

    const displayName = data.displayName || "Team";
    const token = signDeskToken(displayName);
    setDeskAuthCookie(token);

    const dashboard = await buildDashboard(displayName);

    return { ok: true, token, dashboard };
  });

export const deskLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { clearDeskAuthCookie } = await deskAuth();
  clearDeskAuthCookie();
  return { ok: true };
});

export const getDeskDashboard = createServerFn({ method: "GET" })
  .validator((input: { token?: string }) => ({
    token:
      String(input?.token || "")
        .trim()
        .slice(0, 500) || null,
  }))
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    const auth = requireDeskAuth(data.token);
    return buildDashboard(auth.displayName);
  });

export const logDeskSale = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token?: string;
      product: string;
      amountCents: number;
      currency?: string;
      customerName: string;
      notes?: string;
    }) => ({
      token:
        String(input?.token || "")
          .trim()
          .slice(0, 500) || null,
      product: String(input.product || "other"),
      amountCents: Math.max(0, Number(input.amountCents) || 0),
      currency: String(input.currency || "EUR")
        .toUpperCase()
        .slice(0, 3),
      customerName: String(input.customerName || "")
        .trim()
        .slice(0, 200),
      notes:
        String(input.notes || "")
          .trim()
          .slice(0, 1000) || null,
    }),
  )
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    const auth = requireDeskAuth(data.token);
    if (!data.customerName) throw new Error("Customer name required");

    const db = await getSupabaseAdmin();
    const { error: insertError } = await db.from("team_desk_sales").insert({
      closer: auth.displayName,
      product: data.product,
      amount_cents: data.amountCents,
      currency: data.currency,
      customer_name: data.customerName,
      notes: data.notes,
    });

    if (insertError) {
      if (
        insertError.message?.includes("does not exist") ||
        insertError.message?.includes("relation")
      ) {
        throw new Error(
          "Team Desk migration not applied. Run `supabase db push` to enable sales logging.",
        );
      }
      throw insertError;
    }

    await db.from("team_desk_events").insert({
      closer: auth.displayName,
      kind: "sale_logged",
      message: `${auth.displayName} logged ${data.product} · ${data.customerName} · ${(data.amountCents / 100).toFixed(2)} ${data.currency}`,
    });

    return { ok: true };
  });

export const createDeskLocalBusiness = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token?: string;
      name: string;
      slug?: string;
      address?: string;
      bezirk?: string;
      category?: string;
      website?: string;
      instagram?: string;
      google?: string;
      phone?: string;
      notes?: string;
      paidSeat?: boolean;
      amountCents?: number;
    }) => ({
      token:
        String(input?.token || "")
          .trim()
          .slice(0, 500) || null,
      name: String(input.name || "")
        .trim()
        .slice(0, 200),
      slug:
        String(input.slug || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 100) || null,
      address:
        String(input.address || "")
          .trim()
          .slice(0, 300) || null,
      bezirk:
        String(input.bezirk || "")
          .trim()
          .slice(0, 100) || null,
      category:
        String(input.category || "")
          .trim()
          .slice(0, 100) || null,
      website:
        String(input.website || "")
          .trim()
          .slice(0, 500) || null,
      instagram:
        String(input.instagram || "")
          .trim()
          .slice(0, 200) || null,
      google:
        String(input.google || "")
          .trim()
          .slice(0, 500) || null,
      phone:
        String(input.phone || "")
          .trim()
          .slice(0, 50) || null,
      notes:
        String(input.notes || "")
          .trim()
          .slice(0, 1000) || null,
      paidSeat: Boolean(input.paidSeat),
      amountCents: Math.max(0, Number(input.amountCents) || 0),
    }),
  )
  .handler(async ({ data }) => {
    const { requireDeskAuth } = await deskAuth();
    const auth = requireDeskAuth(data.token);
    if (!data.name) throw new Error("Business name required");

    const db = await getSupabaseAdmin();

    const insertData: Record<string, unknown> = {
      name: data.name,
      city: "Wien",
      is_local_business: true,
      entry_funnel: "local",
      ui_locale: "de",
      network_backlink: true,
    };

    if (data.slug) insertData.slug = data.slug;
    if (data.category) insertData.niche = data.category;
    if (data.website) insertData.homepage_url = data.website;
    if (data.google) insertData.google_review_url = data.google;
    if (data.address) insertData.street = data.address;
    if (data.bezirk) insertData.district = data.bezirk;
    if (data.phone) insertData.phone = data.phone;

    if (data.paidSeat) {
      insertData.local_seat_paid_at = new Date().toISOString();
    }

    const { data: company, error } = await db
      .from("companies")
      .insert(insertData)
      .select("id, name, slug")
      .single();

    if (error) throw error;

    const comp = company as { id: string; name: string; slug: string | null };

    await db.from("team_desk_events").insert({
      closer: auth.displayName,
      kind: "local_business_created",
      message: `${auth.displayName} created Local business: ${comp.name}`,
      metadata: { company_id: comp.id },
    });

    if (data.paidSeat && data.amountCents > 0) {
      const { error: saleError } = await db.from("team_desk_sales").insert({
        closer: auth.displayName,
        product: "local_paid_seat",
        amount_cents: data.amountCents,
        currency: "EUR",
        customer_name: comp.name,
        notes: data.notes,
      });

      if (
        saleError &&
        (saleError.message?.includes("does not exist") || saleError.message?.includes("relation"))
      ) {
        return {
          ok: true,
          company: comp,
          warning:
            "Business created but sale not logged — Team Desk migration not applied. Run `supabase db push`.",
        };
      }
    }

    return { ok: true, company: comp };
  });
