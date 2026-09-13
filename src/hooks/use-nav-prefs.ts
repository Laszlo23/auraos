import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { useCompany } from "@/hooks/use-aura";
import { supabase } from "@/integrations/supabase/client";
import {
  isOsPresetId,
  isPinnedNavPath,
  normalizeNavPrefs,
  parseNavPrefs,
  presetDefaultNav,
  toggleNavPref,
} from "@/lib/os-presets";

/** Live menu checkboxes — writes nav_prefs only, no agent bootstrap. */
export function useNavPrefsEditor() {
  const { data: company } = useCompany();
  const qc = useQueryClient();

  const paths = useMemo(() => {
    const prefs = parseNavPrefs(company?.nav_prefs);
    const preset = isOsPresetId(company?.os_preset) ? company.os_preset : "full";
    return prefs ?? presetDefaultNav(preset);
  }, [company?.nav_prefs, company?.os_preset]);

  const save = useMutation({
    mutationFn: async (nextPaths: string[]) => {
      if (!company) throw new Error("no company");
      const next = normalizeNavPrefs(nextPaths);
      const { error } = await supabase
        .from("companies")
        .update({ nav_prefs: next })
        .eq("id", company.id);
      if (error) throw error;
      return next;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["company"] });
    },
  });

  async function toggle(to: string) {
    if (isPinnedNavPath(to)) return;
    await save.mutateAsync(toggleNavPref(paths, to));
  }

  return {
    paths,
    enabled: new Set(paths),
    toggle,
    saving: save.isPending,
    companyId: company?.id ?? null,
  };
}
