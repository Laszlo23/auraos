import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export const SUPABASE_SESSION_KEY = ["supabase-session"] as const;

/** Local session first — never sign out on a single getUser blip. */
export function useSupabaseSession() {
  const qc = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      qc.setQueryData<User | null>(SUPABASE_SESSION_KEY, session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  return useQuery({
    queryKey: SUPABASE_SESSION_KEY,
    queryFn: async (): Promise<User | null> => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user ?? null;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: typeof window !== "undefined",
  });
}
