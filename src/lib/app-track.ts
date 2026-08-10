import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AppEvent =
  | "signup_complete"
  | "onboarding_complete"
  | "first_task"
  | "first_spend"
  | "settings_saved"
  | "deal_advanced"
  | "campaign_toggled"
  | "campaign_created"
  | "marketing_post"
  | "file_uploaded"
  | "marketplace_hire"
  | "checkout_started"
  | "page_view";

/** Fire-and-forget product analytics for authenticated flows. */
export function trackAppEvent(
  event: AppEvent,
  props: { company_id?: string | undefined; [key: string]: Json | undefined } = {},
): void {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;
      const { company_id, ...rest } = props;
      await supabase.from("app_events").insert({
        user_id: userId,
        company_id: typeof company_id === "string" ? company_id : null,
        event,
        props: rest as Json,
      });
    } catch {
      /* never break UI */
    }
  })();
}
