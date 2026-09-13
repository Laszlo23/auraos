import { captureAttribution } from "@/lib/attribution";
import { SITE_URL } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";

/** Web stream. This is the ID that belongs in gtag/js — not the numeric property. */
export const GA_MEASUREMENT_ID = "G-PZMRS91Q88";
/** GA Admin property (Admin URL /p549148530). Used for Data API reports, not the page tag. */
export const GA4_PROPERTY_ID = "549148530";

const STATIC_EXT = /\.(js|css|mjs|map|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico|mp4|webm)$/i;

export function gtagBootstrapHtml(measurementId = GA_MEASUREMENT_ID): string {
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false});`;
}

export function gaPageViewParams(path: string): {
  page_path: string;
  page_title: string;
  page_location: string;
  send_to: string;
} {
  const origin =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : SITE_URL;
  const search = typeof window !== "undefined" ? window.location.search : "";
  return {
    page_path: path,
    page_title: typeof document !== "undefined" ? document.title : "",
    page_location: `${origin}${path}${search}`,
    send_to: GA_MEASUREMENT_ID,
  };
}

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  __auraPvQueue?: string[];
};

/** Strip secrets and skip surfaces we do not count as public views. */
export function publicPagePath(pathname: string): string | null {
  const raw = (pathname || "").trim();
  if (!raw) return null;
  const path = raw.split("?")[0] || "/";
  if (STATIC_EXT.test(path)) return null;
  if (path.startsWith("/api")) return null;
  if (path.startsWith("/assets")) return null;
  if (path === "/sw.js" || path === "/desk" || path.startsWith("/desk/")) return null;
  if (path === "/ops" || path.startsWith("/ops/")) return null;
  if (path.startsWith("/lokal/claim")) return "/lokal/claim";
  return path.slice(0, 200);
}

let last = { path: "", t: 0 };

export function trackPublicPageView(pathname: string): void {
  if (typeof window === "undefined") return;
  const path = publicPagePath(pathname);
  if (!path) return;
  const now = Date.now();
  if (last.path === path && now - last.t < 1200) return;
  last = { path, t: now };
  captureAttribution();
  trackTeaser("page_view", { placement: path });
  sendGaPageView(path);
}

export function sendGaPageView(path: string): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag === "function") {
    w.gtag("event", "page_view", gaPageViewParams(path));
    return;
  }
  w.__auraPvQueue = w.__auraPvQueue || [];
  w.__auraPvQueue.push(path);
}

/** Call after gtag.js config so the first SPA hit is not dropped. */
export function flushQueuedGaPageViews(): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  const queued = w.__auraPvQueue ?? [];
  w.__auraPvQueue = [];
  if (typeof w.gtag !== "function") return;
  for (const path of queued) {
    w.gtag("event", "page_view", gaPageViewParams(path));
  }
}
