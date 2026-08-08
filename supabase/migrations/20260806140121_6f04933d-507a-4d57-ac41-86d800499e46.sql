
create or replace view public.public_feed
with (security_invoker = false) as
  select
    'act:' || a.id::text as id,
    'activity'::text as source,
    a.kind as kind,
    h.handle as handle,
    a.message as title,
    null::text as detail,
    a.value as amount,
    null::text as tx_hash,
    a.created_at as created_at
  from public.activity_events a
  left join public.handles h on h.company_id = a.company_id and h.is_public
  where a.created_at > now() - interval '30 days'
union all
  select
    'x402:' || c.id::text,
    'x402',
    c.slug,
    h.handle,
    'Machine API call paid — ' || c.slug,
    c.payer,
    c.amount_usdc,
    c.tx_hash,
    c.created_at
  from public.x402_calls c
  left join public.handles h on h.company_id = c.company_id and h.is_public
  where c.status in ('settled','dev')
    and c.created_at > now() - interval '30 days'
union all
  select
    'spin:' || w.id::text,
    'wheel',
    w.prize_kind,
    h.handle,
    'Daily drop — ' || w.label,
    w.chain_status,
    w.amount::numeric,
    w.tx_hash,
    w.created_at
  from public.wheel_spins w
  left join public.handles h on h.company_id = w.company_id and h.is_public
  where w.created_at > now() - interval '30 days'
union all
  select
    'ms:' || m.id::text,
    'milestone',
    m.kind,
    h.handle,
    m.title,
    m.metric,
    m.cheers::numeric,
    null::text,
    m.created_at
  from public.milestones m
  left join public.handles h on h.company_id = m.company_id and h.is_public
  where m.created_at > now() - interval '30 days';

grant select on public.public_feed to anon, authenticated;

create or replace view public.public_company_agents
with (security_invoker = false) as
  select
    ag.id,
    ag.company_id,
    h.handle,
    ag.name,
    ag.role,
    ag.avatar,
    ag.accent,
    ag.status,
    ag.performance,
    ag.revenue_generated,
    ag.created_at
  from public.agents ag
  join public.handles h on h.company_id = ag.company_id and h.is_public;

grant select on public.public_company_agents to anon, authenticated;

create or replace view public.public_company_stats
with (security_invoker = false) as
  select
    h.company_id,
    h.handle,
    coalesce((select count(*) from public.x402_calls c
              where c.company_id = h.company_id and c.status in ('settled','dev')), 0) as x402_calls,
    coalesce((select sum(c.amount_usdc) from public.x402_calls c
              where c.company_id = h.company_id and c.status in ('settled','dev')), 0) as x402_revenue,
    coalesce((select sum(ag.revenue_generated) from public.agents ag
              where ag.company_id = h.company_id), 0) as agent_revenue,
    coalesce((select count(*) from public.agents ag where ag.company_id = h.company_id), 0) as agent_count,
    coalesce((select count(*) from public.wallet_bindings wb
              where wb.handle_id = h.id and wb.verified), 0) as wallets_bound
  from public.handles h
  where h.is_public and h.company_id is not null;

grant select on public.public_company_stats to anon, authenticated;

create or replace view public.public_network_totals
with (security_invoker = false) as
  select
    coalesce((select sum(amount_usdc) from public.x402_calls where status in ('settled','dev')), 0) as usdc_paid,
    coalesce((select count(*) from public.x402_calls where status in ('settled','dev')), 0) as paid_calls,
    coalesce((select count(*) from public.agents), 0) as agents,
    coalesce((select count(*) from public.companies), 0) as companies,
    coalesce((select count(*) from public.activity_events where created_at > now() - interval '24 hours'), 0) as actions_24h;

grant select on public.public_network_totals to anon, authenticated;
