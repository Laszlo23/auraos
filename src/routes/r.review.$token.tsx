import { createFileRoute, Link } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";

import { SITE_URL } from "@/lib/site";

async function resolveReviewInvite(token: string): Promise<{
  googleUrl: string | null;
  companyName: string | null;
  slug: string | null;
  checkinCode: string | null;
}> {
  const trimmed = String(token || "").trim();
  if (!trimmed || trimmed.length < 8) {
    return { googleUrl: null, companyName: null, slug: null, checkinCode: null };
  }

  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    return { googleUrl: null, companyName: null, slug: null, checkinCode: null };
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: reviewUrl } = await supabase.rpc("mark_review_invite_clicked", {
    _token: trimmed,
  });

  const googleUrl =
    typeof reviewUrl === "string" && reviewUrl.startsWith("http") ? reviewUrl : null;

  // Best-effort shop context for Nachbar CTA (service role).
  const { data: invite } = await supabase
    .from("review_invites")
    .select("campaign_id")
    .eq("tracking_token", trimmed)
    .maybeSingle();

  let companyName: string | null = null;
  let slug: string | null = null;
  let checkinCode: string | null = null;
  if (invite?.campaign_id) {
    const { data: campaign } = await supabase
      .from("review_campaigns")
      .select("company_id")
      .eq("id", invite.campaign_id)
      .maybeSingle();
    if (campaign?.company_id) {
      // Always mint a check-in code so the Nachbar CTA is primary, not optional.
      const { data: ensured } = await supabase.rpc("ensure_nachbar_checkin_code", {
        _company_id: campaign.company_id,
      });
      if (typeof ensured === "string" && ensured.length >= 4) {
        checkinCode = ensured;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("name, slug, nachbar_checkin_code, google_review_url")
        .eq("id", campaign.company_id)
        .maybeSingle();
      companyName = (company?.name as string) || null;
      slug = (company?.slug as string) || null;
      if (!checkinCode) {
        checkinCode = (company?.nachbar_checkin_code as string) || null;
      }
    }
  }

  return { googleUrl, companyName, slug, checkinCode };
}

export const Route = createFileRoute("/r/review/$token")({
  loader: async ({ params }) => resolveReviewInvite(params.token),
  head: () => ({
    meta: [{ title: "Einladung — Aura Nachbar" }, { name: "robots", content: "noindex" }],
  }),
  component: ReviewInviteBridgePage,
});

function ReviewInviteBridgePage() {
  const data = Route.useLoaderData();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, oklch(0.55 0.1 200 / 0.2), transparent 60%)",
        }}
      />
      <div className="relative z-10 w-full max-w-md space-y-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          Aura Nachbar
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {data.companyName
            ? `Danke für deinen Besuch bei ${data.companyName}`
            : "Danke für deinen Besuch"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Checke in der Gäste-App ein und verdiene Punkte. Google bleibt optional —{" "}
          <strong className="text-foreground">ohne Belohnung</strong>.
        </p>

        <div className="flex flex-col gap-3">
          {data.checkinCode ? (
            <Link
              to="/nachbar/c/$code"
              params={{ code: data.checkinCode }}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              In Aura Nachbar einchecken
            </Link>
          ) : (
            <Link
              to="/nachbar"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              Aura Nachbar öffnen
            </Link>
          )}
          {data.slug ? (
            <Link
              to="/b/$slug"
              params={{ slug: data.slug }}
              className="inline-flex items-center justify-center rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
            >
              Laden-Karte
            </Link>
          ) : null}
          {ready && data.googleUrl ? (
            <a
              href={data.googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/50 px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Star className="h-4 w-4 opacity-70" /> Optional: Google öffnen — ohne Belohnung
            </a>
          ) : null}
        </div>

        <p className="text-[11px] text-muted-foreground">
          <a href={SITE_URL} className="underline-offset-2 hover:underline">
            aibusiness.fun
          </a>
        </p>
      </div>
    </main>
  );
}
