import type { LandingTemplateId } from "@/lib/sites/templates";

/** True when this brief is supposed to produce a real /s/$slug page, not just copy. */
export function isLandingPageTask(
  title: string,
  description: string | null,
  agentName = "",
  agentRole = "",
): boolean {
  const t = `${title} ${description ?? ""}`.toLowerCase();
  const who = `${agentName} ${agentRole}`.toLowerCase();
  if (
    /landing[- ]?page|landingpage|create a (web)?site|create (the |a )?page|storefront|merchandis|publish.*(site|page)|\/website|company site|draft landing|launch.{0,16}(web)?site|build.{0,16}(landing|website|web ?page)|webseite|seite erstellen/.test(
      t,
    )
  ) {
    return true;
  }
  return (
    /designer|storefront|product & storefront|product and storefront/.test(who) &&
    /page|site|web|brand|landing|copy|offer/.test(t)
  );
}

export function pickLandingTemplate(title: string, description: string | null): LandingTemplateId {
  const t = `${title} ${description ?? ""}`.toLowerCase();
  if (/ebook|e-book|\bpdf\b|digital product/.test(t)) return "ebook_product";
  if (/horoscope|tarot|daily drop|subscription/.test(t)) return "subscription_daily";
  if (/lead magnet|waitlist|newsletter|email capture|free guide/.test(t)) return "lead_magnet";
  return "service_offer";
}
