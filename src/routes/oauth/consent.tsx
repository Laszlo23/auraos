import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/oauth/consent")({
  validateSearch: (search: Record<string, unknown>): { authorization_id?: string } => ({
    ...(typeof search["authorization_id"] === "string"
      ? { authorization_id: search["authorization_id"] }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: `Authorize app | ${SITE_NAME}` },
      {
        name: "description",
        content: `Approve or deny third-party access to your ${SITE_NAME} account.`,
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OAuthConsentPage,
});

function scopeLabel(scope: string): string {
  switch (scope) {
    case "openid":
      return "Confirm your identity";
    case "email":
      return "View your email address";
    case "profile":
      return "View your profile";
    case "phone":
      return "View your phone number";
    default:
      return scope;
  }
}

function OAuthConsentPage() {
  const { authorization_id: authorizationId } = Route.useSearch();
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!authorizationId) {
        setError("Missing authorization request.");
        setLoading(false);
        return;
      }

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
        window.location.assign(`/auth?mode=signin&next=${encodeURIComponent(next)}`);
        return;
      }

      const { data, error: detailsError } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

      if (cancelled) return;

      if (detailsError) {
        setError(detailsError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Authorization request not found.");
        setLoading(false);
        return;
      }

      if (!("authorization_id" in data)) {
        window.location.assign(data.redirect_url);
        return;
      }

      setDetails(data);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authorizationId]);

  async function decide(action: "approve" | "deny") {
    if (!authorizationId) return;
    setBusy(true);
    setError(null);
    try {
      const result =
        action === "approve"
          ? await supabase.auth.oauth.approveAuthorization(authorizationId)
          : await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (result.error) {
        setError(result.error.message);
        setBusy(false);
        return;
      }

      if (result.data?.redirect_url) {
        window.location.assign(result.data.redirect_url);
        return;
      }

      setError("No redirect returned from the authorization server.");
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed.");
      setBusy(false);
    }
  }

  const scopes = details?.scope?.trim()
    ? details.scope.split(/\s+/).filter(Boolean)
    : [];

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,#0a0a0b_0%,#12131a_100%)]"
      />
      <div className="relative w-full max-w-md">
        <p className="mb-6 text-center font-[family-name:var(--font-display)] text-2xl tracking-tight text-foreground">
          {SITE_NAME}
        </p>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Checking authorization…</p>
        ) : error ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button asChild variant="outline">
              <Link to="/auth" search={{ mode: "signin" }}>
                Back to sign in
              </Link>
            </Button>
          </div>
        ) : details ? (
          <div className="space-y-6 border border-white/10 bg-black/40 p-6 backdrop-blur-sm">
            <div className="space-y-2 text-center">
              {details.client.logo_uri ? (
                <img
                  src={details.client.logo_uri}
                  alt=""
                  className="mx-auto h-12 w-12 object-contain"
                />
              ) : null}
              <h1 className="text-xl font-medium tracking-tight text-foreground">
                Authorize {details.client.name || "this application"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Signed in as {details.user.email}. This app wants access to your {SITE_NAME}{" "}
                account.
              </p>
            </div>

            {scopes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Permissions
                </p>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  {scopes.map((scope) => (
                    <li key={scope} className="border-b border-white/5 pb-1.5 last:border-0">
                      {scopeLabel(scope)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {details.client.uri ? (
              <p className="truncate text-center text-[12px] text-muted-foreground">
                {details.client.uri}
              </p>
            ) : null}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => void decide("deny")}
              >
                Deny
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={busy}
                onClick={() => void decide("approve")}
              >
                {busy ? "Working…" : "Approve"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
