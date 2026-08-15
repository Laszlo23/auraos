import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { rememberNachbarVisit } from "@/lib/nachbar-play";
import { nachbarHead } from "@/lib/nachbar-seo";

export const Route = createFileRoute("/nachbar/c/$code")({
  head: ({ params }) =>
    nachbarHead({
      title: "Check-in — Aura Nachbar",
      description: "QR am Tresen: echter Besuch, dann Stempel und Punkte. Keine Fake-Sterne.",
      path: `/nachbar/c/${params.code}`,
    }),
  component: NachbarCheckinDeepLink,
});

function NachbarCheckinDeepLink() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: user, isLoading } = useSupabaseSession();

  useEffect(() => {
    const normalized = String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16);
    if (normalized) rememberNachbarVisit({ code: normalized, auto: true });
    if (isLoading) return;
    if (user) {
      navigate({ to: "/nachbar/heute", replace: true });
      return;
    }
    navigate({
      to: "/auth",
      search: { mode: "signup", next: "/nachbar/heute", lang: "de" },
      replace: true,
    });
  }, [code, navigate, user, isLoading]);

  return (
    <main className="grid min-h-svh place-items-center bg-background text-sm text-muted-foreground">
      Check-in wird vorbereitet…
    </main>
  );
}
