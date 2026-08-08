import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  authorizeUrl,
  newPkce,
  redirectBase,
  socialConfigured,
  type SocialProvider,
} from "@/lib/social-oauth.server";

const isProvider = (v: string | null): v is SocialProvider =>
  v === "x" || v === "linkedin" || v === "meta";

function accessTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
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
    /* ignore */
  }
  return null;
}

export const Route = createFileRoute("/api/oauth/social/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const providerParam = url.searchParams.get("provider");
        const companyId = url.searchParams.get("company_id");
        const popup = url.searchParams.get("popup") === "1";
        const base = redirectBase(request);

        if (!companyId || !isProvider(providerParam)) {
          return new Response("provider and company_id are required", { status: 400 });
        }
        if (!socialConfigured(providerParam)) {
          return new Response("Social OAuth is not configured for this provider", { status: 503 });
        }

        const token = accessTokenFromRequest(request);
        const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
        const anon =
          process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        if (!token || !supabaseUrl || !anon) {
          return Response.redirect(`${base}/auth`, 302);
        }

        const supabase = createClient<Database>(supabaseUrl, anon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const {
          data: { user },
        } = await supabase.auth.getUser(token);
        if (!user) return Response.redirect(`${base}/auth`, 302);

        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .eq("id", companyId)
          .eq("owner_id", user.id)
          .maybeSingle();
        if (!company) return new Response("Company not found", { status: 403 });

        const { verifier, challenge, state } = newPkce();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("social_oauth_states").upsert({
          state,
          provider: providerParam,
          company_id: companyId,
          user_id: user.id,
          code_verifier: verifier,
          popup,
          created_at: new Date().toISOString(),
        });

        const callback = `${base}/api/oauth/social/callback`;
        const authUrl = authorizeUrl(providerParam, {
          redirectUri: callback,
          state,
          challenge,
        });
        return Response.redirect(authUrl, 302);
      },
    },
  },
});
