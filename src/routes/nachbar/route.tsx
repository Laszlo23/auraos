import { createFileRoute, Outlet } from "@tanstack/react-router";

import { NachbarShell } from "@/components/aura/nachbar-shell";

export const Route = createFileRoute("/nachbar")({
  component: NachbarLayout,
});

function NachbarLayout() {
  return (
    <NachbarShell>
      <Outlet />
    </NachbarShell>
  );
}
