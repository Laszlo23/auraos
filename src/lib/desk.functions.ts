import { createServerFn } from "@tanstack/react-start";
import { timingSafeEqual } from "node:crypto";
import { createHmac } from "node:crypto";
import { getRequest, getResponseHeaders } from "@tanstack/react-start/server";

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

const COOKIE_NAME = "aura_desk";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function getSecret(): string {
  const secret = process.env["TEAM_DESK_SECRET"];
  if (secret && secret.trim()) return secret.trim();
  const pwd = process.env["TEAM_DESK_PASSWORD"];
  if (pwd && pwd.trim()) {
    const hash = createHmac("sha256", "aura-desk-fallback-salt");
    hash.update(pwd.trim());
    return hash.digest("hex");
  }
  throw new Error("TEAM_DESK_SECRET or TEAM_DESK_PASSWORD not configured");
}

function signCookie(displayName: string): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${displayName}:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

function verifyCookie(value: string): { displayName: string; exp: number } | null {
  try {
    const parts = value.split(":");
    if (parts.length !== 3) return null;
    const [displayName, expStr, sig] = parts as [string, string, string];
    const exp = Number(expStr);
    if (isNaN(exp) || exp < Date.now() / 1000) return null;

    const secret = getSecret();
    const expectedSig = createHmac("sha256", secret)
      .update(`${displayName}:${expStr}`)
      .digest("hex");

    if (
      !sig ||
      !expectedSig ||
      Buffer.byteLength(sig) !== Buffer.byteLength(expectedSig) ||
      !timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))
    ) {
      return null;
    }

    return { displayName, exp };
  } catch {
    return null;
  }
}

function getCookieFromRequest(): string | null {
  try {
    const request = getRequest();
    const cookies = request?.headers.get("cookie");
    if (!cookies) return null;
    const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function requireDeskAuth(): { displayName: string } {
  const cookieValue = getCookieFromRequest();
  if (!cookieValue) {
    throw new Error("Team Desk: Unauthorized");
  }
  const verified = verifyCookie(cookieValue);
  if (!verified) {
    throw new Error("Team Desk: Session expired or invalid");
  }
  return { displayName: verified.displayName };
}

async function getSupabaseAdmin(): Promise<LooseDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return asDb(supabaseAdmin);
}

export const deskLogin = createServerFn({ method: "POST" })
  .validator((input: { password: string; displayName?: string }) => ({
    password: String(input.password || "").trim(),
    displayName: String(input.displayName || "")
      .trim()
      .slice(0, 50),
  }))
  .handler(async ({ data }) => {
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
    const cookieValue = signCookie(displayName);

    const headers = getResponseHeaders();
    headers.set(
      "Set-Cookie",
      `${COOKIE_NAME}=${encodeURIComponent(cookieValue)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`,
    );

    return { ok: true, displayName };
  });

export const deskLogout = createServerFn({ method: "POST" }).handler(async () => {
  const headers = getResponseHeaders();
  headers.set("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
  return { ok: true };
});

export const getDeskDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const auth = requireDeskAuth();
  const db = await getSupabaseAdmin();

  const { data: allSales, error: salesError } = await db
    .from("team_desk_sales")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (salesError) throw salesError;

  const sales = (allSales || []) as Array<{
    id: string;
    closer: string;
    product: string;
    amount_cents: number;
    currency: string;
    customer_name: string;
    notes: string | null;
    created_at: string;
  }>;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const mySales = sales.filter((s) => s.closer === auth.displayName);
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
    foundingRevenue: (foundingSeats || 0) * 9900,
    localRevenue: (localPaidSeats || 0) * 4900,
  };

  return {
    displayName: auth.displayName,
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
  };
});

export const logDeskSale = createServerFn({ method: "POST" })
  .validator(
    (input: {
      product: string;
      amountCents: number;
      currency?: string;
      customerName: string;
      notes?: string;
    }) => ({
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
    const auth = requireDeskAuth();
    if (!data.customerName) throw new Error("Customer name required");

    const db = await getSupabaseAdmin();
    const { error } = await db.from("team_desk_sales").insert({
      closer: auth.displayName,
      product: data.product,
      amount_cents: data.amountCents,
      currency: data.currency,
      customer_name: data.customerName,
      notes: data.notes,
    });

    if (error) throw error;

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
    const auth = requireDeskAuth();
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
      await db.from("team_desk_sales").insert({
        closer: auth.displayName,
        product: "local_paid_seat",
        amount_cents: data.amountCents,
        currency: "EUR",
        customer_name: comp.name,
        notes: data.notes,
      });
    }

    return { ok: true, company: comp };
  });
