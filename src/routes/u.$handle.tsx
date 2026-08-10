import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Flame } from "lucide-react";

import { Chip, Panel } from "@/components/aura/primitives";
import { ShareBar } from "@/components/aura/share";
import { ShareCard } from "@/components/aura/share-card";
import { SiteFooter } from "@/components/aura/site-footer";
import { usePublicAgents, usePublicStats } from "@/hooks/use-public";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePublicHandle } from "@/hooks/use-identity";
import { useMilestones } from "@/hooks/use-contest";
import { shortHash } from "@/lib/subscription";
import { SITE_URL, OG_IMAGE } from "@/lib/site";

export const Route = createFileRoute("/u/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.handle} — building in public | Aura OS` },
      {
        name: "description",
        content: `Follow @${params.handle}'s autonomous AI company: verified wallets, public milestones and live contest standing.`,
      },
      { property: "og:title", content: `@${params.handle} on Aura OS` },
      { property: "og:description", content: "An autonomous AI company, built in public." },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: `${SITE_URL}/u/${params.handle}` },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/u/${params.handle}` }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { handle } = Route.useParams();
  const { data: profile, isLoading } = usePublicHandle(handle);
  const companyId = (profile as { company_id?: string | null } | null)?.company_id ?? undefined;
  const { data: milestones = [] } = useMilestones(
    companyId ? { companyId, limit: 25 } : { limit: 0 },
  );
  const { data: agents = [] } = usePublicAgents(handle);
  const { data: stats } = usePublicStats(handle);

  const { data: wallets = [] } = useQuery({
    queryKey: ["public-wallets", (profile as { id?: string } | null)?.id],
    enabled: Boolean((profile as { id?: string } | null)?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_handle_wallets" as never)
        .select("id, role, chain, address_short")
        .eq("handle_id", (profile as { id: string }).id)
        .order("slot");
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        role: string;
        chain: string;
        address_short: string;
      }[];
    },
  });

  const { data: fioHandles = [] } = useQuery({
    queryKey: ["public-fio", (profile as { id?: string } | null)?.id],
    enabled: Boolean((profile as { id?: string } | null)?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fio_attestations")
        .select("fio_handle, chain_code, token_code, status, verified")
        .eq("handle_id", (profile as { id: string }).id)
        .eq("verified", true)
        .eq("status", "valid");
      if (error) throw error;
      return (data ?? []) as {
        fio_handle: string;
        chain_code: string;
        token_code: string;
        status: string;
        verified: boolean;
      }[];
    },
  });

  if (!isLoading && !profile) {
    return (
      <main className="mx-auto max-w-[720px] px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">@{handle} is not on Aura yet</h1>
        <p className="mt-3 text-[14px] text-muted-foreground">
          This handle is unclaimed. Claim it before someone else does.
        </p>
        <Link
          to="/auth"
          className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
        >
          Claim @{handle}
        </Link>
      </main>
    );
  }

  const p = profile as
    | {
        display_name: string;
        bio: string | null;
        avatar: string;
        companies?: { name: string; tagline: string | null } | null;
      }
    | null
    | undefined;

  return (
    <main className="mx-auto w-full max-w-[900px] px-5 py-14 md:px-8 md:py-20">
      <header className="mb-8 flex flex-wrap items-center gap-5">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[28px] bg-primary/12 text-4xl">
          {p?.avatar ?? "◎"}
        </span>
        <div className="min-w-[220px] flex-1">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {p?.display_name ?? handle}
          </h1>
          <p className="text-[13px] text-muted-foreground">@{handle}</p>
          {fioHandles[0] ? (
            <p className="mt-1 text-[13px] font-semibold text-primary">
              FIO · {fioHandles[0].fio_handle}
            </p>
          ) : null}
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            {p?.bio ?? p?.companies?.tagline ?? "Building an autonomous company in public."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            to="/leaderboard"
            className="rounded-2xl bg-foreground/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Leaderboard
          </Link>
          <ShareBar
            url={`${SITE_URL}/u/${handle}`}
            text={`@${handle} is building an autonomous AI company on Aura.`}
            placement="profile"
            compact
          />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Panel label="Company stats" className="lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "AI employees",
                value: Number(stats?.agent_count ?? agents.length).toLocaleString(),
              },
              {
                label: "Agent revenue",
                value: `$${Number(stats?.agent_revenue ?? 0).toLocaleString()}`,
              },
              {
                label: "Machine-API calls",
                value: Number(stats?.x402_calls ?? 0).toLocaleString(),
              },
              { label: "USDC earned", value: `$${Number(stats?.x402_revenue ?? 0).toFixed(4)}` },
              {
                label: "Wallets bound",
                value: Number(stats?.wallets_bound ?? wallets.length).toLocaleString(),
              },
            ].map((s) => (
              <div key={s.label}>
                <p className="num text-xl font-semibold leading-none">{s.value}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel label="Agent roster" bodyClassName="p-0" delay={0.03}>
          {agents.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted-foreground">No agents hired yet.</p>
          ) : (
            agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 border-b border-border/40 px-5 py-3.5 last:border-0"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground/6 text-lg">
                  {a.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{a.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{a.role}</p>
                </div>
                <span className="num text-[12px] text-gold">
                  ${Number(a.revenue_generated ?? 0).toLocaleString()}
                </span>
                <Chip tone={a.status === "active" ? "primary" : "neutral"}>{a.status}</Chip>
              </div>
            ))
          )}
        </Panel>

        <Panel label="Share this company" delay={0.06}>
          <ShareCard
            kind="revenue"
            stat={`$${Number(stats?.agent_revenue ?? 0).toLocaleString()}`}
            headline={`${p?.display_name ?? handle} is running an autonomous AI company on Aura.`}
            sub={`${Number(stats?.agent_count ?? agents.length)} AI employees · ${Number(stats?.x402_calls ?? 0)} paid machine calls`}
            handle={handle}
          />
        </Panel>

        <Panel label="Verified wallets" bodyClassName="p-0" glow>
          {wallets.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted-foreground">No verified wallets yet.</p>
          ) : (
            wallets.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-3 border-b border-border/40 px-5 py-3.5 last:border-0"
              >
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold capitalize">{w.role}</p>
                  <p className="num truncate text-[11px] text-muted-foreground">
                    {w.address_short}
                  </p>
                </div>
                <Chip>{w.chain}</Chip>
              </div>
            ))
          )}
        </Panel>

        {fioHandles.length > 0 ? (
          <Panel label="FIO crypto handles" bodyClassName="p-0" delay={0.04}>
            {fioHandles.map((f) => (
              <div
                key={`${f.fio_handle}-${f.chain_code}-${f.token_code}`}
                className="flex items-center gap-3 border-b border-border/40 px-5 py-3.5 last:border-0"
              >
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{f.fio_handle}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.chain_code}/{f.token_code}
                  </p>
                </div>
                <Chip tone="primary">FIO</Chip>
              </div>
            ))}
          </Panel>
        ) : null}

        <Panel label="Milestones" bodyClassName="p-0" delay={0.05}>
          {milestones.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted-foreground">
              Nothing shipped in public yet.
            </p>
          ) : (
            milestones.map((m) => (
              <div key={m.id} className="border-b border-border/40 px-5 py-3.5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-foreground/6 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    {m.kind}
                  </span>
                  <span className="num ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Flame className="h-3 w-3" /> {m.cheers}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] font-semibold">{m.title}</p>
                {m.body ? (
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    {m.body}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </Panel>
      </div>
      <SiteFooter className="mt-12 px-0" />
    </main>
  );
}
