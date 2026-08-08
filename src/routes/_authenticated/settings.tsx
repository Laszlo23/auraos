import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader, Panel, SectionTitle } from "@/components/aura/primitives";
import { GenesisPassport } from "@/components/aura/genesis-passport";
import { useCompany } from "@/hooks/use-aura";
import { useProgress } from "@/hooks/use-progress";
import { trackAppEvent } from "@/lib/app-track";
import { AUTONOMY_MODES } from "@/lib/company-economy";
import { getCompanyEconomy, updateCompanyEconomySettings } from "@/lib/economy.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Aura OS" },
      {
        name: "description",
        content:
          "Name your company, set its strategy, and choose how much autonomy your agents are trusted with.",
      },
      { property: "og:title", content: "Settings — Aura OS" },
      { property: "og:description", content: "Tune your company's identity and autonomy." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: company } = useCompany();
  const { data: economy } = useQuery({
    queryKey: ["company-economy"],
    queryFn: () => getCompanyEconomy(),
    staleTime: 15_000,
  });
  const { data: progress } = useProgress();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [strategy, setStrategy] = useState("");
  const [autonomy, setAutonomy] = useState(0);
  const [dailyBudget, setDailyBudget] = useState(120);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setTagline(company.tagline ?? "");
    setStrategy(company.strategy ?? "");
    setAutonomy(typeof company.autonomy === "number" ? company.autonomy : 0);
    setTheme(company.theme === "light" ? "light" : "dark");
  }, [company]);

  useEffect(() => {
    if (economy?.dailyAuraBudget != null) setDailyBudget(economy.dailyAuraBudget);
    if (economy?.autonomy != null) setAutonomy(economy.autonomy);
  }, [economy?.dailyAuraBudget, economy?.autonomy]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  async function save() {
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ name, tagline, strategy, autonomy, theme })
      .eq("id", company.id);
    if (error) {
      setSaving(false);
      toast.error("Could not save.");
      return;
    }
    try {
      await updateCompanyEconomySettings({
        data: { autonomy, dailyAuraBudget: dailyBudget },
      });
    } catch {
      toast.error("Saved identity; budget update failed (run migration?).");
      setSaving(false);
      return;
    }
    setSaving(false);
    toast.success("Your company has been updated.");
    trackAppEvent("settings_saved", { company_id: company.id });
    qc.invalidateQueries({ queryKey: ["company"] });
    qc.invalidateQueries({ queryKey: ["company-economy"] });
  }

  const mode = AUTONOMY_MODES[Math.min(3, Math.max(0, autonomy))]!;

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Identity"
        title="How your company behaves"
        description="Everything here changes how the agents reason — not just what the interface says."
      />

      <Panel className="p-7">
        <SectionTitle title="Company" hint="Shown to every agent in every prompt" />
        <div className="space-y-4">
          <div>
            <label
              htmlFor="settings-name"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              Name
            </label>
            <input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Company name"
              className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none ring-offset-background focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <div>
            <label
              htmlFor="settings-tagline"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              Tagline
            </label>
            <input
              id="settings-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              aria-label="Company tagline"
              className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none ring-offset-background focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <div>
            <label
              htmlFor="settings-strategy"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              Strategy
            </label>
            <textarea
              id="settings-strategy"
              value={strategy}
              rows={4}
              onChange={(e) => setStrategy(e.target.value)}
              aria-label="Company strategy"
              className="mt-2 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm leading-relaxed outline-none ring-offset-background focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </Panel>

      <Panel className="p-7" delay={0.06}>
        <SectionTitle
          title="Autonomy"
          hint="Four modes with real dispatch behavior — saved with Save"
        />
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Autonomy level">
          {AUTONOMY_MODES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setAutonomy(l.id)}
              aria-pressed={autonomy === l.id}
              className={`rounded-2xl px-4 py-3 text-left transition-colors ${
                autonomy === l.id
                  ? "bg-primary/15 text-primary"
                  : "bg-foreground/6 text-muted-foreground"
              }`}
            >
              <p className="text-[13px] font-semibold">{l.label}</p>
              <p className="mt-1 text-[11px] opacity-80">{l.short}</p>
            </button>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">{mode.body}</p>
        <div className="mt-5">
          <label
            htmlFor="daily-aura"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          >
            Daily AURA budget
          </label>
          <input
            id="daily-aura"
            type="number"
            min={12}
            max={2000}
            value={dailyBudget}
            onChange={(e) => setDailyBudget(Number(e.target.value) || 120)}
            className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40"
          />
          <p className="mt-2 text-[12px] text-muted-foreground">
            Spent today: {economy?.auraSpentToday ?? 0} AURA. Over budget → tasks wait for approval.
            Blocked when paused agents or Manual mode.
          </p>
        </div>
      </Panel>

      <GenesisPassport
        companyName={name || company?.name}
        slug={economy?.slug}
        seat={progress?.seat_number}
      />

      <Panel className="p-7" delay={0.12}>
        <SectionTitle title="Appearance" hint="Saved with Save above" />
        <div className="flex gap-2" role="group" aria-label="Theme">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={`flex-1 rounded-2xl px-4 py-3 text-[13px] capitalize transition-colors ${
                theme === t ? "bg-primary/15 text-primary" : "bg-foreground/6 text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="p-7 border border-destructive/30" delay={0.18}>
        <SectionTitle title="Danger zone" hint="Irreversible account actions" />
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          Delete your company and sign out. Supabase will remove owned rows via cascade where
          configured. This cannot be undone from the app.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (!company) return;
            const ok = window.confirm("Delete your company and sign out? This cannot be undone.");
            if (!ok) return;
            const { error } = await supabase.from("companies").delete().eq("id", company.id);
            if (error) {
              toast.error("Could not delete company.");
              return;
            }
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="rounded-2xl bg-destructive/15 px-5 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/25"
        >
          Delete company & sign out
        </button>
      </Panel>
    </div>
  );
}
