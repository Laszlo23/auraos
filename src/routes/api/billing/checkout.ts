import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { SITE_URL } from "@/lib/site";

function priceForPlan(plan: string): string | undefined {
  const map: Record<string, string | undefined> = {
    starter: process.env["STRIPE_PRICE_STARTER"],
    company: process.env["STRIPE_PRICE_COMPANY"],
    scale: process.env["STRIPE_PRICE_SCALE"],
    enterprise: process.env["STRIPE_PRICE_SCALE"],
  };
  return map[plan];
}

function accessTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();

  const cookie = request.headers.get("cookie") ?? "";
  const match =
    cookie.match(/(?:^|;\s*)sb-[^=]+-auth-token=([^;]+)/) ??
    cookie.match(/(?:^|;\s*)supabase-auth-token=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    const raw = decodeURIComponent(match[1]);
    const parsed = JSON.parse(raw) as { access_token?: string } | string[];
    if (Array.isArray(parsed)) return parsed[0] ?? null;
    if (parsed && typeof parsed === "object" && parsed.access_token) return parsed.access_token;
  } catch {
    /* ignore malformed cookie */
  }
  return null;
}

export const Route = createFileRoute("/api/billing/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_SECRET_KEY"];
        if (!secret) {
          return Response.json({ error: "Stripe is not configured" }, { status: 503 });
        }

        const token = accessTokenFromRequest(request);
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
        const anon =
          process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        if (!supabaseUrl || !anon) {
          return Response.json({ error: "Supabase is not configured" }, { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, anon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser(token);
        if (userError || !user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          plan?: string;
          company_id?: string;
        };
        const plan = body.plan ?? "company";
        const companyId = body.company_id;
        if (!companyId) {
          return Response.json({ error: "company_id is required" }, { status: 400 });
        }

        const { data: company } = await supabase
          .from("companies")
          .select("id, owner_id")
          .eq("id", companyId)
          .maybeSingle();
        if (!company || company.owner_id !== user.id) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const price = priceForPlan(plan);
        if (!price) {
          return Response.json({ error: `No Stripe price for plan ${plan}` }, { status: 400 });
        }

        const site = process.env["SITE_URL"] || SITE_URL;
        const params = new URLSearchParams();
        params.set("mode", "subscription");
        params.set("success_url", `${site}/billing?checkout=success`);
        params.set("cancel_url", `${site}/billing?checkout=cancel`);
        params.set("client_reference_id", companyId);
        params.set("metadata[company_id]", companyId);
        params.set("metadata[plan]", plan);
        params.set("subscription_data[metadata][company_id]", companyId);
        params.set("subscription_data[metadata][plan]", plan);
        params.set("line_items[0][price]", price);
        params.set("line_items[0][quantity]", "1");
        if (user.email) params.set("customer_email", user.email);

        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });
        const session = (await stripeRes.json()) as {
          id?: string;
          url?: string;
          error?: { message?: string };
        };
        if (!stripeRes.ok || !session.url) {
          return Response.json(
            { error: session.error?.message || "Could not create checkout session" },
            { status: 502 },
          );
        }

        return Response.json({ url: session.url, id: session.id });
      },
    },
  },
});
