import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader, Panel, SectionTitle } from "@/components/aura/primitives";
import { GenesisPassport } from "@/components/aura/genesis-passport";
import { useCompany } from "@/hooks/use-aura";
import { useLocale } from "@/hooks/use-locale";
import { useProgress } from "@/hooks/use-progress";
import { trackAppEvent } from "@/lib/app-track";
import { rememberLocale, type UiLocale } from "@/lib/attribution";
import { applyOsPresetToCompany } from "@/lib/apply-os-preset";
import { AUTONOMY_MODES } from "@/lib/company-economy";
import { getCompanyEconomy, updateCompanyEconomySettings } from "@/lib/economy.functions";
import { applyDocumentLang } from "@/lib/i18n";
import { localizedNavHint, localizedNavLabel } from "@/lib/nav";
import {
  isOsPresetId,
  navPathsForCheckboxGrid,
  OS_PRESET_IDS,
  OS_PRESETS,
  parseNavPrefs,
  presetDefaultNav,
  type OsPresetId,
} from "@/lib/os-presets";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Aura OS" },
      {
        name: "description",
        content:
          "Name your company, pick a business OS preset, choose menu buttons, and set language.",
      },
      { property: "og:title", content: "Settings — Aura OS" },
      { property: "og:description", content: "Tune identity, menu, and language." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: company } = useCompany();
  const { locale, setLocale, t } = useLocale();
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
  const [preset, setPreset] = useState<OsPresetId>("full");
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);

  const checkboxItems = useMemo(() => navPathsForCheckboxGrid(), []);

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setTagline(company.tagline ?? "");
    setStrategy(company.strategy ?? "");
    setAutonomy(typeof company.autonomy === "number" ? company.autonomy : 0);
    setTheme(company.theme === "light" ? "light" : "dark");
    const nextPreset = isOsPresetId(company.os_preset) ? company.os_preset : "full";
    setPreset(nextPreset);
    const prefs = parseNavPrefs(company.nav_prefs);
    setCheckedPaths(new Set(prefs ?? presetDefaultNav(nextPreset)));
    if (company.ui_locale === "de" || company.ui_locale === "en") {
      if (company.ui_locale !== locale) {
        rememberLocale(company.ui_locale);
        setLocale(company.ui_locale);
        applyDocumentLang(company.ui_locale);
      }
    }
  }, [company]); // eslint-disable-line react-hooks/exhaustive-deps -- sync from company row only

  useEffect(() => {
    if (economy?.dailyAuraBudget != null) setDailyBudget(economy.dailyAuraBudget);
    if (economy?.autonomy != null) setAutonomy(economy.autonomy);
  }, [economy?.dailyAuraBudget, economy?.autonomy]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function togglePath(to: string) {
    setCheckedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(to)) next.delete(to);
      else next.add(to);
      next.add("/console");
      return next;
    });
  }

  function applyPresetDefaults(id: OsPresetId) {
    setPreset(id);
    setCheckedPaths(new Set(presetDefaultNav(id)));
  }

  async function saveLanguage(next: UiLocale) {
    rememberLocale(next);
    setLocale(next);
    applyDocumentLang(next);
    if (!company) return;
    await supabase.from("companies").update({ ui_locale: next }).eq("id", company.id);
    qc.invalidateQueries({ queryKey: ["company"] });
  }

  async function save() {
    if (!company) return;
    setSaving(true);
    const navPrefs = [...checkedPaths];
    if (!navPrefs.includes("/console")) navPrefs.unshift("/console");
    if (!navPrefs.includes("/settings")) navPrefs.push("/settings");

    try {
      await applyOsPresetToCompany({
        companyId: company.id,
        companyName: name.trim() || company.name,
        presetId: preset,
        navPrefs,
        bootstrap: true,
      });
    } catch {
      setSaving(false);
      toast.error(t("settings.saveFailed"));
      return;
    }

    const { error } = await supabase
      .from("companies")
      .update({
        name,
        tagline,
        strategy,
        autonomy,
        theme,
        ui_locale: locale,
      })
      .eq("id", company.id);
    if (error) {
      setSaving(false);
      toast.error(t("settings.saveFailed"));
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
    toast.success(t("settings.saved"));
    trackAppEvent("settings_saved", {
      company_id: company.id,
      os_preset: preset,
      nav_count: navPrefs.length,
    });
    qc.invalidateQueries({ queryKey: ["company"] });
    qc.invalidateQueries({ queryKey: ["company-economy"] });
    qc.invalidateQueries({ queryKey: ["agents"] });
  }

  const mode = AUTONOMY_MODES[Math.min(3, Math.max(0, autonomy))]!;
  const presetDef = OS_PRESETS[preset];

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <Panel className="p-7">
        <SectionTitle title={t("settings.company")} hint={t("settings.companyHint")} />
        <div className="space-y-4">
          <div>
            <label
              htmlFor="settings-name"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              {t("settings.name")}
            </label>
            <input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label={t("settings.name")}
              className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none ring-offset-background focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <div>
            <label
              htmlFor="settings-tagline"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              {t("settings.tagline")}
            </label>
            <input
              id="settings-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              aria-label={t("settings.tagline")}
              className="mt-2 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none ring-offset-background focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <div>
            <label
              htmlFor="settings-strategy"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              {t("settings.strategy")}
            </label>
            <textarea
              id="settings-strategy"
              value={strategy}
              rows={4}
              onChange={(e) => setStrategy(e.target.value)}
              aria-label={t("settings.strategy")}
              className="mt-2 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm leading-relaxed outline-none ring-offset-background focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
        </div>
      </Panel>

      <Panel className="p-7" delay={0.04}>
        <SectionTitle title={t("settings.workspace")} hint={t("settings.workspaceHint")} />
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("settings.presetLabel")}
        </p>
        <div
          className="grid gap-2 sm:grid-cols-2"
          role="group"
          aria-label={t("settings.presetLabel")}
        >
          {OS_PRESET_IDS.map((id) => {
            const def = OS_PRESETS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => applyPresetDefaults(id)}
                aria-pressed={preset === id}
                className={`rounded-2xl px-4 py-3 text-left transition-colors ${
                  preset === id
                    ? "bg-primary/15 text-primary"
                    : "bg-foreground/6 text-muted-foreground"
                }`}
              >
                <p className="text-[13px] font-semibold">{t(def.labelKey)}</p>
                <p className="mt-1 text-[11px] opacity-80">{t(def.blurbKey)}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">
          {t(presetDef.blurbKey)} · {t("settings.applyPreset")}
        </p>

        <p className="mb-2 mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("settings.menuLabel")}
        </p>
        <p className="mb-3 text-[12px] text-muted-foreground">{t("settings.menuHint")}</p>
        <div className="grid max-h-[22rem] gap-1.5 overflow-y-auto rounded-2xl border border-border/60 p-3 sm:grid-cols-2">
          {checkboxItems.map((item) => {
            const on = checkedPaths.has(item.to);
            return (
              <label
                key={item.to}
                className={`flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                  on ? "bg-primary/10" : "hover:bg-foreground/5"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={on}
                  disabled={item.to === "/console"}
                  onChange={() => togglePath(item.to)}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">
                    {localizedNavLabel(item, false, locale)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {localizedNavHint(item, locale)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-7" delay={0.06}>
        <SectionTitle title={t("settings.language")} hint={t("settings.languageHint")} />
        <div className="flex gap-2" role="group" aria-label={t("settings.language")}>
          {(["en", "de"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => void saveLanguage(lang)}
              aria-pressed={locale === lang}
              className={`flex-1 rounded-2xl px-4 py-3 text-[13px] transition-colors ${
                locale === lang
                  ? "bg-primary/15 text-primary"
                  : "bg-foreground/6 text-muted-foreground"
              }`}
            >
              {lang === "en" ? t("settings.langEn") : t("settings.langDe")}
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="p-7" delay={0.08}>
        <SectionTitle title={t("settings.autonomy")} hint={t("settings.autonomyHint")} />
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={t("settings.autonomy")}>
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
            {t("settings.dailyBudget")}
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
        </div>
      </Panel>

      <GenesisPassport
        companyName={name || company?.name}
        slug={economy?.slug}
        seat={progress?.seat_number}
      />

      <Panel className="p-7" delay={0.12}>
        <SectionTitle title={t("settings.appearance")} hint={t("settings.appearanceHint")} />
        <div className="flex gap-2" role="group" aria-label={t("settings.appearance")}>
          {(["dark", "light"] as const).map((th) => (
            <button
              key={th}
              type="button"
              onClick={() => setTheme(th)}
              aria-pressed={theme === th}
              className={`flex-1 rounded-2xl px-4 py-3 text-[13px] capitalize transition-colors ${
                theme === th
                  ? "bg-primary/15 text-primary"
                  : "bg-foreground/6 text-muted-foreground"
              }`}
            >
              {th}
            </button>
          ))}
        </div>
      </Panel>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving ? t("settings.saving") : t("settings.save")}
      </button>

      <Panel className="border border-destructive/30 p-7" delay={0.18}>
        <SectionTitle title={t("settings.danger")} hint={t("settings.dangerHint")} />
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          {t("settings.dangerBody")}
        </p>
        <button
          type="button"
          onClick={async () => {
            if (!company) return;
            const ok = window.confirm(t("settings.delete"));
            if (!ok) return;
            const { error } = await supabase.from("companies").delete().eq("id", company.id);
            if (error) {
              toast.error(t("settings.saveFailed"));
              return;
            }
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="rounded-2xl bg-destructive/15 px-5 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/25"
        >
          {t("settings.delete")}
        </button>
      </Panel>
    </div>
  );
}
