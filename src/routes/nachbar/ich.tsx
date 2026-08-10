import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Panel, Shimmer } from "@/components/aura/primitives";
import { ensureNachbarProfile, getNachbarHub } from "@/lib/nachbar.functions";

export const Route = createFileRoute("/nachbar/ich")({
  head: () => ({ meta: [{ title: "Ich — Aura Nachbar" }] }),
  component: NachbarIchPage,
});

function NachbarIchPage() {
  const qc = useQueryClient();
  const { data: hub, isLoading } = useQuery({
    queryKey: ["nachbar-hub"],
    queryFn: () => getNachbarHub(),
  });
  const [city, setCity] = useState("");
  const [name, setName] = useState("");

  const save = useMutation({
    mutationFn: () =>
      ensureNachbarProfile({
        data: {
          city: city || hub?.profile.city || undefined,
          displayName: name || hub?.profile.display_name || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Profil gespeichert");
      void qc.invalidateQueries({ queryKey: ["nachbar-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Shimmer className="h-40" />;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Ich</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Profil</h1>
        <p className="mt-2 text-sm text-muted-foreground">Stadt und Anzeigename — Wallet bleibt unsichtbar.</p>
      </div>

      <Panel label="Nachbarschaft">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Anzeigename
          <input
            className="mt-1.5 w-full rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50"
            defaultValue={hub?.profile.display_name ?? ""}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Stadt
          <input
            className="mt-1.5 w-full rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50"
            defaultValue={hub?.profile.city ?? ""}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Wien"
          />
        </label>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate()}
          className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          Speichern
        </button>
      </Panel>

      <Panel label="Cash-out">
        <p className="text-sm text-muted-foreground">
          Status: noch nicht freigeschaltet. Zuerst Perks bei Partnerläden, dann optional USDC mit Limits.
        </p>
      </Panel>

      <Panel label="Links">
        <div className="flex flex-col gap-2 text-sm font-semibold">
          <Link to="/nachbar" className="text-primary">
            Landing
          </Link>
          <Link to="/lokal" className="text-muted-foreground">
            Aura Lokal (Betriebe)
          </Link>
          <a href="/privacy" className="text-muted-foreground">
            Privacy
          </a>
        </div>
      </Panel>
    </div>
  );
}
