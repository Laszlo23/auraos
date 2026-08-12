import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { NACHBAR_FRIEND_STORAGE_KEY } from "@/lib/nachbar";
import { SITE_URL } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/nachbar/ref/$code")({
  head: ({ params }) => ({
    meta: [
      { title: "Einladung — Aura Nachbar" },
      { property: "og:url", content: `${SITE_URL}/nachbar/ref/${params.code}` },
    ],
  }),
  component: NachbarRefDeepLink,
});

function NachbarRefDeepLink() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const normalized = String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);
    if (normalized) localStorage.setItem(NACHBAR_FRIEND_STORAGE_KEY, normalized);

    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        navigate({ to: "/nachbar/heute", replace: true });
        return;
      }
      navigate({
        to: "/auth",
        search: {
          mode: "signup",
          next: "/nachbar/heute",
          lang: "de",
          ref: normalized || undefined,
        },
        replace: true,
      });
    })();
  }, [code, navigate]);

  return (
    <main className="grid min-h-svh place-items-center bg-background text-sm text-muted-foreground">
      Einladung wird geöffnet…
    </main>
  );
}
