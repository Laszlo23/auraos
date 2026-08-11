import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { PageLoader } from "@/components/aura/page-loader";
import { Shell } from "@/components/aura/shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async () => {
    // Prefer local session restore (fast) over network getUser() so first paint
    // does not bounce to /auth and require a second load.
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session?.user) throw redirect({ to: "/auth" });
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        void supabase.auth.signOut();
      }
    });
    return { user: session.user };
  },
  pendingComponent: () => <PageLoader label="Einen Moment…" />,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
