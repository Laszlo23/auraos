import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, PageHeader, Panel, SectionTitle } from "@/components/aura/primitives";
import { useCompany, useCompanyTable } from "@/hooks/use-aura";
import { useSubscription } from "@/hooks/use-tokens";
import { supabase } from "@/integrations/supabase/client";
import { trackAppEvent } from "@/lib/app-track";
import {
  getMyCreatorStats,
  hirePublishedAgent,
  listAgentListings,
  publishAgentListing,
} from "@/lib/economy.functions";
import { TOKEN_SYMBOL } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Aura OS" },
      {
        name: "description",
        content: "Hire AI employees, publish your own agents for royalties, or use the catalog.",
      },
      { property: "og:title", content: "Marketplace — Aura OS" },
      { property: "og:description", content: "Hire, publish, earn royalties." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MarketplacePage,
});

const CATALOG = [
  ["growth", "Growth Lead", "✦", "Owns acquisition, lifecycle and channel mix.", 320],
  ["sales", "Sales Closer", "◈", "Qualifies, negotiates and closes inbound pipeline.", 340],
  ["designer", "Designer", "❖", "Brand, product imagery and interface design.", 280],
  ["developer", "Engineer", "⌘", "Ships features and keeps the storefront fast.", 420],
  ["support", "Support Lead", "◍", "Answers customers and rescues churn.", 240],
  ["finance", "Finance Officer", "▤", "Reconciles, forecasts and guards the margin.", 300],
  ["lawyer", "Counsel", "§", "Contracts, compliance and data protection.", 260],
  ["researcher", "Researcher", "◇", "Market signal, competitor moves, demand curves.", 290],
  ["recruiter", "Recruiter", "◐", "Sources and briefs new agents for your company.", 210],
] as const;

type Install = { id: string; slug: string };

function MarketplacePage() {
  const { data: company } = useCompany();
  const { data: sub } = useSubscription();
  const { data: installs = [] } = useCompanyTable<Install>("marketplace_installs");
  const qc = useQueryClient();
  const owned = new Set(installs.map((i) => i.slug));

  const { data: listings = [] } = useQuery({
    queryKey: ["agent-listings"],
    queryFn: () => listAgentListings(),
    staleTime: 20_000,
  });
  const { data: creator } = useQuery({
    queryKey: ["creator-stats"],
    queryFn: () => getMyCreatorStats(),
    staleTime: 20_000,
  });

  const [pub, setPub] = useState({
    name: "",
    role: "",
    category: "Operations",
    summary: "",
    instructions: "",
    skills: "",
    priceAura: 200,
  });

  const publish = useMutation({
    mutationFn: () =>
      publishAgentListing({
        data: {
          name: pub.name,
          role: pub.role,
          category: pub.category,
          summary: pub.summary,
          instructions: pub.instructions,
          skills: pub.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          priceAura: pub.priceAura,
        },
      }),
    onSuccess: () => {
      toast.success("Agent published — royalties settle on hire");
      setPub({
        name: "",
        role: "",
        category: "Operations",
        summary: "",
        instructions: "",
        skills: "",
        priceAura: 200,
      });
      qc.invalidateQueries({ queryKey: ["agent-listings"] });
      qc.invalidateQueries({ queryKey: ["creator-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hireListing = useMutation({
    mutationFn: (listingId: string) => hirePublishedAgent({ data: { listingId } }),
    onSuccess: () => {
      toast.success("Agent hired — royalties paid to creator when priced");
      qc.invalidateQueries({ queryKey: ["table", "agents"] });
      qc.invalidateQueries({ queryKey: ["agent-listings"] });
      qc.invalidateQueries({ queryKey: ["subscription"] });
      qc.invalidateQueries({ queryKey: ["company-economy"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function hire(slug: string, name: string) {
    if (!company) return;
    const entry = CATALOG.find((c) => c[0] === slug);
    if (!entry) return;
    const cost = entry[4];

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, tokens_remaining")
      .eq("company_id", company.id)
      .maybeSingle();
    if (subError) {
      toast.error("Could not read your AURA balance.");
      return;
    }
    const remaining = subscription?.tokens_remaining ?? sub?.tokens_remaining ?? 0;
    if (remaining < cost) {
      toast.error(`Not enough ${TOKEN_SYMBOL}. Need ${cost}, have ${remaining}.`);
      return;
    }

    if (subscription) {
      const { error: debitError } = await supabase
        .from("subscriptions")
        .update({ tokens_remaining: remaining - cost })
        .eq("id", subscription.id);
      if (debitError) {
        toast.error("Could not debit AURA for this hire.");
        return;
      }
      await supabase.from("token_ledger").insert({
        company_id: company.id,
        kind: "spend",
        amount: -cost,
        reason: `Marketplace hire · ${name}`,
      });
    }

    const { error } = await supabase
      .from("marketplace_installs")
      .insert({ company_id: company.id, slug });
    if (error) {
      toast.error("Could not hire right now.");
      return;
    }

    await supabase.from("agents").insert({
      company_id: company.id,
      name,
      role: name,
      avatar: entry[2],
      accent: "primary",
      status: "active",
      current_task: "Just hired — awaiting first brief",
      health: 100,
      performance: 0,
      activity: 0,
      revenue_generated: 0,
      credits_used: 0,
      tasks_completed: 0,
      lessons_count: 0,
      memory: entry[3],
    });
    await supabase.from("activity_events").insert({
      company_id: company.id,
      kind: "hire",
      message: `${name} joined the company — onboard brief queued`,
    });
    trackAppEvent("marketplace_hire", {
      company_id: company.id,
      slug,
      name,
      cost,
    });
    const { data: hired } = await supabase
      .from("agents")
      .select("id")
      .eq("company_id", company.id)
      .eq("name", name)
      .maybeSingle();
    if (hired?.id) {
      await supabase.from("tasks").insert({
        company_id: company.id,
        agent_id: hired.id,
        title: `Onboard ${name}`,
        description: `Read company knowledge and file a 5-bullet brief for the founder on how you will help. Do not invent metrics.`,
        status: "queued",
        priority: "medium",
        roi: 0,
        progress: 0,
      });
    }
    try {
      const { triggerWorkerTick } = await import("@/lib/worker.functions");
      await triggerWorkerTick();
      toast.success(`${name} hired — onboard brief running now.`);
    } catch {
      toast.success(`${name} hired — onboard brief queued.`);
    }
    qc.invalidateQueries({ queryKey: ["table", "marketplace_installs"] });
    qc.invalidateQueries({ queryKey: ["table", "agents"] });
    qc.invalidateQueries({ queryKey: ["table", "tasks"] });
    qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
    qc.invalidateQueries({ queryKey: ["subscription"] });
    qc.invalidateQueries({ queryKey: ["token-ledger"] });
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Markets"
        title="Hire, publish, earn royalties"
        description="Catalog hires and community listings settle AURA. Creator royalties write to the company ledger — no theater buttons."
      />

      {creator && (
        <Panel className="p-6">
          <SectionTitle title="Your creator stats" hint="From published listings" />
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Listings" value={String(creator.listings.length)} />
            <Stat label="Companies using" value={String(creator.companies)} />
            <Stat label="Hire volume AURA" value={String(creator.revenueAura)} />
            <Stat label="Est. royalties" value={String(creator.royaltiesAura)} />
          </div>
        </Panel>
      )}

      <Panel className="p-6">
        <SectionTitle title="Publish an agent" hint="Skills → price → live listing" />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={pub.name}
            onChange={(e) => setPub({ ...pub, name: e.target.value })}
            placeholder="Agent name"
            className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm"
          />
          <input
            value={pub.role}
            onChange={(e) => setPub({ ...pub, role: e.target.value })}
            placeholder="Role"
            className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm"
          />
          <input
            value={pub.category}
            onChange={(e) => setPub({ ...pub, category: e.target.value })}
            placeholder="Category"
            className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm"
          />
          <input
            type="number"
            value={pub.priceAura}
            onChange={(e) => setPub({ ...pub, priceAura: Number(e.target.value) || 0 })}
            placeholder="Price AURA"
            className="rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm"
          />
        </div>
        <textarea
          value={pub.summary}
          onChange={(e) => setPub({ ...pub, summary: e.target.value })}
          rows={2}
          placeholder="Summary buyers see"
          className="mt-3 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm"
        />
        <textarea
          value={pub.instructions}
          onChange={(e) => setPub({ ...pub, instructions: e.target.value })}
          rows={2}
          placeholder="Operating instructions (become agent memory)"
          className="mt-3 w-full resize-none rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm"
        />
        <input
          value={pub.skills}
          onChange={(e) => setPub({ ...pub, skills: e.target.value })}
          placeholder="Skills (comma-separated)"
          className="mt-3 w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm"
        />
        <button
          type="button"
          disabled={publish.isPending}
          onClick={() => publish.mutate()}
          className="mt-4 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {publish.isPending ? "Publishing…" : "Publish agent"}
        </button>
      </Panel>

      <div>
        <SectionTitle title="Published agents" hint="Hire with AURA · royalties to creators" />
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(listings as Record<string, unknown>[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">No published agents yet — be first.</p>
          ) : (
            (listings as Array<Record<string, string | number | null>>).map((l, i) => (
              <Panel key={String(l["id"])} className="flex flex-col p-6" delay={0.03 * i}>
                <Chip tone="primary">{String(l["category"])}</Chip>
                <h3 className="mt-3 text-base font-semibold">{String(l["name"])}</h3>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {String(l["role"])}
                </p>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                  {String(l["summary"])}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <Chip tone="gold">
                    {Number(l["price_aura"])} {TOKEN_SYMBOL}
                  </Chip>
                  <button
                    type="button"
                    disabled={hireListing.isPending}
                    onClick={() => hireListing.mutate(String(l["id"]))}
                    className="rounded-2xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Hire
                  </button>
                </div>
              </Panel>
            ))
          )}
        </div>
      </div>

      <div>
        <SectionTitle title="Aura catalog" hint="Built-in roles" />
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {CATALOG.map(([slug, name, avatar, description, credits], i) => {
            const hired = owned.has(slug);
            return (
              <Panel key={slug} className="flex flex-col p-6" delay={0.04 * i}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/14 text-lg text-primary">
                  {avatar}
                </span>
                <h3 className="mt-5 text-base font-semibold">{name}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <Chip tone="gold">
                    {credits} {TOKEN_SYMBOL}
                  </Chip>
                  <button
                    disabled={hired}
                    onClick={() => void hire(slug, name)}
                    className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                      hired
                        ? "bg-foreground/7 text-muted-foreground"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {hired ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {hired ? "On the team" : "Hire"}
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-soft rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="num mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
