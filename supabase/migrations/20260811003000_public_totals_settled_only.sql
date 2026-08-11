-- Honest public totals: only facilitator-settled USDC counts as paid.
drop view if exists public.public_network_totals;

create view public.public_network_totals
with (security_invoker = false) as
  select
    coalesce((select sum(amount_usdc) from public.x402_calls where status = 'settled'), 0) as usdc_paid,
    coalesce((select count(*) from public.x402_calls where status = 'settled'), 0) as paid_calls,
    coalesce((select count(*) from public.agents), 0) as agents,
    coalesce((select count(*) from public.companies), 0) as companies,
    coalesce((select count(*) from public.activity_events where created_at > now() - interval '24 hours'), 0) as actions_24h,
    coalesce((select count(*) from public.tasks), 0) as tasks;

grant select on public.public_network_totals to anon, authenticated;
