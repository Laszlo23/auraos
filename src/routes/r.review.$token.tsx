import { createFileRoute, redirect } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";

import { SITE_URL } from "@/lib/site";

async function resolveReviewRedirect(token: string): Promise<string | null> {
  const trimmed = String(token || "").trim();
  if (!trimmed || trimmed.length < 8) return null;

  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: reviewUrl } = await supabase.rpc("mark_review_invite_clicked", {
    _token: trimmed,
  });
  if (typeof reviewUrl === "string" && reviewUrl.startsWith("http")) return reviewUrl;
  return null;
}

export const Route = createFileRoute("/r/review/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const dest = await resolveReviewRedirect(params.token);
        return Response.redirect(dest || `${SITE_URL}/`, 302);
      },
    },
  },
  loader: async ({ params }) => {
    const dest = await resolveReviewRedirect(params.token);
    if (!dest) throw redirect({ to: "/" });
    return { dest };
  },
  component: ReviewRedirectPage,
});

function ReviewRedirectPage() {
  const { dest } = Route.useLoaderData();
  useEffect(() => {
    window.location.replace(dest);
  }, [dest]);
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-8 text-sm text-muted-foreground">
      Opening Google review…
    </main>
  );
}
