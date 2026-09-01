import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Celebrate } from "@/components/aura/celebrate";
import { Chip, Panel } from "@/components/aura/primitives";
import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { getPublicPortal } from "@/lib/progress.public.functions";
import { discoverAuraPortal } from "@/lib/progress/award";
import { OG_IMAGE, SITE_URL, url } from "@/lib/site";

export const Route = createFileRoute("/portal/$slug")({
  loader: async ({ params }) => {
    const portal = await getPublicPortal({ data: { slug: params.slug } });
    if (!portal) throw notFound();
    return portal;
  },
  head: ({ loaderData, params }) => {
    const portal = loaderData;
    const title = portal
      ? `${portal.label} — AURA Portal · ${portal.city ?? "Wien"}`
      : `Portal · ${params.slug}`;
    const description =
      portal?.tagline ||
      `Discover ${portal?.label ?? params.slug} — an AURA Portal in the city. Check in for XP and badges.`;
    const path = `/portal/${portal?.slug ?? params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url(path) },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url(path) }],
    };
  },
  component: PortalPage,
});

function PortalPage() {
  const portal = Route.useLoaderData();
  const [discovered, setDiscovered] = useState(false);
  const [celebrate, setCelebrate] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user || cancelled) return;
      try {
        const result = await discoverAuraPortal(portal.slug);
        if (!result.duplicate) {
          setDiscovered(true);
          setCelebrate((c) => c + 1);
          toast.success("Portal discovered!", {
            description: "+60 XP · +8 REP · badge progress",
          });
        }
      } catch {
        /* guest or already discovered */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portal.slug]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] px-5 py-14 md:px-8">
      <header className="mb-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">AURA Portal</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {portal.emoji ?? "🟣"} {portal.label}
        </h1>
        {portal.tagline ? (
          <p className="mt-2 text-[15px] text-muted-foreground">{portal.tagline}</p>
        ) : null}
        {discovered ? (
          <Chip tone="gold" className="mt-4 inline-flex">
            <Sparkles className="h-3 w-3" /> Discovered
          </Chip>
        ) : null}
      </header>

      <Panel label="In the city" glow>
        <div className="space-y-4">
          {portal.street || portal.city ? (
            <p className="flex items-start gap-2 text-[14px] text-foreground/90">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {[portal.street, portal.city].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Scan or tap this portal when you visit. Ask staff to confirm your check-in on Nachbar —
            that is how XP and REP stay honest.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/nachbar/heute"
              className="rounded-2xl bg-primary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
            >
              Open Nachbar
            </Link>
            {portal.company_slug ? (
              <Link
                to="/b/$slug"
                params={{ slug: portal.company_slug }}
                className="rounded-2xl border border-border/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
              >
                Shop card
              </Link>
            ) : null}
            <Link
              to="/auth"
              className="rounded-2xl border border-border/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
            >
              Sign in to track progress
            </Link>
          </div>
        </div>
      </Panel>

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        Portal URL · {SITE_URL}/portal/{portal.slug}
      </p>

      <SiteFooter className="mt-12" />
      <Celebrate trigger={celebrate} />
    </main>
  );
}
