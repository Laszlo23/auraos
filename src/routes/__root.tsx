import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuroraField } from "@/components/aura/aurora";
import { InstallApp } from "@/components/aura/install-app";
import { AppBootLoader, PageProgress } from "@/components/aura/page-loader";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider, useLocale } from "@/hooks/use-locale";
import { usePwa } from "@/hooks/use-pwa";
import { OG_IMAGE, SITE_NAME, SITE_URL, VIEWPORT_CONTENT } from "@/lib/site";
import { baseAppId } from "@/lib/base-builder";
import { rootOrganizationGraph } from "@/lib/seo";
import { resolveUiLocale } from "@/lib/i18n";
import { getCookie, getHeader } from "vinxi/http";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-[1.75rem] px-8 py-10 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Lost</p>
        <h1 className="text-gradient mt-3 font-display text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">This surface does not exist</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-7">
          <Link
            to="/"
            className="cta-liquid inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-[1.75rem] px-8 py-10 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="cta-liquid inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-foreground/[0.04] px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/35"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/** Load GA after first paint so it does not compete with LCP / fonts. */
function DeferredAnalytics() {
  useEffect(() => {
    const id = "G-PZMRS91Q88";
    const boot = () => {
      if (document.getElementById("aura-gtag")) return;
      const w = window as Window & {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
      };
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag(...args: unknown[]) {
        w.dataLayer!.push(args);
      };
      w.gtag("js", new Date());
      w.gtag("config", id, { send_page_view: true });
      const s = document.createElement("script");
      s.id = "aura-gtag";
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      document.head.appendChild(s);
    };

    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      const handle = ric(boot, { timeout: 3500 });
      return () => {
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(
          handle,
        );
      };
    }
    const t = window.setTimeout(boot, 2200);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: VIEWPORT_CONTENT },
      { title: "Aura OS — The AI Company Operating System" },
      {
        name: "description",
        content:
          "Aura OS runs your company as a living organism of autonomous AI employees — strategy, growth, sales, and operations, awake around the clock.",
      },
      { name: "author", content: "Aura OS" },
      { name: "theme-color", content: "#07090E" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Aura OS" },
      { name: "application-name", content: "Aura OS" },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      // Base Developer Portal — required for Base App / mini-app verification
      { name: "base:app_id", content: baseAppId() },
      { property: "og:title", content: "Aura OS — The AI Company Operating System" },
      {
        property: "og:description",
        content: "Don't manage software. Manage an AI company.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Own the company. AI works. You keep the upside.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
      {
        name: "twitter:image:alt",
        content: "Own the company. AI works. You keep the upside.",
      },
      { name: "twitter:title", content: "Aura OS — The AI Company Operating System" },
      {
        name: "twitter:description",
        content: "Don't manage software. Manage an AI company.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(rootOrganizationGraph()),
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://www.googletagmanager.com" },
      { rel: "dns-prefetch", href: "https://aibusiness.fun" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      { rel: "alternate", type: "text/plain", href: "/llms.txt", title: "llms.txt" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  let locale = "en";

  if (typeof window === "undefined") {
    try {
      const cookieLocale = getCookie("aura.ui_locale");
      if (cookieLocale === "de" || cookieLocale === "en") {
        locale = cookieLocale;
      } else {
        const acceptLanguage = getHeader("accept-language");
        locale = resolveUiLocale({ acceptLanguage });
      }
    } catch {
      locale = "en";
    }
  }

  return (
    <html lang={locale} className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  usePwa();

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <RootChrome />
      </LocaleProvider>
    </QueryClientProvider>
  );
}

function RootChrome() {
  const { t } = useLocale();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        {t("common.skip")}
      </a>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <AuroraField />
      <PageProgress />
      <AppBootLoader />
      <div id="main" role="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </div>
      <Toaster position="top-center" />
      <InstallApp />
      <DeferredAnalytics />
    </>
  );
}
