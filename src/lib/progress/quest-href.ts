/**
 * Quest CTA destinations — weekly/daily “Go” must land where the work happens.
 */

export function questActionHref(key: string): string {
  if (key.startsWith("tickpix:") || key.startsWith("ccff00:")) return "/community";
  if (key.startsWith("growth:social") || key.startsWith("growth:space") || key === "growth:scout-share") {
    return "/community";
  }
  if (key.startsWith("community:")) return "/community";
  if (key.startsWith("scout:") || key.includes("scout")) return "/quest";
  if (key.startsWith("portal:") || key.startsWith("nachbar:")) return "/nachbar/heute";
  if (key.startsWith("channels:") || key.includes("channels")) return "/channels";
  if (key.startsWith("mission:") || key.startsWith("task:")) return "/missions";
  if (key === "company:spin") return "/quest";
  return "/quest";
}
