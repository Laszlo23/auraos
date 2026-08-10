import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Monitor, Smartphone, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LandingSiteView } from "@/components/aura/landing-site-view";
import { Chip, PageHeader, Panel } from "@/components/aura/primitives";
import { useCompany } from "@/hooks/use-aura";
import { supabase } from "@/integrations/supabase/client";
import {
  createCompanySite,
  ensureDemoSubscriptionSites,
  getCompanySite,
  listCompanySites,
  listSiteLeads,
  publishCompanySite,
  updateCompanySite,
  type CompanySiteRow,
} from "@/lib/sites.functions";
import { LANDING_TEMPLATES, type SiteContent } from "@/lib/sites/templates";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/website")({
  head: () => ({
    meta: [
      { title: "Website — Aura OS" },
      {
        name: "description",
        content:
          "Pick a landing template, edit copy, preview, and publish a real public URL.",
      },
      { property: "og:title", content: "Website — Aura OS" },
      { property: "og:description", content: "Publishable company landings on Aura OS." },
    ],
  }),
  component: WebsitePage,
});

function WebsitePage() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [slugEdit, setSlugEdit] = useState("");
  const [stripePriceId, setStripePriceId] = useState("");

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["company-sites"],
    queryFn: () => listCompanySites() as Promise<CompanySiteRow[]>,
  });

  const { data: review } = useQuery({
    queryKey: ["founder-review", company?.id],
    enabled: Boolean(company?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_reviews")
        .select("status, founder_visible_note, reviewed_at")
        .eq("company_id", company!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toggleNetwork = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!company?.id) throw new Error("No company");
      const { error } = await supabase
        .from("companies")
        .update(
          enabled
            ? { network_backlink: true, is_local_business: true }
            : { network_backlink: false },
        )
        .eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["company"] });
      toast.success("Network preference saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeId = selectedId ?? sites[0]?.id ?? null;

  const { data: site } = useQuery({
    queryKey: ["company-site", activeId],
    queryFn: () => getCompanySite({ data: { siteId: activeId! } }),
    enabled: Boolean(activeId),
  });

  useEffect(() => {
    if (!site) return;
    setDraft(site.content);
    setSlugEdit(site.slug);
    setStripePriceId(site.products?.[0]?.stripe_price_id ?? "");
  }, [site?.id, site?.updated_at]);

  const create = useMutation({
    mutationFn: (templateId: string) => createCompanySite({ data: { templateId } }),
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: ["company-sites"] });
      setSelectedId(row.id);
      toast.success("Draft site created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => {
      if (!site || !draft) throw new Error("Nothing to save");
      return updateCompanySite({
        data: {
          siteId: site.id,
          slug: slugEdit,
          content: draft,
          ...(stripePriceId.trim() ? { stripePriceId: stripePriceId.trim() } : {}),
        },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["company-sites"] });
      await qc.invalidateQueries({ queryKey: ["company-site", activeId] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: (publishFlag: boolean) => {
      if (!site) throw new Error("No site");
      return publishCompanySite({ data: { siteId: site.id, publish: publishFlag } });
    },
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: ["company-sites"] });
      await qc.invalidateQueries({ queryKey: ["company-site", activeId] });
      toast.success(row.status === "published" ? "Published" : "Unpublished");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedDemo = useMutation({
    mutationFn: () => ensureDemoSubscriptionSites(),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["company-sites"] });
      toast.success(
        res.created.length
          ? `Seeded ${res.created.join(", ")}`
          : "Horoscope & Tarot Daily are ready",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publicUrl = useMemo(() => {
    if (!site) return null;
    return `${SITE_URL}/s/${site.slug}`;
  }, [site]);

  const copyUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Public URL copied");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Surface"
        title="Your landing page"
        description="Aura landing templates — edit copy, preview the real render, publish a shareable /s/$slug URL."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {site?.status === "published" ? (
              <Chip tone="gold">Live</Chip>
            ) : (
              <Chip>Draft</Chip>
            )}
            {review?.status === "reviewed" ? (
              <Chip tone="primary">Aura reviewed your page</Chip>
            ) : review?.status === "queued" ? (
              <Chip>Concierge queue</Chip>
            ) : null}
            <div className="glass-soft flex gap-1 rounded-2xl p-1">
              {(["desktop", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={cn(
                    "grid h-9 w-10 place-items-center rounded-xl transition-colors",
                    device === d ? "bg-primary/15 text-primary" : "text-muted-foreground",
                  )}
                >
                  {d === "desktop" ? (
                    <Monitor className="h-4 w-4" />
                  ) : (
                    <Smartphone className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {company ? (
        <Panel label="Founding network" className="mb-5">
          <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              checked={Boolean(company.network_backlink)}
              onChange={(e) => toggleNetwork.mutate(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              Show this site on the opt-in Founding network strip (reciprocal links with other local
              online businesses). Separate from any token launch.
            </span>
          </label>
          {review?.status === "reviewed" && review.founder_visible_note ? (
            <p className="mt-3 text-[13px] text-foreground/90">{review.founder_visible_note}</p>
          ) : null}
        </Panel>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {sites.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            className={cn(
              "rounded-2xl px-3 py-1.5 text-[12px] font-medium",
              s.id === activeId ? "bg-primary/15 text-primary" : "bg-foreground/6 text-muted-foreground",
            )}
          >
            {s.content.brand || s.slug}
            {s.status === "published" ? " · live" : ""}
          </button>
        ))}
        {!isLoading && sites.length === 0 ? (
          <span className="text-sm text-muted-foreground">No sites yet — pick a template.</span>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel className="p-4">
          <div
            className={cn(
              "mx-auto overflow-hidden rounded-3xl border border-border bg-[oklch(0.12_0.01_265)] transition-all duration-500",
              device === "mobile" ? "w-[380px] max-w-full" : "w-full",
            )}
          >
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="ml-3 truncate rounded-lg bg-foreground/6 px-3 py-1 text-[10px] text-muted-foreground">
                {site ? `/s/${site.slug}` : "preview"}
              </span>
            </div>
            {site && draft ? (
              <div className={cn(device === "mobile" ? "max-h-[640px] overflow-auto" : "")}>
                <LandingSiteView
                  slug={site.slug}
                  templateId={site.template_id}
                  content={draft}
                  product={site.products?.[0] ?? null}
                  interactive={false}
                  preview={site.status !== "published"}
                />
              </div>
            ) : (
              <div className="px-8 py-16 text-center text-sm text-muted-foreground">
                Create a site from a template to preview.
              </div>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel label="Templates">
            <div className="space-y-2">
              {LANDING_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={create.isPending}
                  onClick={() => create.mutate(t.id)}
                  className="flex w-full items-start gap-2 rounded-2xl border border-border/50 px-3 py-2 text-left hover:bg-foreground/4"
                >
                  <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    <span className="block text-[13px] font-semibold">{t.name}</span>
                    <span className="text-[11px] text-muted-foreground">{t.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 text-[12px] font-medium text-primary hover:underline"
              disabled={seedDemo.isPending}
              onClick={() => seedDemo.mutate()}
            >
              Seed Horoscope + Tarot Daily
            </button>
          </Panel>

          {site && draft ? (
            <Panel label="Edit & publish">
              <label className="block text-[11px] text-muted-foreground">
                Slug
                <input
                  value={slugEdit}
                  onChange={(e) => setSlugEdit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              {(
                [
                  ["brand", "Brand"],
                  ["hero", "Hero"],
                  ["subhead", "Subhead"],
                  ["cta", "CTA"],
                  ["offer", "Offer"],
                  ["pricing", "Pricing"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="mt-3 block text-[11px] text-muted-foreground">
                  {label}
                  <input
                    value={draft[key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              ))}
              {(site.template_id === "subscription_daily" ||
                site.template_id === "ebook_product") && (
                <label className="mt-3 block text-[11px] text-muted-foreground">
                  Stripe price ID
                  <input
                    value={stripePriceId}
                    onChange={(e) => setStripePriceId(e.target.value)}
                    placeholder="price_…"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="rounded-2xl bg-foreground/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => publish.mutate(site.status !== "published")}
                  disabled={publish.isPending}
                  className="rounded-2xl bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground"
                >
                  {site.status === "published" ? "Unpublish" : "Publish"}
                </button>
              </div>
              {publicUrl ? (
                <div className="mt-4 space-y-2">
                  <p className="truncate text-[12px] text-muted-foreground">{publicUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyUrl()}
                      className="inline-flex items-center gap-1 rounded-xl bg-foreground/8 px-2.5 py-1.5 text-[11px]"
                    >
                      <Copy className="h-3 w-3" /> Copy URL
                    </button>
                    <a
                      href={
                        site.status === "published"
                          ? `/s/${site.slug}`
                          : `/s/${site.slug}?preview=1`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-foreground/8 px-2.5 py-1.5 text-[11px]"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </a>
                    <Link
                      to="/connect"
                      className="inline-flex items-center gap-1 rounded-xl bg-foreground/8 px-2.5 py-1.5 text-[11px]"
                    >
                      Wire SMTP
                    </Link>
                  </div>
                </div>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </div>

      <SiteLeadsPanel />
    </div>
  );
}

function SiteLeadsPanel() {
  const { data: leads = [] } = useQuery({
    queryKey: ["site-leads"],
    queryFn: () => listSiteLeads(),
    staleTime: 15_000,
  });
  if (!leads.length) return null;
  return (
    <Panel label="Landing leads" className="mt-6">
      <p className="mb-3 text-[12.5px] text-muted-foreground">
        CTA captures land here. The worker drafts outreach — you still approve every send from
        Akquise / mailbox.
      </p>
      <ul className="space-y-3">
        {leads.slice(0, 12).map((lead: { id: string; email: string; status: string; draft_subject: string | null }) => (
          <li key={lead.id} className="rounded-2xl border border-border/50 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{lead.email}</span>
              <Chip>{lead.status}</Chip>
            </div>
            {lead.draft_subject ? (
              <p className="mt-1 text-[12px] text-muted-foreground">{lead.draft_subject}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
