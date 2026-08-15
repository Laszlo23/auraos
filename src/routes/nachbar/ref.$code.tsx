import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { NACHBAR_FRIEND_STORAGE_KEY } from "@/lib/nachbar";
import { nachbarHead } from "@/lib/nachbar-seo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/nachbar/ref/$code")({
  head: ({ params }) =>
    nachbarHead({
      title: "Einladung — Aura Nachbar",
      description:
        "Mitkommen nach Wien: Check-in im Laden, dann zählen beide. Bonus erst nach dem echten Besuch.",
      path: `/nachbar/ref/${params.code}`,
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
          mode: "signup" as const,
          next: "/nachbar/heute",
          lang: "de" as const,
          ...(normalized ? { ref: normalized } : {}),
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
