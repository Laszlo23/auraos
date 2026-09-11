import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  AURA_REPUTATION_BOOST_GRANT,
  AURA_REPUTATION_PLAN_ID,
  LOCAL_SEAT_BOOST_GRANT,
  LOCAL_SEAT_EUR,
  LOCAL_SEAT_PLAN_ID,
  boostPackById,
  isAuraReputationPlan,
  isBoostPackId,
  stripePriceForAuraReputation,
  stripePriceForBoostPack,
} from "@/lib/boost-packs";
import { funnelPlanById, isFunnelPlanId, stripePriceForFunnelPlan } from "@/lib/funnel-plans";
import {
  auraBuyPackById,
  isAuraBuyPackId,
  stripePriceEnvForAuraBuyPack,
} from "@/lib/aura-buy-guide";
import { SITE_URL } from "@/lib/site";
import { assertStripeChargesEnabled } from "@/lib/stripe-account";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";
import { isBaseAddress } from "@/lib/private-sale";

function priceForAuraPlan(plan: string): string | undefined {
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

        try {
          await assertStripeChargesEnabled(secret);
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Stripe charges are not enabled yet." },
            { status: 503 },
          );
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
          kind?: string;
          pack?: string;
          wallet?: string;
        };
        const plan = body.plan ?? "company";
        const companyId = body.company_id;
        if (!companyId) {
          return Response.json({ error: "company_id is required" }, { status: 400 });
        }

        const { data: company } = await supabase
          .from("companies")
          .select("id, owner_id, entry_funnel, local_seat_paid_at, ui_locale")
          .eq("id", companyId)
          .maybeSingle();
        if (!company || company.owner_id !== user.id) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const site = process.env["SITE_URL"] || SITE_URL;
        const params = new URLSearchParams();
        params.set("client_reference_id", companyId);
        params.set("metadata[company_id]", companyId);
        params.set("metadata[plan]", plan);
        if (company.entry_funnel) {
          params.set("metadata[entry_funnel]", company.entry_funnel);
        }
        if (user.email) params.set("customer_email", user.email);

        if (body.kind === "aura_buy" || isAuraBuyPackId(body.pack ?? "") || isAuraBuyPackId(plan)) {
          const packId = isAuraBuyPackId(body.pack ?? "")
            ? body.pack
            : isAuraBuyPackId(plan)
              ? plan
              : undefined;
          const pack = packId ? auraBuyPackById(packId) : undefined;
          const wallet = (body.wallet ?? "").trim();
          if (!pack) {
            return Response.json({ error: "Unknown AURA buy pack" }, { status: 400 });
          }
          if (!isBaseAddress(wallet)) {
            return Response.json({ error: "A provisioned Aura wallet is required" }, { status: 400 });
          }
          const price = stripePriceEnvForAuraBuyPack(pack.id);
          params.set("mode", "payment");
          params.set("success_url", `${site}/buy?checkout=success`);
          params.set("cancel_url", `${site}/buy?checkout=cancel`);
          params.set("metadata[kind]", "aura_buy");
          params.set("metadata[pack]", pack.id);
          params.set("metadata[user_id]", user.id);
          params.set("metadata[wallet]", wallet);
          params.set("client_reference_id", user.id);
          if (price) {
            params.set("line_items[0][price]", price);
          } else {
            params.set("line_items[0][price_data][currency]", "usd");
            params.set("line_items[0][price_data][unit_amount]", String(pack.usd * 100));
            params.set("line_items[0][price_data][product_data][name]", `AURA card pack $${pack.usd}`);
            params.set(
              "line_items[0][price_data][product_data][description]",
              "Card now. AURA sent to your Aura wallet after T-0. Not an on-chain swap.",
            );
          }
          params.set("line_items[0][quantity]", "1");
        } else if (plan === LOCAL_SEAT_PLAN_ID) {
          const price = process.env["STRIPE_PRICE_LOCAL_SEAT"]?.trim();
          params.set("mode", "payment");
          params.set("success_url", `${site}/boost?checkout=success`);
          params.set("cancel_url", `${site}/boost?checkout=cancel`);
          params.set("metadata[kind]", "local_seat");
          params.set("metadata[boost_grant]", String(LOCAL_SEAT_BOOST_GRANT));
          // Prefer inline €99 so Dashboard Price ID drift cannot undercharge.
          if (process.env["STRIPE_LOCAL_USE_PRICE_ID"] === "1" && price) {
            params.set("line_items[0][price]", price);
          } else {
            params.set("line_items[0][price_data][currency]", "eur");
            params.set("line_items[0][price_data][unit_amount]", String(LOCAL_SEAT_EUR * 100));
            params.set("line_items[0][price_data][product_data][name]", "Aura Local Seat");
            params.set(
              "line_items[0][price_data][product_data][description]",
              "One-time Local Seat unlock",
            );
          }
          params.set("line_items[0][quantity]", "1");
        } else if (isAuraReputationPlan(plan)) {
          const price = stripePriceForAuraReputation();
          if (!price) {
            return Response.json(
              { error: "Aura Reputation price not configured (STRIPE_PRICE_AURA_REPUTATION)" },
              { status: 503 },
            );
          }
          params.set("mode", "subscription");
          params.set("success_url", `${site}/boost?checkout=success`);
          params.set("cancel_url", `${site}/boost?checkout=cancel`);
          params.set("metadata[kind]", "aura_reputation");
          params.set("metadata[plan]", AURA_REPUTATION_PLAN_ID);
          params.set("metadata[boost_grant]", String(AURA_REPUTATION_BOOST_GRANT));
          params.set("line_items[0][price]", price);
          params.set("line_items[0][quantity]", "1");
        } else if (isBoostPackId(plan)) {
          if (!company.local_seat_paid_at) {
            return Response.json(
              { error: "Local Seat required before buying Boost packs." },
              { status: 400 },
            );
          }
          const pack = boostPackById(plan);
          const price = pack ? stripePriceForBoostPack(pack) : undefined;
          if (!pack || !price) {
            return Response.json({ error: `No Stripe price for pack ${plan}` }, { status: 400 });
          }
          params.set("mode", "payment");
          params.set("success_url", `${site}/boost?checkout=success`);
          params.set("cancel_url", `${site}/boost?checkout=cancel`);
          params.set("metadata[kind]", "boost_pack");
          params.set("metadata[boost_grant]", String(pack.boostGrant));
          params.set("metadata[kickoff]", pack.kickoff);
          params.set("line_items[0][price]", price);
          params.set("line_items[0][quantity]", "1");
        } else {
          const funnelPlan = isFunnelPlanId(plan) ? funnelPlanById(plan) : undefined;
          const entryFunnel = company.entry_funnel ?? "os";
          if (entryFunnel === "os" && funnelPlan) {
            return Response.json(
              { error: "Outcome plans are only for funnel companies. Use an AURA compute plan." },
              { status: 400 },
            );
          }
          if (entryFunnel !== "os" && !funnelPlan) {
            return Response.json(
              {
                error:
                  "This company uses outcome pricing. Choose a Starter / Growth / Performance plan.",
              },
              { status: 400 },
            );
          }

          const price = funnelPlan ? stripePriceForFunnelPlan(funnelPlan) : priceForAuraPlan(plan);
          if (!price) {
            return Response.json({ error: `No Stripe price for plan ${plan}` }, { status: 400 });
          }

          const mode = funnelPlan?.mode ?? "subscription";
          params.set("mode", mode);
          params.set("success_url", `${site}/billing?checkout=success`);
          params.set("cancel_url", `${site}/billing?checkout=cancel`);
          params.set("metadata[kind]", funnelPlan ? "funnel_plan" : "aura_plan");
          if (mode === "subscription") {
            params.set("subscription_data[metadata][company_id]", companyId);
            params.set("subscription_data[metadata][plan]", plan);
            if (funnelPlan) {
              params.set("subscription_data[metadata][kind]", "funnel_plan");
            }
          }
          params.set("line_items[0][price]", price);
          params.set("line_items[0][quantity]", "1");
        }

        try {
          const session = await createStripeCheckoutSession(secret, params);
          return Response.json({ url: session.url, id: session.id });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Could not create checkout session" },
            { status: 502 },
          );
        }
      },
    },
  },
});
