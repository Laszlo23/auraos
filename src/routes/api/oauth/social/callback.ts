import { createFileRoute } from "@tanstack/react-router";

import {
  exchangeCode,
  redirectBase,
  saveConnectionTokens,
  type SocialProvider,
} from "@/lib/social-oauth.server";

const isProvider = (v: string): v is SocialProvider =>
  v === "x" || v === "linkedin" || v === "meta";

export const Route = createFileRoute("/api/oauth/social/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const base = redirectBase(request);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const fail = async (msg: string, popup = true) => {
          const dest = popup
            ? `${base}/oauth/social/return?success=false&error=${encodeURIComponent(msg)}`
            : `${base}/channels?oauth=error&message=${encodeURIComponent(msg)}`;
          return Response.redirect(dest, 302);
        };

        if (!code || !state) return fail("Missing OAuth code");

        const { data: row } = await supabaseAdmin
          .from("social_oauth_states")
          .select("*")
          .eq("state", state)
          .maybeSingle();
        if (!row || !isProvider(row.provider)) return fail("OAuth state expired — try again");

        // One-time use
        await supabaseAdmin.from("social_oauth_states").delete().eq("state", state);

        // Expire old states
        await supabaseAdmin
          .from("social_oauth_states")
          .delete()
          .lt("created_at", new Date(Date.now() - 15 * 60_000).toISOString());

        try {
          const redirectUri = `${base}/api/oauth/social/callback`;
          const tokens = await exchangeCode(row.provider, code, redirectUri, row.code_verifier);
          await saveConnectionTokens(row.company_id, row.provider, tokens);

          const dest = row.popup
            ? `${base}/oauth/social/return?success=true&provider=${row.provider}`
            : `${base}/channels?oauth=connected&provider=${row.provider}`;
          return Response.redirect(dest, 302);
        } catch (e) {
          return fail(e instanceof Error ? e.message : "Connection failed", row.popup);
        }
      },
    },
  },
});
