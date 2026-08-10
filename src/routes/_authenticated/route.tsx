import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";

import { PageLoader } from "@/components/aura/page-loader";
import { Shell } from "@/components/aura/shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  pendingComponent: () => <PageLoader label="Opening workspace" />,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Shell>
      {/* Remount on path change so stale client state cannot linger after nav. */}
      <Outlet key={pathname} />
    </Shell>
  );
}