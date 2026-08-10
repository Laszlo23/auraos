import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { NACHBAR_CHECKIN_STORAGE_KEY } from "@/lib/nachbar";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/nachbar/c/$code")({
  head: ({ params }) => ({
    meta: [
      { title: "Check-in — Aura Nachbar" },
      { property: "og:url", content: `${SITE_URL}/nachbar/c/${params.code}` },
    ],
  }),
  component: NachbarCheckinDeepLink,
});

function NachbarCheckinDeepLink() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const normalized = String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16);
    if (normalized) sessionStorage.setItem(NACHBAR_CHECKIN_STORAGE_KEY, normalized);
    navigate({ to: "/nachbar/heute", replace: true });
  }, [code, navigate]);

  return (
    <main className="grid min-h-svh place-items-center bg-background text-sm text-muted-foreground">
      Check-in wird vorbereitet…
    </main>
  );
}
