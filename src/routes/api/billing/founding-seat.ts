import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { SITE_URL } from "@/lib/site";
import { assertStripeChargesEnabled } from "@/lib/stripe-account";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

const FOUNDING_SEAT_PRICE_CENTS = 9900;

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

export const Route = createFileRoute("/api/billing/founding-seat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_SECRET_KEY"];
        const priceId = process.env["STRIPE_PRICE_FOUNDING_SEAT"]?.trim();
        if (!secret || !priceId) {
          return Response.json(
            { error: "Founding seat checkout is not configured" },
            { status: 503 },
          );
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

        const body = (await request.json().catch(() => ({}))) as { invite?: string };
        const invite = (body.invite ?? "").trim().toUpperCase() || null;

        const { data: existingSeat } = await supabase
          .from("founding_seats")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (existingSeat) {
          return Response.json({ error: "You already hold a founding seat" }, { status: 400 });
        }

        const { data: remaining, error: remErr } = await supabase.rpc("founding_seats_remaining");
        if (remErr) {
          return Response.json({ error: remErr.message }, { status: 500 });
        }
        if ((remaining as number) <= 0) {
          return Response.json({ error: "Founding seats are sold out" }, { status: 409 });
        }

        // Open sale: invite is optional attribution only — never block checkout.
        let inviteMeta: string | null = null;
        if (invite) {
          const { data: ok } = await supabase.rpc("check_invite_code", { _code: invite });
          if (ok) inviteMeta = invite;
        }

        const site = process.env["SITE_URL"] || SITE_URL;
        const params = new URLSearchParams();
        params.set("mode", "payment");
        params.set("success_url", `${site}/auth?seat=success`);
        params.set("cancel_url", `${site}/access?seat=cancel`);
        params.set("client_reference_id", user.id);
        params.set("metadata[kind]", "founding_seat");
        params.set("metadata[user_id]", user.id);
        if (inviteMeta) params.set("metadata[invite_code]", inviteMeta);
        params.set("line_items[0][price]", priceId);
        params.set("line_items[0][quantity]", "1");
        if (user.email) params.set("customer_email", user.email);

        try {
          // Prefer Checkout ToS checkbox when Dashboard public details include Terms URL.
          const withConsent = new URLSearchParams(params);
          withConsent.set("consent_collection[terms_of_service]", "required");
          withConsent.set(
            "custom_text[terms_of_service_acceptance][message]",
            `I agree to the [Terms / AGB](${site}/terms) and [Privacy Policy](${site}/privacy)`,
          );
          let session: Awaited<ReturnType<typeof createStripeCheckoutSession>>;
          try {
            session = await createStripeCheckoutSession(secret, withConsent);
          } catch (consentErr) {
            const msg = consentErr instanceof Error ? consentErr.message : "";
            if (/terms_of_service|consent_collection|public.?detail/i.test(msg)) {
              session = await createStripeCheckoutSession(secret, params);
            } else {
              throw consentErr;
            }
          }
          return Response.json({
            url: session.url,
            id: session.id,
            amount_cents: FOUNDING_SEAT_PRICE_CENTS,
          });
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
